"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { FileImage, FileText, Send, Trash2 } from "lucide-react";

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const maxFiles = 5;
const maxFileSize = 10 * 1024 * 1024;
const maxTotalSize = 30 * 1024 * 1024;

type SubmissionState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

function formatFileSize(size: number) {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ContactForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [submission, setSubmission] = useState<SubmissionState>({
    kind: "idle",
  });

  function addSelectedFiles(incoming: File[]) {
    const nextFiles = [...files, ...incoming];
    if (nextFiles.length > maxFiles) {
      setFileError(`Możesz dodać maksymalnie ${maxFiles} plików.`);
      return;
    }

    const oversizedFile = nextFiles.find((file) => file.size > maxFileSize);
    if (oversizedFile) {
      setFileError(
        `Plik „${oversizedFile.name}” przekracza limit 10 MB.`,
      );
      return;
    }

    const invalidFile = nextFiles.find((file) => !allowedTypes.has(file.type));
    if (invalidFile) {
      setFileError(
        `Format pliku „${invalidFile.name}” nie jest obsługiwany.`,
      );
      return;
    }

    if (nextFiles.reduce((total, file) => total + file.size, 0) > maxTotalSize) {
      setFileError("Łączny rozmiar załączników nie może przekraczać 30 MB.");
      return;
    }

    setFiles(nextFiles);
    setFileError("");
    setSubmission({ kind: "idle" });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? []);
    event.target.value = "";
    addSelectedFiles(incoming);
  }

  function removeFile(index: number) {
    setFiles((currentFiles) => currentFiles.filter((_, i) => i !== index));
    setFileError("");
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmission({ kind: "sending" });

    const formData = new FormData(form);
    const nativeFiles = formData.getAll("files").filter(
      (file): file is File => file instanceof File && file.name !== "",
    );
    formData.delete("files");
    for (const file of nativeFiles) {
      formData.append("files", file);
    }
    for (const file of files) {
      formData.append("files", file);
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        body: formData,
      });
      const result: {
        data?: { accepted?: boolean };
        message?: string;
        error?: string | { code?: string; message?: string };
      } = await response.json();

      if (!response.ok) {
        const errorCode =
          typeof result.error === "object" ? result.error.code : undefined;
        const errorMessage =
          typeof result.error === "object"
            ? result.error.message
            : result.error;
        const messages: Record<string, string> = {
          contact_service_not_configured:
            "Formularz nie jest jeszcze skonfigurowany. Wiadomość nie została wysłana.",
          rate_limit_exceeded:
            "Wysłano już kilka wiadomości. Odczekaj chwilę i spróbuj ponownie.",
          validation_error:
            "Sprawdź poprawność danych w formularzu i spróbuj ponownie.",
          unsupported_file:
            "Jeden z załączników ma nieobsługiwany format lub nieprawidłową zawartość.",
          files_too_large:
            "Łączny rozmiar załączników przekracza dozwolony limit.",
          file_too_large: "Jeden z załączników przekracza limit 10 MB.",
          too_many_files: "Możesz dodać maksymalnie 5 plików.",
          origin_not_allowed:
            "Nie można wysłać formularza z tej strony. Odśwież witrynę i spróbuj ponownie.",
          request_too_large:
            "Załączniki przekraczają dozwolony łączny rozmiar.",
          invalid_content_type:
            "Formularz wysłał nieobsługiwane dane. Odśwież stronę i spróbuj ponownie.",
          invalid_multipart:
            "Nie udało się odczytać formularza. Sprawdź dane i spróbuj ponownie.",
          invalid_request:
            "Nie udało się odczytać formularza. Sprawdź dane i spróbuj ponownie.",
          invalid_form_field:
            "Formularz zawiera nieoczekiwane dane. Odśwież stronę i spróbuj ponownie.",
          invalid_file_field:
            "Nie udało się odczytać załączników. Wybierz pliki ponownie.",
          too_many_fields:
            "Formularz zawiera zbyt wiele pól. Odśwież stronę i spróbuj ponownie.",
          too_many_parts:
            "Formularz zawiera zbyt wiele elementów. Odśwież stronę i spróbuj ponownie.",
          field_too_large:
            "Jedno z pól formularza zawiera zbyt dużo tekstu.",
          contact_submission_failed:
            "Nie udało się zapisać wiadomości. Dane nie zostały wysłane — spróbuj ponownie.",
        };
        setSubmission({
          kind: "error",
          message:
            (errorCode && messages[errorCode]) ??
            errorMessage ??
            "Nie udało się wysłać wiadomości. Sprawdź dane i spróbuj ponownie.",
        });
        return;
      }

      setSubmission({
        kind: "success",
        message:
          result.message ??
          "Wiadomość została wysłana. Dziękujemy za kontakt.",
      });
      setFiles([]);
      form.reset();
    } catch {
      setSubmission({
        kind: "error",
        message:
          "Nie udało się połączyć z formularzem. Twoje dane pozostały na stronie — spróbuj ponownie.",
      });
    }
  }

  return (
    <form action="/api/contact" className="contact-form" encType="multipart/form-data" method="post" onSubmit={submitForm}>
      <div className="form-field">
        <label htmlFor="contact-name">Imię i nazwisko *</label>
        <input
          autoComplete="name"
          id="contact-name"
          maxLength={120}
          name="name"
          required
        />
      </div>

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="contact-email">Adres e-mail *</label>
          <input
            autoComplete="email"
            id="contact-email"
            maxLength={254}
            name="email"
            required
            type="email"
          />
        </div>
        <div className="form-field">
          <label htmlFor="contact-phone">Telefon (opcjonalnie)</label>
          <input
            autoComplete="tel"
            id="contact-phone"
            maxLength={40}
            name="phone"
            type="tel"
          />
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="contact-subject">Rodzaj projektu (opcjonalnie)</label>
        <select defaultValue="" id="contact-subject" name="subject">
          <option value="">Wybierz lub pomiń</option>
          <option value="Mebel wolnostojący">Mebel wolnostojący</option>
          <option value="Zabudowa">Zabudowa</option>
          <option value="Inne">Inne / jeszcze nie wiem</option>
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="contact-message">Wiadomość *</label>
        <textarea
          id="contact-message"
          maxLength={5000}
          minLength={10}
          name="message"
          required
          rows={6}
        />
      </div>

      <div
        className="form-field file-upload-area"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addSelectedFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <label htmlFor="contact-files">Załączniki (opcjonalnie)</label>
        <input
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          aria-describedby="file-guidelines"
          id="contact-files"
          multiple
          name="files"
          onChange={handleFileChange}
          type="file"
        />
        <p className="form-hint" id="file-guidelines">
          Przeciągnij pliki tutaj albo wybierz je z urządzenia. Maksymalnie 5
          plików, do 10 MB każdy i 30 MB łącznie. JPG, PNG, WEBP lub PDF.
        </p>
        <div aria-live="polite" aria-atomic="true" className="selected-files-status">
          Dodane załączniki: {files.length} / {maxFiles}
        </div>
        {files.length > 0 && (
          <ul aria-label="Wybrane załączniki" className="selected-files">
            {files.map((file, index) => (
              <li key={`${file.name}-${file.lastModified}-${index}`}>
                <span aria-hidden="true" className="selected-file-icon">
                  {file.type === "application/pdf" ? <FileText size={20} /> : <FileImage size={20} />}
                </span>
                <span className="selected-file-details">
                  <span className="selected-file-name">{file.name}</span>
                  <span className="selected-file-meta">
                    {file.type === "application/pdf" ? "Dokument PDF" : "Zdjęcie"} · {formatFileSize(file.size)}
                  </span>
                </span>
                <button
                  aria-label={`Usuń plik ${file.name}`}
                  onClick={() => removeFile(index)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={16} /> <span>Usuń</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {fileError && (
          <p className="form-error" role="alert">
            {fileError}
          </p>
        )}
      </div>

      <div aria-hidden="true" className="form-honeypot">
        <label htmlFor="contact-website">Strona internetowa</label>
        <input
          autoComplete="off"
          id="contact-website"
          name="website"
          tabIndex={-1}
        />
      </div>

      <p className="privacy-notice">
        Informacja o przetwarzaniu danych wymaga uzupełnienia przed
        uruchomieniem produkcyjnym.{" "}
        <Link href="/polityka-prywatnosci">Zobacz, czego brakuje.</Link>
      </p>

      {submission.kind === "error" && (
        <p className="form-error" role="alert">
          {submission.message}
        </p>
      )}
      {submission.kind === "success" && (
        <p className="form-success" role="status">
          {submission.message}
        </p>
      )}

      <button
        className="button button-dark form-submit"
        disabled={submission.kind === "sending"}
        type="submit"
      >
        <Send aria-hidden="true" size={17} />
        {submission.kind === "sending" ? "Wysyłanie…" : "Wyślij zapytanie"}
      </button>
    </form>
  );
}
