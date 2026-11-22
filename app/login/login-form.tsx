"use client";

import { signIn } from "next-auth/react";

export default function LoginForm() {
  return (
    <button className="google-login" onClick={() => signIn("google", { callbackUrl: "/" })}>
      <span className="google-g">G</span>
      Continuar con Google
    </button>
  );
}