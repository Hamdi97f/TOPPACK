"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CustomerActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [active, setActive] = useState(isActive);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const next = !active;
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { alert(data.error || "Update failed"); return; }
    setActive(next);
    router.refresh();
  }

  return (
    <button type="button" onClick={toggle} disabled={loading}
      className={active ? "btn-danger !py-1 !px-3 text-xs" : "btn-secondary !py-1 !px-3 text-xs"}>
      {active ? "Disable account" : "Enable account"}
    </button>
  );
}
