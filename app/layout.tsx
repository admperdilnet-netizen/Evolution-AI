import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evolution AI — Tu estudio audiovisual",
  description: "Accede con Google y conecta tus propias cuentas de creación audiovisual."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
