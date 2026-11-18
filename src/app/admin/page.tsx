import { redirect } from "next/navigation";
import { AdminDashboard } from "./dashboard";
import { isAdminAuthenticated } from "@/lib/admin-session";

export const metadata = {
  title: "Panel warsztatu",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  return <AdminDashboard />;
}
