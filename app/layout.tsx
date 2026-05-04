import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: { default: "TOPPACK — Corrugated Cardboard Boxes", template: "%s | TOPPACK" },
  description:
    "TOPPACK manufactures and sells high-quality corrugated cardboard boxes — single wall, double wall, mailer and custom printed packaging.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
