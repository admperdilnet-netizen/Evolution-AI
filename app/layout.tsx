import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evolution AI — Tu estudio audiovisual",
  description: "Explora Evolution AI sin registro ni inicio de sesión."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
