"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  Check,
  GripVertical,
  ImageOff,
  ImagePlus,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { slugify } from "@/lib/slugify";
import OfferDescription from "../offer-description";
import WoodCard from "../wood-card";
import MessageInbox from "./message-inbox";

type ContentType = "services" | "projects" | "woods" | "messages" | "settings";
type RecordItem = Record<string, unknown> & { id?: string | number };

const sections: Array<{ id: ContentType; label: string }> = [
  { id: "services", label: "Oferta" },
  { id: "projects", label: "Realizacje" },
  { id: "woods", label: "Drewno" },
  { id: "messages", label: "Wiadomości" },
  { id: "settings", label: "Ustawienia" },
];

const fields: Record<
  Exclude<ContentType, "messages">,
  Array<{
    name: string;
    label: string;
    type?: "textarea" | "number" | "url" | "email";
    required?: boolean;
  }>
> = {
  services: [
    { name: "title", label: "Nazwa usługi", required: true },
    { name: "content", label: "Opis usługi", type: "textarea" },
  ],
  projects: [
    { name: "title", label: "Nazwa projektu", required: true },
    { name: "description", label: "Opis", type: "textarea" },
  ],
  woods: [
    { name: "title", label: "Gatunek drewna", required: true },
    { name: "tone", label: "Ton", required: true },
    { name: "grain", label: "Usłojenie", required: true },
    { name: "character", label: "Charakterystyka", required: true },
  ],
  settings: [
    { name: "company_name", label: "Nazwa pracowni" },
    { name: "phone", label: "Telefon" },
    { name: "email", label: "E-mail", type: "email" },
    { name: "address", label: "Adres", type: "textarea" },
    { name: "footer_text", label: "Tekst stopki", type: "textarea" },
    { name: "seo_title", label: "Tytuł SEO" },
    { name: "seo_description", label: "Opis SEO", type: "textarea" },
  ],
};

function titleOf(item: RecordItem) {
  return String(
    item.title ??
      item.name ??
      item.company_name ??
      item.subject ??
      "Bez tytułu",
  );
}

async function fetchSectionItems(section: ContentType) {
  const response = await fetch(`/api/admin/content?type=${section}`, {
    cache: "no-store",
  });
  if (response.status === 401) {
    return { authenticated: false, items: [] as RecordItem[] };
  }
  const result = (await response.json()) as {
    data?: RecordItem[] | RecordItem | null;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(result.error ?? "Nie udało się pobrać treści.");
  }
  const data = result.data;
  return {
    authenticated: true,
    items: Array.isArray(data) ? data : data ? [data] : [],
  };
}

