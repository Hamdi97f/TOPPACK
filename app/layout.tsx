import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: { default: "TOPPACK — Cartons en carton ondulé", template: "%s | TOPPACK" },
  description:
    "TOPPACK fabrique et vend des cartons ondulés de haute qualité — simple cannelure, double cannelure, enveloppes d'expédition et emballages personnalisés.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
