import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Skandia · Planner",
  description: "Tu equipo, en la misma página.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
