import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { deletePublicMedia, newPublicMediaKey, readPublicMedia, writePublicMedia } from "./public-media-storage";

describe("public media storage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("stores, reads and deletes a local image even after switching to R2", async () => {
    const directory = await mkdtemp(join(tmpdir(), "woodworking-media-test-"));
    try {
      vi.spyOn(process, "cwd").mockReturnValue(directory);
      vi.stubEnv("PUBLIC_MEDIA_STORAGE", "local");
      const key = newPublicMediaKey("png");
      const bytes = Buffer.from("test image");
      await writePublicMedia(key, bytes, "image/png");
      vi.stubEnv("PUBLIC_MEDIA_STORAGE", "r2");
      expect(Buffer.from(await readPublicMedia(key))).toEqual(bytes);
      await deletePublicMedia(key);
      await expect(readPublicMedia(key)).rejects.toThrow();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects path traversal and unknown backends", async () => {
    await expect(readPublicMedia("local-media/../../secret")).rejects.toThrow("Invalid local media key");
    vi.stubEnv("PUBLIC_MEDIA_STORAGE", "unknown");
    expect(() => newPublicMediaKey("png")).toThrow("PUBLIC_MEDIA_STORAGE");
  });
});
