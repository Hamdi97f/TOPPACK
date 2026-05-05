import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { CheckoutForm } from "@/components/CheckoutForm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  // Fetch settings server-side so the form is rendered with the right fields
  // on first paint. Falls back to defaults if the api-gateway is unreachable.
  const settings = await apiClient.getSiteSettings();

  // Account-required gate: bounce anonymous shoppers to the login page so
  // they can sign in (or register) before placing an order. The same check
  // is enforced in `POST /api/orders` so the client can't bypass it.
  if (settings.account.requireAccountForOrder) {
    const session = await getServerSession(authOptions);
    if (!session) {
      redirect("/login?callbackUrl=%2Fcheckout");
    }
  }

  return <CheckoutForm settings={settings.checkout} />;
}
