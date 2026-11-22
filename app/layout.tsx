import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evolution AI — Crea videos con inteligencia artificial",
  description: "Convierte tus ideas en videos cinematográficos con Evolution AI."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
