import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import MessageCard from "./message-card";

describe("karta wiadomości", () => {
  it("pokazuje dane nadawcy, treść, status i załączniki", () => {
    const html = renderToStaticMarkup(createElement(MessageCard, {
      item: {
        name: "Jan Kowalski",
        email: "jan@example.com",
        phone: "+48 123 456 789",
        subject: "Zabudowa",
        message: "Pierwsza linia\nDruga linia",
        date_created: "2026-11-09T12:30:00Z",
        status: "in_progress",
        email_notification_status: "failed",
        attachments: [{ id: "abc", filename: "projekt.pdf", size_bytes: 1048576 }],
      },
      onStatusChange: vi.fn(),
      onDelete: vi.fn(),
      pending: false,
    }));
    expect(html).toContain("Jan Kowalski");
    expect(html).toContain("9 listopada 2026");
    expect(html).toContain('href="mailto:jan%40example.com"');
    expect(html).toContain('href="tel:+48123456789"');
    expect(html).toContain("Zabudowa");
    expect(html).toContain("Pierwsza linia\nDruga linia");
    expect(html).toContain('value="in_progress" selected=""');
    expect(html).toContain("/api/admin/attachments/abc?view=1");
    expect(html).toContain("1.00 MB");
    expect(html).toContain("nie wysłano");
    expect(html).toContain("message-status-in_progress");
    expect(html).toContain("Usuń wiadomość od Jan Kowalski");
  });

  it("obsługuje brak opcjonalnych danych i wysłane powiadomienie", () => {
    const html = renderToStaticMarkup(createElement(MessageCard, {
      item: { name: "Anna", message: "Treść", status: "new", email_notification_status: "sent", date_created: "invalid" },
      onStatusChange: vi.fn(),
      onDelete: vi.fn(),
      pending: false,
    }));
    expect(html).toContain("Treść");
    expect(html).toContain("wysłane");
    expect(html).not.toContain("<time");
    expect(html).not.toContain("ZAŁĄCZNIKI");
    expect(html).toContain("message-status-new");
  });

  it("oznacza wiadomość zakończoną i blokuje działania podczas usuwania", () => {
    const html = renderToStaticMarkup(createElement(MessageCard, {
      item: { name: "Anna", status: "done" },
      onStatusChange: vi.fn(),
      onDelete: vi.fn(),
      pending: true,
    }));
    expect(html).toContain("message-status-done");
    expect(html).toMatch(/<select[^>]*disabled/);
    expect(html).toMatch(/<button[^>]*disabled/);
  });
});