export function AdminDashboard() {
  const router = useRouter();
  const [section, setSection] = useState<ContentType>("services");
  const [items, setItems] = useState<RecordItem[]>([]);
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [galleryIds, setGalleryIds] = useState<string[]>([]);
  const [coverId, setCoverId] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [slugOverride, setSlugOverride] = useState<string | null>(null);
  const [previewDescription, setPreviewDescription] = useState("");
  const [woodDetails, setWoodDetails] = useState({ tone: "", grain: "", character: "" });
  const [editorVersion, setEditorVersion] = useState(0);
  const draggedId = useRef<string | null>(null);
  const [dragTarget, setDragTarget] = useState<string | null>(null);

  function selectItem(item: RecordItem | null, type: ContentType = section) {
    const title = String(item?.title ?? "");
    const savedSlug = item?.slug == null ? null : String(item.slug);
    setEditorVersion((version) => version + 1);
    setEditing(item);
    setPreviewTitle(title);
    setSlugOverride(
      savedSlug !== null && savedSlug !== slugify(title) ? savedSlug : null,
    );
    setPreviewDescription(
      String(item?.[type === "services" ? "content" : "description"] ?? ""),
    );
    setWoodDetails({
      tone: String(item?.tone ?? ""),
      grain: String(item?.grain ?? ""),
      character: String(item?.character ?? ""),
    });
    setCoverId(
      String(item?.[type === "projects" ? "cover_image_id" : "image_id"] ?? ""),
    );
    setGalleryIds(
      Array.isArray(item?.gallery_media_ids)
        ? item.gallery_media_ids.filter(
            (id): id is string => typeof id === "string",
          )
        : [],
    );
  }

  const loadItems = useCallback(async () => {
    try {
      const result = await fetchSectionItems(section);
      if (!result.authenticated) {
        router.replace("/admin/login");
        return;
      }
      setItems(result.items);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Nie udało się pobrać treści.",
      );
    }
  }, [router, section]);

  useEffect(() => {
    let active = true;
    void fetchSectionItems(section)
      .then((result) => {
        if (!active) return;
        if (!result.authenticated) {
          router.replace("/admin/login");
          return;
        }
        setItems(result.items);
        setError("");
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Nie udało się pobrać treści.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [router, section]);

  const sectionFields = useMemo(
    () => (section === "messages" ? [] : fields[section]),
    [section],
  );
  const editorItem =
    editing ?? (section === "settings" ? (items[0] ?? null) : null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError("");
    setNotice("");
    const formData = new FormData(form);
    const data: Record<string, unknown> = {};
    for (const field of sectionFields) {
      const raw = String(formData.get(field.name) ?? "").trim();
      data[field.name] = raw || null;
    }
    if (section !== "settings") {
      data.status = String(formData.get("status") ?? "draft");
      if (section !== "woods") {
        const slug = String(formData.get("slug") ?? "").trim();
        if (slug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
          setError(
            "Adres musi zawierać małe litery bez polskich znaków lub cyfry, rozdzielone pojedynczymi myślnikami (maksymalnie 100 znaków).",
          );
          setPending(false);
          return;
        }
        data.slug = slug;
      }
      data[section === "projects" ? "cover_image_id" : "image_id"] =
        coverId || null;
    }
    if (section === "projects") data.gallery_media_ids = galleryIds;

    try {
      const currentItem =
        editing ?? (section === "settings" ? items[0] : undefined);
      const response = await fetch("/api/admin/content", {
        method: currentItem?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: section,
          id:
            currentItem?.id === undefined ? undefined : String(currentItem.id),
          data,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? "Nie udało się zapisać.");
      selectItem(null);
      setNotice("Zapisano zmiany.");
      form.reset();
      await loadItems();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Nie udało się zapisać.",
      );
    } finally {
      setPending(false);
    }
  }

  async function deleteItem(item: RecordItem) {
    if (!item.id || !window.confirm(`Usunąć „${titleOf(item)}”?`)) return;
    setError("");
    try {
      const response = await fetch(
        `/api/admin/content?type=${section}&id=${encodeURIComponent(item.id)}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? "Nie udało się usunąć wpisu.");
      if (editing?.id === item.id) selectItem(null);
      setNotice("Usunięto wpis.");
      await loadItems();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Nie udało się usunąć wpisu.",
      );
    }
  }

  async function reorder(id: string, targetId: string) {
    if (id === targetId || pending || uploading) return;
    setPending(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/admin/content/order", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: section, id, targetId }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? "Nie udało się zapisać kolejności.");
      const refreshed = await fetchSectionItems(section);
      if (!refreshed.authenticated) {
        router.replace("/admin/login");
        return;
      }
      setItems(refreshed.items);
      setNotice("Kolejność została zapisana.");
    } catch (reorderError) {
      setError(
        reorderError instanceof Error
          ? reorderError.message
          : "Nie udało się zapisać kolejności.",
      );
    } finally {
      setPending(false);
    }
  }

  async function updateMessageStatus(item: RecordItem, status: string) {
    try {
      const response = await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "messages",
          id: item.id,
          data: { status },
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? "Nie udało się zmienić statusu.");
      await loadItems();
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Nie udało się zmienić statusu.",
      );
    }
  }

  async function openMessage(item: RecordItem) {
    if (!item.id) return;
    setSelectedMessageId(item.id);
    if (item.is_read !== false) return;
    setError("");
    try {
      const response = await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "messages", id: item.id, data: { is_read: true } }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Nie udało się oznaczyć wiadomości jako przeczytanej.");
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_read: true } : entry));
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : "Nie udało się oznaczyć wiadomości jako przeczytanej.");
    }
  }

  async function deleteMessage(item: RecordItem) {
    if (!item.id || pending || !window.confirm(`Usunąć wiadomość od „${String(item.name ?? "nadawcy")}” wraz z załącznikami? Tej operacji nie można cofnąć.`)) return;
    setPending(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/admin/content?type=messages&id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Nie udało się usunąć wiadomości.");
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setSelectedMessageId((current) => current === item.id ? null : current);
      setNotice("Wiadomość i jej załączniki zostały usunięte.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Nie udało się usunąć wiadomości.");
    } finally {
      setPending(false);
    }
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setError("");
    setNotice("");
    const formData = new FormData();
    formData.set("file", file);
    try {
      const response = await fetch("/api/admin/media", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        data?: { id: string };
        error?: string;
      };
      if (!response.ok || !result.data)
        throw new Error(result.error ?? "Nie udało się wysłać zdjęcia.");
      setCoverId(result.data.id);
      setNotice("Zdjęcie zostało przesłane.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Nie udało się wysłać zdjęcia.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function uploadGalleryImages(files: File[]) {
    if (galleryIds.length + files.length > 24) {
      setError("Galeria może zawierać maksymalnie 24 zdjęcia.");
      return;
    }
    setUploading(true);
    setError("");
    setNotice("");
    let uploaded = 0;
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.set("file", file);
        const response = await fetch("/api/admin/media", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json()) as {
          data?: { id: string };
          error?: string;
        };
        if (!response.ok || !result.data) {
          throw new Error(result.error ?? "Nie udało się wysłać zdjęcia.");
        }
        const mediaId = result.data.id;
        setGalleryIds((current) => [...current, mediaId]);
        uploaded += 1;
      }
      setNotice(
        uploaded === 1
          ? "Dodano zdjęcie do galerii."
          : `Dodano ${uploaded} zdjęć do galerii.`,
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Nie udało się wysłać zdjęć.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function logout() {
    const response = await fetch("/api/admin/logout", { method: "POST" });
    if (!response.ok) {
      setError("Nie udało się wylogować. Spróbuj ponownie.");
      return;
    }
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <Link className="admin-brand" href="/">
          Warsztat <span>/</span> panel
        </Link>
        <button className="admin-logout" onClick={logout} type="button">
          <LogOut aria-hidden="true" size={16} /> Wyloguj
        </button>
      </header>
      <div className="admin-workspace">
        <aside aria-label="Sekcje panelu" className="admin-sidebar">
          <p className="eyebrow">ZARZĄDZANIE</p>
          {sections.map((entry) => (
            <button
              aria-current={section === entry.id ? "page" : undefined}
              className={
                section === entry.id
                  ? "admin-nav-item is-active"
                  : "admin-nav-item"
              }
              disabled={uploading || pending}
              key={entry.id}
              onClick={() => {
                setSection(entry.id);
                setSelectedMessageId(null);
                selectItem(null, entry.id);
                setNotice("");
              }}
              type="button"
            >
              {entry.label}
            </button>
          ))}
        </aside>
        <section aria-labelledby="admin-heading" className="admin-content">
          <div className="admin-content-heading">
            <div>
              <p className="eyebrow">ZAWARTOŚĆ STRONY</p>
              <h1 id="admin-heading">
                {sections.find((entry) => entry.id === section)?.label}
              </h1>
            </div>
            {section !== "settings" && (
              <button
                className="button button-dark"
                disabled={uploading || pending}
                onClick={() => {
                  if (section === "messages") void loadItems();
                  else {
                    selectItem(null);
                  }
                  setNotice("");
                }}
                type="button"
              >
                {section === "messages" ? (
                  <RefreshCw aria-hidden="true" size={17} />
                ) : (
                  <Plus aria-hidden="true" size={17} />
                )}
                {section === "messages"
                  ? "Odśwież"
                  : editing
                    ? "Nowy wpis"
                    : "Dodaj wpis"}
              </button>
            )}
          </div>

          {error && (
            <p aria-live="polite" className="form-error">
              {error}
            </p>
          )}
          {notice && (
            <p aria-live="polite" className="form-success">
              {notice}
            </p>
          )}

          {section !== "messages" && (
            <div
              className={
                section === "settings"
                  ? "admin-editor-layout admin-settings-layout"
                  : "admin-editor-layout"
              }
            >
              {section !== "settings" && (
                <aside
                  aria-label={
                    section === "projects" ? "Lista realizacji" : section === "woods" ? "Lista gatunków drewna" : "Lista usług"
                  }
                  className="admin-record-list"
                >
                  {items.length === 0 && (
                    <p className="admin-empty">Nie ma jeszcze wpisów.</p>
                  )}
                  {items.map((item, index) => {
                    const id = String(item.id ?? "");
                    const imageId =
                      item[
                        section === "projects" ? "cover_image_id" : "image_id"
                      ];
                    return (
                      <article
                        className={`admin-record-card${dragTarget === id ? " is-drag-target" : ""}`}
                        key={id}
                        onDragOver={(event) => {
                          if (!draggedId.current || draggedId.current === id)
                            return;
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setDragTarget(id);
                        }}
                        onDragLeave={(event) => {
                          if (
                            !event.currentTarget.contains(
                              event.relatedTarget as Node | null,
                            )
                          )
                            setDragTarget(null);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const source = draggedId.current;
                          draggedId.current = null;
                          setDragTarget(null);
                          if (source) void reorder(source, id);
                        }}
                      >
                        <div className="admin-record-summary">
                          <div>
                            <h2>{titleOf(item)}</h2>
                            {item.slug != null && <p>{String(item.slug)}</p>}
                          </div>
                          {typeof imageId === "string" && imageId ? (
                            <Image
                              alt=""
                              className="admin-record-thumbnail"
                              width={72}
                              height={80}
                              src={`/api/media/${encodeURIComponent(imageId)}`}
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="admin-record-thumbnail admin-record-placeholder"
                            >
                              <ImageOff size={24} />
                            </span>
                          )}
                        </div>
                        <span
                          className={`admin-status status-${String(item.status ?? "draft")}`}
                        >
                          {item.status === "published" && (
                            <Check aria-hidden="true" size={15} />
                          )}
                          {item.status === "published"
                            ? "Opublikowane"
                            : "Szkic"}
                        </span>
                        <div className="admin-record-actions">
                          <button
                            className="admin-text-button"
                            disabled={uploading || pending}
                            onClick={() => {
                              selectItem(item);
                              setNotice("");
                            }}
                            type="button"
                          >
                            <Pencil aria-hidden="true" size={15} /> Edytuj
                          </button>
                          <button
                            className="admin-text-button is-danger"
                            disabled={uploading || pending}
                            onClick={() => void deleteItem(item)}
                            type="button"
                          >
                            <Trash2 aria-hidden="true" size={15} /> Usuń
                          </button>
                          <div className="admin-reorder-controls">
                            <span
                              aria-hidden="true"
                              className="admin-drag-handle"
                              draggable={!uploading && !pending}
                              onDragStart={(event) => {
                                draggedId.current = id;
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", id);
                              }}
                              onDragEnd={() => {
                                draggedId.current = null;
                                setDragTarget(null);
                              }}
                              title="Przeciągnij, aby zmienić kolejność"
                            >
                              <GripVertical size={20} />
                            </span>
                            <button
                              className="admin-text-button"
                              type="button"
                              disabled={uploading || pending || index === 0}
                              onClick={() =>
                                void reorder(id, String(items[index - 1].id))
                              }
                              aria-label={`Przenieś ${titleOf(item)} w górę`}
                            >
                              <ArrowUp aria-hidden="true" size={18} />
                            </button>
                            <button
                              className="admin-text-button"
                              type="button"
                              disabled={
                                uploading ||
                                pending ||
                                index === items.length - 1
                              }
                              onClick={() =>
                                void reorder(id, String(items[index + 1].id))
                              }
                              aria-label={`Przenieś ${titleOf(item)} w dół`}
                            >
                              <ArrowDown aria-hidden="true" size={18} />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </aside>
              )}
              <form
                className="admin-editor"
                key={`${section}-${editorItem?.id ?? "new"}-${editorVersion}`}
                onSubmit={save}
              >
                <h2>
                  {editorItem
                    ? "Edytuj treść"
                    : section === "settings"
                      ? "Dane pracowni"
                      : "Nowy wpis"}
                </h2>
                <div className="admin-field-grid">
                  {sectionFields.map((field) => {
                    const value = editorItem?.[field.name];
                    const common = {
                      defaultValue: value == null ? "" : String(value),
                      name: field.name,
                      required: field.required,
                    };
                    return (
                      <label className="admin-field" key={field.name}>
                        {field.label}
                        {field.type === "textarea" ? (
                          <textarea
                            {...common}
                            onChange={(event) => {
                              if (
                                field.name === "content" ||
                                field.name === "description"
                              )
                                setPreviewDescription(
                                  event.currentTarget.value,
                                );
                            }}
                            rows={
                              field.name === "content" ||
                              field.name.includes("description")
                                ? 6
                                : 3
                            }
                          />
                        ) : (
                          <input
                            {...common}
                            onChange={(event) => {
                              if (field.name === "title")
                                setPreviewTitle(event.currentTarget.value);
                              if (field.name === "tone" || field.name === "grain" || field.name === "character") {
                                const value = event.currentTarget.value;
                                setWoodDetails((current) => ({ ...current, [field.name]: value }));
                              }
                            }}
                            type={field.type ?? "text"}
                          />
                        )}
                      </label>
                    );
                  })}
                  {section !== "settings" && (
                    <div className="admin-publication-fields">
                      {section !== "woods" && <label className="admin-field">
                        Adres (slug)
                        <input
                          name="slug"
                          value={slugOverride ?? slugify(previewTitle)}
                          onChange={(event) =>
                            setSlugOverride(event.currentTarget.value)
                          }
                          maxLength={100}
                          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                          title="Użyj małych liter bez polskich znaków, cyfr i pojedynczych myślników."
                          required
                        />
                        <small>
                          Adres tworzy się z nazwy, ale możesz go zmienić ręcznie.
                        </small>
                        {editing &&
                          (slugOverride ?? slugify(previewTitle)) !==
                            String(editing.slug ?? "") && (
                            <small>
                              Po zapisaniu zmieni się adres istniejącego wpisu.
                              Stary link przestanie działać.
                            </small>
                          )}
                      </label>}
                      <label className="admin-field">
                        Widoczność
                        <select
                          defaultValue={String(editorItem?.status ?? "draft")}
                          name="status"
                        >
                          <option value="draft">Szkic</option>
                          <option value="published">Opublikowany</option>
                        </select>
                      </label>
                    </div>
                  )}
                </div>

                {(section === "projects" || section === "services" || section === "woods") && (
                  <div className="admin-field admin-upload-field">
                    <label htmlFor="admin-cover-upload">
                      {section === "projects"
                        ? "Zdjęcie główne"
                        : section === "woods" ? "Zdjęcie drewna" : "Zdjęcie usługi"}
                    </label>
                    {coverId && (
                      <div className="admin-cover-preview">
                        <Image
                          alt="Podgląd zdjęcia głównego"
                          height={120}
                          width={180}
                          src={`/api/media/${encodeURIComponent(coverId)}`}
                        />
                        <button
                          className="admin-text-button is-danger"
                          disabled={uploading || pending}
                          onClick={() => setCoverId("")}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" size={15} /> Usuń zdjęcie
                        </button>
                      </div>
                    )}
                    <label
                      className="admin-file-picker"
                      htmlFor="admin-cover-upload"
                    >
                      <Upload aria-hidden="true" size={17} /> Wybierz zdjęcie
                    </label>
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="admin-file-input"
                      disabled={uploading || pending}
                      id="admin-cover-upload"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        event.currentTarget.value = "";
                        if (file) void uploadImage(file);
                      }}
                      type="file"
                    />
                    <small>JPEG, PNG lub WebP; do 10 MB.</small>
                  </div>
                )}
                {section === "projects" && (
                  <div className="admin-field admin-upload-field">
                    <label htmlFor="project-gallery-upload">
                      Galeria realizacji (JPEG, PNG lub WebP; do 10 MB na
                      zdjęcie)
                    </label>
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="admin-file-input"
                      disabled={uploading || pending || galleryIds.length >= 24}
                      id="project-gallery-upload"
                      multiple
                      onChange={(event) => {
                        const files = Array.from(
                          event.currentTarget.files ?? [],
                        );
                        event.currentTarget.value = "";
                        if (files.length) void uploadGalleryImages(files);
                      }}
                      type="file"
                    />
                    <label
                      className="admin-file-picker"
                      htmlFor="project-gallery-upload"
                    >
                      <ImagePlus aria-hidden="true" size={17} /> Dodaj zdjęcia
                      do galerii
                    </label>
                    <ul
                      aria-label="Zdjęcia galerii realizacji"
                      className="admin-gallery"
                    >
                      {galleryIds.map((mediaId, index) => (
                        <li
                          className="admin-gallery-item"
                          key={`${mediaId}-${index}`}
                        >
                          <Image
                            alt={`Zdjęcie ${index + 1} w galerii realizacji`}
                            height={88}
                            src={`/api/media/${encodeURIComponent(mediaId)}`}
                            width={120}
                          />
                          <button
                            aria-label={`Usuń zdjęcie ${index + 1} z galerii`}
                            className="admin-text-button is-danger"
                            disabled={uploading || pending}
                            onClick={() =>
                              setGalleryIds((current) =>
                                current.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              )
                            }
                            type="button"
                          >
                            <Trash2 aria-hidden="true" size={15} /> Usuń
                          </button>
                        </li>
                      ))}
                    </ul>
                    <span>{galleryIds.length} / 24 zdjęć</span>
                  </div>
                )}
                <div className="admin-editor-actions">
                  <button
                    className="button button-dark"
                    disabled={pending || uploading}
                    type="submit"
                  >
                    <Save aria-hidden="true" size={17} />
                    {pending
                      ? "Zapisywanie…"
                      : uploading
                        ? "Wysyłanie zdjęć…"
                        : editing
                          ? "Zapisz zmiany"
                          : "Zapisz"}
                  </button>
                  {editing && (
                    <button
                      className="admin-text-button"
                      disabled={uploading || pending}
                      onClick={() => {
                        selectItem(null);
                      }}
                      type="button"
                    >
                      <X aria-hidden="true" size={15} /> Anuluj
                    </button>
                  )}
                </div>
              </form>
              {section !== "settings" && (
                <aside
                  className="admin-live-preview"
                  aria-label="Podgląd publikacji"
                >
                  <p className="eyebrow">PODGLĄD NA ŻYWO</p>
                  {section === "woods" ? (
                    <div className="admin-preview-wood">
                      <WoodCard index={0} wood={{
                        title: previewTitle || "Gatunek drewna",
                        tone: woodDetails.tone || "Ton drewna",
                        grain: woodDetails.grain || "Usłojenie",
                        character: woodDetails.character || "Charakterystyka drewna",
                        imageUrl: coverId ? `/api/media/${encodeURIComponent(coverId)}` : null,
                      }} />
                    </div>
                  ) : (
                  <div
                    className={
                      section === "projects"
                        ? "admin-preview-project"
                        : "admin-preview-service"
                    }
                  >
                    {section === "projects" && (
                      <p className="eyebrow">
                        {String(editing?.category ?? "REALIZACJA")}
                      </p>
                    )}
                    <h2>
                      {previewTitle ||
                        (section === "projects"
                          ? "Nazwa projektu"
                          : "Nazwa usługi")}
                    </h2>
                    {section === "projects" && Boolean(editing?.short_description) && (
                      <p>{String(editing?.short_description)}</p>
                    )}
                    {coverId && (
                      <Image
                        alt=""
                        width={400}
                        height={260}
                        src={`/api/media/${encodeURIComponent(coverId)}`}
                      />
                    )}
                    {section === "services" ? (
                      <OfferDescription
                        shortDescription={typeof editing?.short_description === "string" ? editing.short_description : null}
                        content={previewDescription}
                      />
                    ) : previewDescription && <p>{previewDescription}</p>}
                    {section === "projects" && galleryIds.length > 0 && (
                      <div className="admin-preview-gallery">
                        {galleryIds.map((id) => (
                          <Image
                            alt=""
                            key={id}
                            width={160}
                            height={110}
                            src={`/api/media/${encodeURIComponent(id)}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  )}
                </aside>
              )}
            </div>
          )}

          {section === "messages" ? (
            <MessageInbox
              items={items}
              selectedId={selectedMessageId}
              pending={pending}
              onOpen={(item) => void openMessage(item)}
              onDelete={(item) => void deleteMessage(item)}
              onStatusChange={(item, status) => void updateMessageStatus(item, status)}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}
