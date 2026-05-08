import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

/**
 * Public, safe-to-leak subset of site settings used by client components.
 * Specifically does NOT expose anything sensitive such as the Meta CAPI
 * access token or the gateway service token.
 */
export async function GET() {
  const settings = await apiClient.getSiteSettings();
  return NextResponse.json({
    requireAccountForOrder: settings.account.requireAccountForOrder,
    metaPixelEnabled: !!settings.integrations.metaPixelId,
    shipping: settings.shipping,
    winsmsAutoConfirmEnabled: settings.winsms.enabled,
  });
}
