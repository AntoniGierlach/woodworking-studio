import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  query: vi.fn(),
  writePublicMedia: vi.fn(),
  deletePublicMedia: vi.fn(),
}));

vi.mock("@/lib/admin-session", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/db", () => ({ query: mocks.query }));
vi.mock("@/lib/request-security", () => ({ isSameOrigin: () => true }));
vi.mock("@/lib/object-storage", () => ({
  ObjectStorageConfigurationError: class ObjectStorageConfigurationError extends Error {},
}));
vi.mock("@/lib/public-media-storage", () => ({
  newPublicMediaKey: () => "local-media/image.png",
  writePublicMedia: mocks.writePublicMedia,
  deletePublicMedia: mocks.deletePublicMedia,
}));

import { ObjectStorageConfigurationError } from "@/lib/object-storage";
import { POST } from "./route";

function imageRequest() {
  const form = new FormData();
  form.set("file", new File([new Uint8Array([
    137, 80, 78, 71, 13, 10, 26, 10,
    0, 0, 0, 13, 73, 72, 68, 82,
    0, 0, 0, 1, 0, 0, 0, 1,
  ])], "photo.png", { type: "image/png" }));
  return new NextRequest("http://localhost/api/admin/media", { method: "POST", body: form });
}

describe("admin image upload", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("explains when image storage is not configured", async () => {
    mocks.writePublicMedia.mockImplementation(() => {
      throw new ObjectStorageConfigurationError("Object storage is not configured.");
    });
    const response = await POST(imageRequest());
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("R2 nie jest skonfigurowane");
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("returns the saved image id after uploading to storage", async () => {
    mocks.writePublicMedia.mockResolvedValue(undefined);
    mocks.query.mockResolvedValue({ rows: [{ id: "image-id" }] });
    const response = await POST(imageRequest());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: { id: "image-id" } });
    expect(mocks.writePublicMedia).toHaveBeenCalledOnce();
    expect(mocks.query).toHaveBeenCalledOnce();
  });

  it("removes the uploaded image when saving metadata fails", async () => {
    mocks.writePublicMedia.mockResolvedValue(undefined);
    mocks.query.mockRejectedValue(new Error("database failed"));
    const response = await POST(imageRequest());
    expect(response.status).toBe(503);
    expect(mocks.deletePublicMedia).toHaveBeenCalledWith("local-media/image.png");
  });
});
