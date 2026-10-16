import { redirect } from "next/navigation";

import { isAdmin } from "@/app/lib/admin-session";
import AdminEditor from "./AdminEditor";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Вторая проверка (кроме middleware): страница не отдаётся без действующей сессии
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }

  return <AdminEditor />;
}
