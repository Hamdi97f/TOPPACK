import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { apiClient } from "@/lib/api-client";
import {
  DEFAULT_SITE_TITLE,
  DEFAULT_SITE_DESCRIPTION,
  isSafeAssetUrl,
} from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  // The branding section is admin-editable from /admin/settings/branding.
  // Falls back to the historical defaults when settings are missing or the
  // upstream gateway is unreachable.
  const { branding } = await apiClient.getSiteSettings();
  const title = branding.siteTitle || DEFAULT_SITE_TITLE;
  const description = branding.siteDescription || DEFAULT_SITE_DESCRIPTION;
  const social = isSafeAssetUrl(branding.socialImageUrl) ? branding.socialImageUrl : "";
  const favicon = isSafeAssetUrl(branding.faviconUrl) ? branding.faviconUrl : "";

  const metadata: Metadata = {
    title: { default: title, template: `%s | ${title}` },
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(social ? { images: [{ url: social }] } : {}),
    },
    twitter: {
      card: social ? "summary_large_image" : "summary",
      title,
      description,
      ...(social ? { images: [social] } : {}),
    },
  };
  if (favicon) {
    metadata.icons = { icon: favicon, shortcut: favicon, apple: favicon };
  }
  return metadata;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
