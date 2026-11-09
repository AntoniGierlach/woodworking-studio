import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  transaction: vi.fn(),
  send: vi.fn(),
  write: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/contact", async () => await import("../../../lib/contact"));
vi.mock("@/lib/db", () => ({ query: mocks.query, withTransaction: mocks.transaction }));
vi.mock("@/lib/request-security", () => ({ isSameOrigin: () => true }));
vi.mock("@/lib/contact-attachment-storage", () => ({
  newContactAttachmentKey: () => "local-contact/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  writeContactAttachment: mocks.write,
  deleteContactAttachment: mocks.remove,
}));
vi.mock("resend", () => ({
  Resend: class { emails = { send: mocks.send }; },
}));

import { POST } from "./route";

function request(withFile = false) {
  const form = new FormData();
  form.set("name", "Anna");
  form.set("email", "anna@example.com");
  form.set("message", "Proszę o wycenę stołu.");
  if (withFile) {
    form.append("files", new File(["%PDF-1.4 test"], "projekt.pdf", { type: "application/pdf" }));
  }
  return new NextRequest("http://localhost/api/contact", { method: "POST", body: form });
}

function largeAttachmentRequest() {
  const form = new FormData();
  form.set("name", "Anna");
  form.set("email", "anna@example.com");
  form.set("message", "Proszę o wycenę stołu.");
  for (let index = 0; index < 3; index++) {
    form.append("files", new File(["%PDF-", new Uint8Array(7 * 1024 * 1024)], `projekt${index}.pdf`, { type: "application/pdf" }));
  }
  return new NextRequest("http://localhost/api/contact", { method: "POST", body: form });
}

describe("formularz kontaktowy", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("DATABASE_URL", "postgres://example");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "Warsztat <kontakt@example.com>");
    vi.stubEnv("CONTACT_RATE_LIMIT_MAX", "1000");
    mocks.transaction.mockImplementation(async (callback) => callback({ query: vi.fn().mockResolvedValue({ rows: [] }) }));
    mocks.query.mockImplementation(async (sql: string) => sql.includes("SELECT email") ? { rows: [{ email: "wlasciciel@example.com" }] } : { rows: [] });
    mocks.send.mockResolvedValue({ error: null });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it("zapisuje wiadomość i załącznik oraz wysyła je na adres z ustawień", async () => {
    const response = await POST(request(true));
    expect(response.status).toBe(201);
    expect(mocks.write).toHaveBeenCalledOnce();
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      to: "wlasciciel@example.com",
      replyTo: "anna@example.com",
      attachments: [expect.objectContaining({ filename: "projekt.pdf", contentType: "application/pdf" })],
    }));
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("email_notification_status"), expect.arrayContaining(["sent", null]));
  });

  it("przyjmuje natywne wysłanie bez wybranego załącznika", async () => {
    const form = new FormData();
    form.set("name", "Anna");
    form.set("email", "anna@example.com");
    form.set("message", "Proszę o wycenę stołu.");
    form.append("files", new File([], "", { type: "application/octet-stream" }));
    const response = await POST(new NextRequest("http://localhost/api/contact", { method: "POST", body: form }));
    expect(response.status).toBe(201);
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ attachments: [] }));
  });

  it("zachowuje wiadomość i informuje o braku konfiguracji poczty", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect((await response.json()).message).toContain("nie zostało dostarczone");
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("email_notification_status"), expect.arrayContaining(["failed"]));
  });

  it("oznacza błąd dostawcy po zapisaniu wiadomości", async () => {
    mocks.send.mockResolvedValue({ error: { message: "provider unavailable" } });
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect((await response.json()).message).toContain("nie zostało dostarczone");
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("email_notification_status"), expect.arrayContaining(["failed", expect.stringContaining("provider unavailable")]));
  });

  it("wysyła powiadomienie bez dużych plików, pozostawiając je w panelu", async () => {
    const response = await POST(largeAttachmentRequest());
    expect(response.status).toBe(201);
    expect(mocks.write).toHaveBeenCalledTimes(3);
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      attachments: [],
      text: expect.stringContaining("zbyt duże, by dołączyć je do wiadomości e-mail"),
    }));
  });

  it("oznacza brak adresu odbiorcy jako błąd bez utraty wiadomości", async () => {
    mocks.query.mockImplementation(async (sql: string) => sql.includes("SELECT email") ? { rows: [] } : { rows: [] });
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("email_notification_status"), expect.arrayContaining(["failed"]));
  });

  it("usuwa zapisany plik, gdy transakcja się nie powiedzie", async () => {
    mocks.transaction.mockRejectedValue(new Error("database error"));
    const response = await POST(request(true));
    expect(response.status).toBe(503);
    expect(mocks.remove).toHaveBeenCalledWith("local-contact/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
