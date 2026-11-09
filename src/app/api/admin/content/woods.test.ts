import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), isSameOrigin: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/admin-session", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/request-security", () => ({ isSameOrigin: mocks.isSameOrigin }));
vi.mock("@/lib/db", () => ({ query: mocks.query, withTransaction: vi.fn() }));
vi.mock("@/lib/contact-attachment-storage", () => ({ deleteContactAttachment: vi.fn() }));

import { DELETE, GET, PATCH, POST } from "./route";

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const data = { title: "Dąb", tone: "Jasny", grain: "Wyraźne", character: "Naturalny", status: "published", image_id: null };
function write(method: string, payload: unknown) {
  return new NextRequest("http://localhost/api/admin/content", {
    method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
  });
}

describe("zarządzanie gatunkami drewna", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
    mocks.isSameOrigin.mockReturnValue(true);
    mocks.query.mockResolvedValue({ rows: [{ id }], rowCount: 1 });
  });

  it("pobiera, tworzy, edytuje i usuwa gatunki", async () => {
    expect((await GET(new NextRequest("http://localhost/api/admin/content?type=woods"))).status).toBe(200);
    expect(mocks.query.mock.calls[0][0]).toContain("app_wood_types");
    expect((await POST(write("POST", { type: "woods", data }))).status).toBe(201);
    expect(mocks.query.mock.calls[1][1]).toEqual(["Dąb", "Jasny", "Wyraźne", "Naturalny", null, "published"]);
    expect((await PATCH(write("PATCH", { type: "woods", id, data: { tone: "Ciemny" } }))).status).toBe(200);
    expect((await DELETE(new NextRequest(`http://localhost/api/admin/content?type=woods&id=${id}`, { method: "DELETE" }))).status).toBe(200);
  });

  it("odrzuca niekompletne dane i nieautoryzowane żądanie", async () => {
    expect((await POST(write("POST", { type: "woods", data: { title: "Dąb" } }))).status).toBe(422);
    mocks.requireAdmin.mockResolvedValue(false);
    expect((await POST(write("POST", { type: "woods", data }))).status).toBe(401);
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
