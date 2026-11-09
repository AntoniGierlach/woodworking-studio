import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin-session", () => ({ requireAdmin: async () => true }));
vi.mock("@/lib/request-security", () => ({ isSameOrigin: () => true }));
vi.mock("@/lib/db", () => ({ query: mocks.query }));
vi.mock("@/lib/object-storage", () => import("../../../../lib/object-storage"));
vi.mock("@/lib/public-media-storage", () => import("../../../../lib/public-media-storage"));

import { POST } from "./route";
import { GET } from "../../media/[id]/route";

describe("local image upload and public retrieval", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    mocks.query.mockReset();
  });

  it("writes the image to disk and serves the same bytes via its public ID", async () => {
    const directory = await mkdtemp(join(tmpdir(), "woodworking-upload-test-"));
    try {
      vi.spyOn(process, "cwd").mockReturnValue(directory);
      vi.stubEnv("PUBLIC_MEDIA_STORAGE", "local");
      const id = "550e8400-e29b-41d4-a716-446655440000";
      const bytes = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z0d8AAAAASUVORK5CYII=",
        "base64",
      );
      let key = "";
      mocks.query.mockImplementation(async (sql: string, values: unknown[]) => {
        if (sql.includes("INSERT INTO app_media")) {
          key = String(values[0]);
          return { rows: [{ id }] };
        }
        return { rows: [{ storage_key: key, mime_type: "image/png" }] };
      });

      const form = new FormData();
      form.set("file", new File([bytes], "photo.png", { type: "image/png" }));
      const uploaded = await POST(new NextRequest("http://localhost/api/admin/media", { method: "POST", body: form }));
      expect(uploaded.status).toBe(201);
      expect(await uploaded.json()).toEqual({ data: { id } });
      expect(key).toMatch(/^local-media\//);

      const image = await GET(new Request(`http://localhost/api/media/${id}`), {
        params: Promise.resolve({ id }),
      });
      expect(image.status).toBe(200);
      expect(image.headers.get("content-type")).toBe("image/png");
      expect(Buffer.from(await image.arrayBuffer())).toEqual(bytes);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
