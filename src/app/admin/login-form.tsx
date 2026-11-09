"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Nie udało się zalogować.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Brak połączenia. Spróbuj ponownie.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label>
        E-mail
        <input autoComplete="username" name="email" required type="email" />
      </label>
      <label>
        Hasło
        <input
          autoComplete="current-password"
          name="password"
          required
          type="password"
        />
      </label>
      {error && <p aria-live="polite" className="form-error">{error}</p>}
      <button className="button button-dark" disabled={pending} type="submit">
        <LogIn aria-hidden="true" size={17} />
        {pending ? "Logowanie…" : "Zaloguj się"}
      </button>
    </form>
  );
}
