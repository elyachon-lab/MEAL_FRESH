"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; notice?: string } | undefined;

/** Empêche une redirection ouverte vers un domaine externe. */
function safeRedirect(target: string) {
  if (!target.startsWith("/") || target.startsWith("//")) return "/";
  return target;
}

function translateAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou mot de passe incorrect.";
  if (m.includes("email not confirmed")) return "Adresse email non confirmée. Vérifiez votre boîte de réception.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Un compte existe déjà avec cette adresse email.";
  if (m.includes("password should be at least"))
    return "Le mot de passe doit contenir au moins 6 caractères.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Trop de tentatives. Réessayez dans quelques minutes.";
  return message;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const target = safeRedirect(String(formData.get("redirectTo") ?? "/") || "/");

  if (!email || !password) {
    return { error: "Renseignez votre email et votre mot de passe." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: translateAuthError(error.message) };

  revalidatePath("/", "layout");
  redirect(target);
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const target = safeRedirect(String(formData.get("redirectTo") ?? "/") || "/");

  if (!email || !password) {
    return { error: "Renseignez votre email et votre mot de passe." };
  }
  if (password.length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères." };
  }

  const origin = (await headers()).get("origin") ?? "";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: origin ? { emailRedirectTo: `${origin}/auth/confirm` } : undefined,
  });

  if (error) return { error: translateAuthError(error.message) };

  // Si la confirmation par email est désactivée, la session est déjà ouverte.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(target);
  }

  return {
    notice:
      "Compte créé. Ouvrez le lien de confirmation envoyé par email pour activer votre accès.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
