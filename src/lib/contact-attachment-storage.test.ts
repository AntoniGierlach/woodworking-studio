import { mkdtemp, mkdir, rmdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { deleteContactAttachment, newContactAttachmentKey, readContactAttachment, writeContactAttachment } from "./contact-attachment-storage";

let root: string;
let key: string | undefined;

describe("prywatny lokalny magazyn załączników", () => {
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "contact-storage-test-"));
    await mkdir(join(root, "storage"));
    vi.spyOn(process, "cwd").mockReturnValue(root);
    vi.stubEnv("PUBLIC_MEDIA_STORAGE", "local");
    vi.stubEnv("CONTACT_ATTACHMENT_STORAGE", "");
    key = undefined;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    if (key) await unlink(join(root, "storage", "private-contact", key.split("/")[1]));
    await rmdir(join(root, "storage", "private-contact")).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
    await rmdir(join(root, "storage"));
    await rmdir(root);
  });

  it("zapisuje i odczytuje prywatny plik oraz usuwa go", async () => {
    key = newContactAttachmentKey();
    expect(key).toMatch(/^local-contact\//);
    await writeContactAttachment(key, Buffer.from("plik"), "application/pdf");
    expect(Buffer.from(await readContactAttachment(key)).toString()).toBe("plik");
    await deleteContactAttachment(key);
    await expect(readContactAttachment(key)).rejects.toThrow();
    await expect(deleteContactAttachment(key)).resolves.toBeUndefined();
    key = undefined;
  });

  it("odrzuca nieprawidłową ścieżkę i konfigurację", async () => {
    await expect(readContactAttachment("local-contact/../../file")).rejects.toThrow("Invalid private attachment key.");
    vi.stubEnv("CONTACT_ATTACHMENT_STORAGE", "invalid");
    expect(() => newContactAttachmentKey()).toThrow("CONTACT_ATTACHMENT_STORAGE");
  });
});
