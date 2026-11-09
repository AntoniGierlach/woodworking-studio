import { FileText, Mail, Phone, Trash2 } from "lucide-react";

type MessageItem = Record<string, unknown> & { id?: string | number };

function messageDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Warsaw",
  }).format(date);
}

function isAttachment(value: unknown): value is { id: string; filename: string; size_bytes?: number } {
  if (!value || typeof value !== "object") return false;
  return "id" in value && typeof value.id === "string" &&
    "filename" in value && typeof value.filename === "string";
}

export default function MessageCard({
  item,
  onStatusChange,
  onDelete,
  pending,
}: {
  item: MessageItem;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
  pending: boolean;
}) {
  const name = String(item.name ?? "Bez nazwy");
  const email = String(item.email ?? "");
  const phone = typeof item.phone === "string" ? item.phone.trim() : "";
  const phoneLink = phone.replace(/[^\d+]/g, "");
  const subject = typeof item.subject === "string" ? item.subject.trim() : "";
  const date = messageDate(item.date_created);
  const attachments = Array.isArray(item.attachments) ? item.attachments.filter(isAttachment) : [];
  const notification = item.email_notification_status;
  const status = item.status === "in_progress" || item.status === "done" ? item.status : "new";

  return (
    <article className={`admin-message-card message-status-${status}`}>
      <div className="admin-message-heading">
        <div className="admin-message-identity">
          <p className="admin-message-label">ZAPYTANIE OD</p>
          <h2>{name}</h2>
          {date && <time dateTime={String(item.date_created)}>{date}</time>}
        </div>
        <label className="admin-message-status">
          <span>Status wiadomości</span>
          <select
            aria-label={`Status wiadomości od ${name}`}
            disabled={pending}
            onChange={(event) => onStatusChange(event.currentTarget.value)}
            value={status}
          >
            <option value="new">Nowa</option>
            <option value="in_progress">W trakcie</option>
            <option value="done">Zakończona</option>
          </select>
        </label>
      </div>
      <div className="admin-message-contact">
        {email && <a href={`mailto:${encodeURIComponent(email)}`}><Mail aria-hidden="true" size={16} />{email}</a>}
        {phone && (
          phoneLink && /\d/.test(phoneLink)
            ? <a href={`tel:${phoneLink}`}><Phone aria-hidden="true" size={16} />{phone}</a>
            : <span><Phone aria-hidden="true" size={16} />{phone}</span>
        )}
      </div>
      <div className="admin-message-body">
        {subject && <div><p className="admin-message-label">RODZAJ PROJEKTU</p><p>{subject}</p></div>}
        <div><p className="admin-message-label">WIADOMOŚĆ</p><p className="admin-message-text">{String(item.message ?? "")}</p></div>
      </div>
      {attachments.length > 0 && (
        <div className="admin-message-attachments">
          <p className="admin-message-label">ZAŁĄCZNIKI ({attachments.length})</p>
          <ul className="admin-attachments" aria-label="Załączniki wiadomości">
            {attachments.map((attachment) => (
              <li key={attachment.id}>
                <span className="admin-attachment-name">
                  <FileText aria-hidden="true" size={18} />
                  <span>{attachment.filename}{typeof attachment.size_bytes === "number" && <small>{(attachment.size_bytes / 1048576).toFixed(2)} MB</small>}</span>
                </span>
                <span className="admin-attachment-actions">
                  <a aria-label={`Podgląd pliku ${attachment.filename} (otwiera nową kartę)`} href={`/api/admin/attachments/${encodeURIComponent(attachment.id)}?view=1`} target="_blank" rel="noopener noreferrer">Podgląd</a>
                  <a aria-label={`Pobierz plik ${attachment.filename}`} href={`/api/admin/attachments/${encodeURIComponent(attachment.id)}`}>Pobierz</a>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className={`admin-notification-status${notification === "failed" ? " is-failed" : ""}`}>
        Powiadomienie e-mail:{" "}
        {notification === "sent"
          ? "wysłane"
          : notification === "failed"
            ? "nie wysłano — sprawdź adres e-mail w ustawieniach i konfigurację poczty"
            : "oczekuje"}
      </p>
      <button
        aria-label={`Usuń wiadomość od ${name}`}
        className="admin-text-button is-danger admin-message-delete"
        disabled={pending}
        onClick={onDelete}
        type="button"
      >
        <Trash2 aria-hidden="true" size={16} /> Usuń wiadomość
      </button>
    </article>
  );
}
