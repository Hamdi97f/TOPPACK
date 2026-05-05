import { apiClient } from "@/lib/api-client";
import { CheckoutForm } from "@/components/CheckoutForm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  // Fetch settings server-side so the form is rendered with the right fields
  // on first paint. Falls back to defaults if the api-gateway is unreachable.
  const settings = await apiClient.getCheckoutSettings();
  return <CheckoutForm settings={settings} />;
}
