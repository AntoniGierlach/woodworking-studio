"use client";

import { useState } from "react";

export default function ContactEmailCopy({ email }: { email: string }) {
  const [message, setMessage] = useState("");

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setMessage("Skopiowano adres e-mail do schowka.");
    } catch {
      setMessage("Nie udało się skopiować adresu e-mail. Skopiuj go ręcznie.");
    }
  }

  return (
    <>
      <button
        aria-label={`Kopiuj adres e-mail do schowka: ${email}`}
        className="contact-email-copy"
        onClick={copyEmail}
        type="button"
      >
        {email}
      </button>
      <span className="contact-email-copy-status" role="status">
        {message}
      </span>
    </>
  );
}
