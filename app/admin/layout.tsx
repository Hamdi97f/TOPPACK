import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminMobileNav, AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen flex flex-col bg-kraft-50">
      <AdminHeader user={{ name: session.user.name ?? "Admin", email: session.user.email ?? "" }} />
      <div className="flex-1 flex">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminMobileNav />
          <main className="flex-1 p-4 sm:p-6 max-w-full overflow-x-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
