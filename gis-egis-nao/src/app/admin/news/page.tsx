// ПУТЬ В ПРОЕКТЕ: src/app/admin/news/page.tsx
import { redirect } from "next/navigation";

import { isAdmin } from "@/app/lib/admin-session";
import NewsEditor from "./NewsEditor";

export const dynamic = "force-dynamic";

export default async function AdminNewsPage() {
  // Вторая проверка (кроме middleware): страница не отдаётся без действующей сессии
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }

  return <NewsEditor />;
}
