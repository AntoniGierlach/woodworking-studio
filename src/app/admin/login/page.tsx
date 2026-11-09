import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminLoginForm } from "../login-form";
import { isAdminAuthenticated } from "@/lib/admin-session";

export const metadata = { title: "Logowanie | Panel warsztatu" };
export const instant = false;

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) redirect("/admin");

  return (
    <main className="admin-login">
      <Link className="button button-dark" href="/">Wróć na stronę</Link>
      <section aria-labelledby="admin-login-title" className="admin-login-card">
        <p className="eyebrow">Panel warsztatu</p>
        <h1 id="admin-login-title">Zaloguj się</h1>
        <p>Dostęp tylko dla administratora pracowni.</p>
        <AdminLoginForm />
      </section>
    </main>
  );
}
