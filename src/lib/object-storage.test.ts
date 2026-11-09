import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createObjectStorage, ObjectStorageConfigurationError } from "./object-storage";

describe("object storage configuration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("reports missing R2 configuration", () => {
    for (const key of ["R2_ACCOUNT_ID", "R2_ENDPOINT", "R2_BUCKET_NAME", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"]) {
      vi.stubEnv(key, "");
    }
    expect(() => createObjectStorage()).toThrow(ObjectStorageConfigurationError);
  });

  it("reports an invalid endpoint as a configuration error", () => {
    vi.stubEnv("R2_ENDPOINT", "not-a-url");
    vi.stubEnv("R2_BUCKET_NAME", "bucket");
    vi.stubEnv("R2_ACCESS_KEY_ID", "access");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");
    expect(() => createObjectStorage()).toThrow(ObjectStorageConfigurationError);
  });
});
