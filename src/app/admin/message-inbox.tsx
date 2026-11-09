import MessageCard from "./message-card";

type MessageItem = Record<string, unknown> & { id?: string | number };

export default function MessageInbox({
  items, selectedId, pending, onOpen, onDelete, onStatusChange,
}: {
  items: MessageItem[];
  selectedId: string | number | null;
  pending: boolean;
  onOpen: (item: MessageItem) => void;
  onDelete: (item: MessageItem) => void;
  onStatusChange: (item: MessageItem, status: string) => void;
}) {
  const selected = items.find((item) => item.id === selectedId);
  return (
    <div className="admin-inbox">
      <aside aria-label="Lista wiadomości" className="admin-inbox-list">
        <div className="admin-inbox-list-heading">
          <h2>Wiadomości</h2>
          <span>{items.length}</span>
        </div>
        {items.length === 0 && <p className="admin-inbox-empty">Brak wiadomości.</p>}
        {items.map((item) => {
          const unread = item.is_read === false;
          const status = item.status === "in_progress" || item.status === "done" ? item.status : "new";
          return (
            <button
              aria-current={item.id === selectedId ? "true" : undefined}
              className={`admin-inbox-item message-status-${status}${unread ? " is-unread" : ""}`}
              key={String(item.id)}
              onClick={() => onOpen(item)}
              type="button"
            >
              <span className="admin-inbox-item-heading">
                <strong>{String(item.name ?? "Bez nazwy")}</strong>
                {unread && <span className="admin-inbox-unread">Nieodczytana</span>}
              </span>
              <span className="admin-inbox-email">{String(item.email ?? "")}</span>
              <span className="admin-inbox-preview">{String(item.message ?? "")}</span>
            </button>
          );
        })}
      </aside>
      <div className="admin-inbox-detail">
        {selected ? (
          <MessageCard
            item={selected}
            onStatusChange={(status) => onStatusChange(selected, status)}
            onDelete={() => onDelete(selected)}
            pending={pending}
          />
        ) : (
          <p className="admin-inbox-placeholder">Wybierz wiadomość z listy, aby zobaczyć jej treść.</p>
        )}
      </div>
    </div>
  );
}
