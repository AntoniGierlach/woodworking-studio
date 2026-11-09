import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import MessageInbox from "./message-inbox";

const items = [
  { id: "1", name: "Anna", email: "anna@example.com", message: "Pierwsza treść", is_read: false, status: "new" },
  { id: "2", name: "Jan", email: "jan@example.com", message: "Druga treść", is_read: true, status: "done" },
];
const handlers = { pending: false, onOpen: vi.fn(), onDelete: vi.fn(), onStatusChange: vi.fn() };

describe("skrzynka wiadomości", () => {
  it("wyróżnia nieodczytane i pokazuje pełną wybraną wiadomość", () => {
    const html = renderToStaticMarkup(createElement(MessageInbox, { items, selectedId: "2", ...handlers }));
    expect(html).toContain('class="admin-inbox-item message-status-new is-unread"');
    expect(html).toContain('class="admin-inbox-item message-status-done"');
    expect(html).toContain("Nieodczytana");
    expect(html).toContain('aria-current="true"');
    expect(html).toContain('class="admin-message-card message-status-done"');
    expect(html).toContain("Usuń wiadomość od Jan");
    expect(html).not.toContain("Usuń wiadomość od Anna");
  });

  it("pokazuje wskazówkę przed wyborem i informację o pustej skrzynce", () => {
    const html = renderToStaticMarkup(createElement(MessageInbox, { items: [], selectedId: null, ...handlers }));
    expect(html).toContain("Brak wiadomości.");
    expect(html).toContain("Wybierz wiadomość z listy");
  });
});
