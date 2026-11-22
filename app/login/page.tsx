import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/");
  return (
    <main className="login-shell">
      <div className="login-card">
        <div className="brand-mark login-mark">E</div>
        <div className="login-eyebrow">EVOLUTION AI</div>
        <h1>Tu estudio de creación audiovisual</h1>
        <p>Inicia sesión para entrar a tu espacio y conectar tus propias cuentas de generación.</p>
        <LoginForm />
        <small>Evolution AI no solicita ni almacena tu contraseña de Google.</small>
      </div>
    </main>
  );
}