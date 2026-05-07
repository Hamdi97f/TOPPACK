import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MetaPixel } from "@/components/MetaPixel";
import { LiveEditOverlay } from "@/components/LiveEditOverlay";
import { apiClient } from "@/lib/api-client";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await apiClient.getSiteSettings();
  return (
    <>
      <MetaPixel pixelId={settings.integrations.metaPixelId} />
      <Header showBoxComparator={settings.boxComparator.enabled} />
      <main className="flex-1">{children}</main>
      <Footer contact={settings.contact} />
      {/* Self-gating: only activates when the page is loaded inside an iframe
          (i.e. the admin live-edit preview). Inert for all other visitors. */}
      <LiveEditOverlay />
    </>
  );
}
