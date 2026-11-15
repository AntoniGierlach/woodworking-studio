import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getPlatformProxy } from "wrangler";

const state = vi.hoisted(() => ({
  db: undefined as unknown,
  deleteAttachment: vi.fn(),
  writeAttachment: vi.fn(),
  send: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: { DB: state.db } }),
}));
vi.mock("@/lib/admin-session", () => ({
  requireAdmin: async () => true,
  ADMIN_SESSION_COOKIE: "woodworking_admin_session",
  ADMIN_SESSION_MAX_AGE_SECONDS: 28800,
}));
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminCredentials: async () => false,
  createAdminSession: async () => "unused",
}));
vi.mock("@/lib/request-security", () => ({ isSameOrigin: () => true }));
vi.mock("@/lib/contact-attachment-storage", () => ({
  newContactAttachmentKey: () => `contact-uploads/${crypto.randomUUID()}`,
  writeContactAttachment: state.writeAttachment,
  deleteContactAttachment: state.deleteAttachment,
}));
vi.mock("resend", () => ({
  Resend: class { emails = { send: state.send }; },
}));

import { query } from "./db";
import { getContentCollection } from "./content-data";
import { GET, PATCH, POST } from "../app/api/admin/content/route";
import { PATCH as reorder } from "../app/api/admin/content/order/route";
import { POST as contact } from "../app/api/contact/route";
import { POST as login } from "../app/api/admin/login/route";
import { contactRetryAfter } from "./contact-rate-limit";

type TestEnv = CloudflareEnv & {
  DB: CloudflareEnv["DB"] & { exec(sql: string): Promise<unknown> };
};
let proxy: Awaited<ReturnType<typeof getPlatformProxy<TestEnv>>>;
const testConfig = join(tmpdir(), `woodworking-d1-${crypto.randomUUID()}.json`);

function request(method: string, data: unknown): NextRequest {
  return new NextRequest("https://example.com/api/admin/content", {
    method, headers: { "content-type": "application/json" }, body: JSON.stringify(data),
  });
}

