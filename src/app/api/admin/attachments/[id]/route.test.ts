import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), query: vi.fn(), read: vi.fn() }));
vi.mock("@/lib/admin-session", () => ({ isAdminAuthenticated: mocks.auth }));
vi.mock("@/lib/db", () => ({ query: mocks.query }));
vi.mock("@/lib/contact-attachment-storage", () => ({ readContactAttachment: mocks.read }));
import { GET } from "./route";

const context = { params: Promise.resolve({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }) };
describe("dostęp administratora do załączników", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue(true);
    mocks.query.mockResolvedValue({ rows: [{ storage_key: "local-contact/key", original_filename: "projekt.pdf", mime_type: "application/pdf" }] });
    mocks.read.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
  });

  it("odmawia dostępu bez zalogowania", async () => {
    mocks.auth.mockResolvedValue(false);
    expect((await GET(new Request("http://localhost/api/admin/attachments/id?view=1"), context)).status).toBe(401);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("umożliwia podgląd i pobieranie wyłącznie znanych typów", async () => {
    const preview = await GET(new Request("http://localhost/api/admin/attachments/id?view=1"), context);
    expect(preview.status).toBe(200);
    expect(preview.headers.get("content-disposition")).toMatch(/^inline;/);
    expect(preview.headers.get("content-security-policy")).toContain("sandbox");
    expect(preview.headers.get("cache-control")).toContain("no-store");
    const download = await GET(new Request("http://localhost/api/admin/attachments/id"), context);
    expect(download.headers.get("content-disposition")).toMatch(/^attachment;/);
    mocks.query.mockResolvedValue({ rows: [{ mime_type: "text/html" }] });
    expect((await GET(new Request("http://localhost/api/admin/attachments/id?view=1"), context)).status).toBe(415);
  });
});
