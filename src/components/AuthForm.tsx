"use client";

import { useActionState, useState } from "react";

import { signIn, signUp, type AuthState } from "../app/actions/auth";

type Mode = "signin" | "signup";

export default function AuthForm({
  redirectTo,
  initialError,
}: {
  redirectTo: string;
  initialError?: string;
}) {
  const [mode, setMode] = useState<Mode>("signin");

  const [signInState, signInAction, signInPending] = useActionState<AuthState, FormData>(
    signIn,
    undefined,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState<AuthState, FormData>(
    signUp,
    undefined,
  );

  const isSignUp = mode === "signup";
  const state = isSignUp ? signUpState : signInState;
  const pending = isSignUp ? signUpPending : signInPending;
  const error = state?.error ?? (mode === "signin" ? initialError : undefined);
  const notice = state?.notice;

  const tabStyle = (active: boolean) => ({
    flex: 1,
    padding: "0.7rem 1rem",
    border: "none",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontFamily: "Fredoka, sans-serif",
    fontWeight: 600,
    fontSize: "0.95rem",
    background: active ? "#FFFFFF" : "transparent",
    color: active ? "var(--primary)" : "var(--text-secondary)",
    boxShadow: active ? "var(--shadow-xs)" : "none",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div
        style={{
          display: "flex",
          gap: "0.35rem",
          padding: "0.35rem",
          background: "var(--surface-hover)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <button type="button" onClick={() => setMode("signin")} style={tabStyle(!isSignUp)}>
          Connexion
        </button>
        <button type="button" onClick={() => setMode("signup")} style={tabStyle(isSignUp)}>
          Créer un compte
        </button>
      </div>

      {error && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-md)",
            background: "#fee2e2",
            color: "var(--danger, #b91c1c)",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </p>
      )}

      {notice && (
        <p
          role="status"
          style={{
            margin: 0,
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-md)",
            background: "var(--accent-light)",
            color: "var(--accent)",
            fontSize: "0.875rem",
          }}
        >
          ✉️ {notice}
        </p>
      )}

      <form
        action={isSignUp ? signUpAction : signInAction}
        key={mode}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label" htmlFor="auth-email">
            Adresse email
          </label>
          <input
            id="auth-email"
            className="input-field"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="vous@exemple.fr"
          />
        </div>

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label" htmlFor="auth-password">
            Mot de passe
          </label>
          <input
            id="auth-password"
            className="input-field"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            minLength={6}
            placeholder="••••••••"
          />
          {isSignUp && (
            <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              6 caractères minimum.
            </span>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending}
          style={{ padding: "0.875rem", width: "100%", marginTop: "0.25rem" }}
        >
          {pending
            ? "Un instant…"
            : isSignUp
              ? "🍊 Créer mon compte"
              : "🔑 Se connecter"}
        </button>
      </form>
    </div>
  );
}