describe("Cloudflare D1 integration", () => {
  beforeAll(async () => {
    await writeFile(testConfig, JSON.stringify({
      name: "woodworking-d1-test",
      compatibility_date: "2026-01-01",
      d1_databases: [{ binding: "DB", database_name: "test", database_id: "00000000-0000-0000-0000-000000000000" }],
    }));
    proxy = await getPlatformProxy<TestEnv>({ persist: false, configPath: testConfig });
    state.db = proxy.env.DB;
    const schema = await readFile("d1-migrations/0001_initial.sql", "utf8");
    for (const statement of schema.split(";").map((part) => part.trim()).filter(Boolean)) {
      await proxy.env.DB.exec(statement.replace(/\s+/g, " "));
    }
  }, 30_000);
  afterAll(async () => {
    await proxy?.dispose();
    await unlink(testConfig);
    vi.unstubAllEnvs();
  });
  beforeEach(() => {
    state.send.mockResolvedValue({ error: null });
    vi.stubEnv("ADMIN_SESSION_SECRET", "x".repeat(40));
    vi.stubEnv("RESEND_API_KEY", "local-test-key");
    vi.stubEnv("EMAIL_FROM", "test@example.com");
  });

  it("creates and reorders projects and persists gallery changes atomically", async () => {
    const mediaId = crypto.randomUUID();
    await query(
      "INSERT INTO app_media (id, storage_key, original_filename, mime_type, size_bytes, visibility) VALUES ($1,$2,$3,$4,$5,'public')",
      [mediaId, "public-media/a.png", "a.png", "image/png", 1],
    );
    const first = await POST(request("POST", {
      type: "projects", data: { title: "First", slug: "first", sort: 0, status: "published", gallery_media_ids: [mediaId] },
    }));
    expect(first.status).toBe(201);
    const firstId = (await first.json()).data.id as string;
    const second = await POST(request("POST", {
      type: "projects", data: { title: "Second", slug: "second", sort: 1, status: "published" },
    }));
    expect(second.status).toBe(201);
    const secondId = (await second.json()).data.id as string;
    const ordered = await reorder(request("PATCH", { type: "projects", id: secondId, targetId: firstId }));
    expect(ordered.status).toBe(200);
    const listing = await GET(new NextRequest("https://example.com/api/admin/content?type=projects"));
    const projects = (await listing.json()).data;
    expect(projects.map((item: { id: string }) => item.id)).toEqual([secondId, firstId]);
    expect(projects[1].gallery_media_ids).toEqual([mediaId]);
    const publicProjects = await getContentCollection<{ id: string; project_images: Array<{ file: string }> }>("projects");
    expect(publicProjects.find((item) => item.id === firstId)?.project_images[0].file).toBe(mediaId);

    const missingId = crypto.randomUUID();
    expect((await reorder(request("PATCH", { type: "projects", id: missingId, targetId: firstId }))).status).toBe(404);
    expect((await PATCH(request("PATCH", {
      type: "projects", id: missingId, data: { gallery_media_ids: [mediaId] },
    }))).status).toBe(404);
    expect((await POST(request("POST", {
      type: "projects", data: { title: "Duplicate", slug: "first" },
    }))).status).toBe(409);

    const invalid = await PATCH(request("PATCH", {
      type: "projects", id: firstId, data: { title: "Changed", gallery_media_ids: [crypto.randomUUID()] },
    }));
    expect(invalid.status).toBe(422);
    const unchanged = await query<{ title: string }>("SELECT title FROM app_projects WHERE id = $1", [firstId]);
    expect(unchanged.rows[0].title).toBe("First");
  }, 30_000);

  it("saves a contact message and private attachment and lists a boolean read state", async () => {
    await query("INSERT INTO app_site_settings (id, email) VALUES (1, $1)", ["owner@example.com"]);
    const form = new FormData();
    form.set("name", "Anna");
    form.set("email", "anna@example.com");
    form.set("message", "Proszę o wycenę.");
    form.append("files", new File(["%PDF-1.4 test"], "projekt.pdf", { type: "application/pdf" }));
    const response = await contact(new NextRequest("https://example.com/api/contact", { method: "POST", body: form }));
    expect(response.status).toBe(201);
    const messages = (await (await GET(new NextRequest("https://example.com/api/admin/content?type=messages"))).json()).data;
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ name: "Anna", is_read: false, attachments: [{ filename: "projekt.pdf" }] });
    expect(state.writeAttachment).toHaveBeenCalledOnce();
    expect(state.send).toHaveBeenCalledOnce();
  }, 30_000);

  it("enforces contact rate limits per trusted client", async () => {
    vi.stubEnv("CONTACT_TRUST_CLOUDFLARE_IP", "true");
    const client = new NextRequest("https://example.com/api/contact", {
      headers: { "cf-connecting-ip": "192.0.2.1" },
    });
    expect(await contactRetryAfter(client, 2, 60_000)).toBeNull();
    expect(await contactRetryAfter(client, 2, 60_000)).toBeNull();
    expect(await contactRetryAfter(client, 2, 60_000)).toBeGreaterThan(0);
  });

  it("locks admin login after ten failed attempts", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
    vi.stubEnv("ADMIN_PASSWORD_HASH", "test-hash");
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    for (let attempt = 1; attempt <= 10; attempt++) {
      if (attempt === 10) clock.mockReturnValue(now + 14 * 60_000);
      const response = await login(new NextRequest("https://example.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "192.0.2.2" },
        body: JSON.stringify({ email: "admin@example.com", password: "wrong" }),
      }));
      expect(response.status).toBe(attempt === 10 ? 429 : 401);
    }
    clock.mockReturnValue(now + 16 * 60_000);
    const stillLocked = await login(new NextRequest("https://example.com/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "192.0.2.2" },
      body: JSON.stringify({ email: "admin@example.com", password: "wrong" }),
    }));
    expect(stillLocked.status).toBe(429);
    clock.mockRestore();
  });
});
