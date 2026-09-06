import type { Metadata } from "next";

import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Connexion — Meal Fresh",
  description: "Connectez-vous pour retrouver vos recettes, votre planning et votre budget.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const { redirectTo, error } = await searchParams;
  const target = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        background: "linear-gradient(135deg, #FFF2EA 0%, #D9F4E8 100%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <span style={{ fontSize: "2.75rem", lineHeight: 1 }}>🍊</span>
          <h1 style={{ margin: "0.75rem 0 0.5rem", fontSize: "1.75rem" }}>Meal Fresh</h1>
          <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.95rem" }}>
            Vos recettes, votre planning et votre budget — retrouvés sur tous vos appareils.
          </p>
        </div>

        <div className="card panel" style={{ padding: "1.75rem" }}>
          <AuthForm redirectTo={target} initialError={error} />
        </div>
      </div>
    </main>
  );
}
