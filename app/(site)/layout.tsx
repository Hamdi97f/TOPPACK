import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MetaPixel } from "@/components/MetaPixel";
import { apiClient } from "@/lib/api-client";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await apiClient.getSiteSettings();
  return (
    <>
      <MetaPixel pixelId={settings.integrations.metaPixelId} />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer contact={settings.contact} />
    </>
  );
}
