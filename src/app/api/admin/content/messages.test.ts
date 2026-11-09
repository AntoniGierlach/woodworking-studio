import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  isSameOrigin: vi.fn(),
  transaction: vi.fn(),
  query: vi.fn(),
  deleteAttachment: vi.fn(),
  clientQuery: vi.fn(),
}));
vi.mock("@/lib/admin-session", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/request-security", () => ({ isSameOrigin: mocks.isSameOrigin }));
vi.mock("@/lib/db", () => ({ query: mocks.query, withTransaction: mocks.transaction }));
vi.mock("@/lib/contact-attachment-storage", () => ({ deleteContactAttachment: mocks.deleteAttachment }));

import { DELETE, GET, PATCH } from "./route";

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
function request(messageId = id) {
  return new NextRequest(`http://localhost/api/admin/content?type=messages&id=${messageId}`, { method: "DELETE" });
}

describe("usuwanie wiadomości", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
    mocks.isSameOrigin.mockReturnValue(true);
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FOR UPDATE")) return { rowCount: 1, rows: [{ id }] };
      if (sql.includes("app_message_attachments")) return { rows: [{ storage_key: "local-contact/file" }, { storage_key: "contact-uploads/file" }] };
      return { rowCount: 1, rows: [] };
    });
    mocks.transaction.mockImplementation(async (callback) => callback({ query: mocks.clientQuery }));
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("usuwa załączniki przed usunięciem wiadomości", async () => {
    const response = await DELETE(request());
    expect(response.status).toBe(200);
    expect(mocks.deleteAttachment).toHaveBeenCalledTimes(2);
    expect(mocks.clientQuery).toHaveBeenLastCalledWith("DELETE FROM app_messages WHERE id = $1", [id]);
    expect(mocks.deleteAttachment.mock.invocationCallOrder[1]).toBeLessThan(mocks.clientQuery.mock.invocationCallOrder[2]);
  });

  it("zatrzymuje usuwanie wiadomości w razie błędu magazynu", async () => {
    mocks.deleteAttachment.mockRejectedValueOnce(new Error("storage unavailable"));
    const response = await DELETE(request());
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("Spróbuj ponownie");
    expect(mocks.clientQuery.mock.calls.some(([sql]) => sql.startsWith("DELETE"))).toBe(false);
  });

  it("odrzuca nieautoryzowane, obce i nieprawidłowe żądania", async () => {
    mocks.requireAdmin.mockResolvedValueOnce(false);
    expect((await DELETE(request())).status).toBe(401);
    mocks.isSameOrigin.mockReturnValueOnce(false);
    expect((await DELETE(request())).status).toBe(403);
    expect((await DELETE(request("invalid"))).status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("zwraca 404 dla nieistniejącej wiadomości", async () => {
    mocks.clientQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    expect((await DELETE(request())).status).toBe(404);
    expect(mocks.deleteAttachment).not.toHaveBeenCalled();
  });

  it("odczytuje i zapisuje stan przeczytania niezależnie od statusu", async () => {
    mocks.query.mockResolvedValue({ rowCount: 1, rows: [{ id, is_read: false }] });
    expect((await GET(new NextRequest("http://localhost/api/admin/content?type=messages"))).status).toBe(200);
    expect(mocks.query.mock.calls[0][0]).toContain("m.is_read");
    const response = await PATCH(new NextRequest("http://localhost/api/admin/content", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "messages", id, data: { is_read: true } }),
    }));
    expect(response.status).toBe(200);
    expect(mocks.query).toHaveBeenLastCalledWith(
      "UPDATE app_messages SET is_read = $1 WHERE id = $2 RETURNING id",
      [true, id],
    );
  });

  it("nie pozwala zapisywać nieznanych pól wiadomości", async () => {
    const response = await PATCH(new NextRequest("http://localhost/api/admin/content", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "messages", id, data: { is_read: true, name: "test" } }),
    }));
    expect(response.status).toBe(422);
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
