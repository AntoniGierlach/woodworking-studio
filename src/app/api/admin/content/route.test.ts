import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  isSameOrigin: vi.fn(),
  query: vi.fn(),
}));
vi.mock("@/lib/admin-session", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/request-security", () => ({ isSameOrigin: mocks.isSameOrigin }));
vi.mock("@/lib/db", () => ({ query: mocks.query, withTransaction: vi.fn() }));
vi.mock("@/lib/contact-attachment-storage", () => ({ deleteContactAttachment: vi.fn() }));

import { PATCH, POST } from "./route";

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
function write(method: string, payload: unknown) {
  return new NextRequest("http://localhost/api/admin/content", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("cena usługi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
    mocks.isSameOrigin.mockReturnValue(true);
    mocks.query.mockResolvedValue({ rows: [{ id }], rowCount: 1 });
  });

  it("zapisuje cenę jako dowolny tekst, w tym estymowany przedział", async () => {
    const response = await POST(write("POST", {
      type: "services",
      data: { title: "Stół", slug: "stol", price: "~300-500 zł" },
    }));

    expect(response.status).toBe(201);
    expect(mocks.query.mock.calls[0][0]).toContain("price");
    expect(mocks.query.mock.calls[0][1]).toContain("~300-500 zł");
  });

  it("pozwala usunąć zapisaną cenę przez wyczyszczenie pola", async () => {
    const response = await PATCH(write("PATCH", {
      type: "services",
      id,
      data: { price: "" },
    }));

    expect(response.status).toBe(200);
    expect(mocks.query.mock.calls[0][1]).toEqual([null, id]);
  });

  it("odrzuca cenę dłuższą niż 120 znaków", async () => {
    const response = await POST(write("POST", {
      type: "services",
      data: { title: "Stół", slug: "stol", price: "x".repeat(121) },
    }));

    expect(response.status).toBe(422);
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
