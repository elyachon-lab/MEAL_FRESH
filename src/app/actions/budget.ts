"use server";

import { revalidatePath } from "next/cache";

import { requireSession, isRedirectError } from "@/lib/dal";
import { mapExpense, toDateKey } from "@/lib/mappers";

const DEFAULT_BUDGET = 400;
const MONTH_RE = /^\d{4}-\d{2}$/;

/**
 * Budget d'un mois et ses dépenses. Le budget est créé à la volée la première
 * fois qu'un mois est consulté.
 */
export async function getMonthlyBudget(monthStr: string) {
  const empty = { id: "", month: monthStr, amount: DEFAULT_BUDGET, expenses: [] as any[] };
  if (!MONTH_RE.test(monthStr)) return empty;

  try {
    const { supabase, user } = await requireSession();
    if (!user || !supabase) return empty;

    const select = "id, month, amount, expenses ( id, date, amount, category, description )";

    const existing = await supabase
      .from("monthly_budgets")
      .select(select)
      .eq("user_id", user.id)
      .eq("month", monthStr)
      .maybeSingle();

    if (existing.error) throw new Error(existing.error.message);

    let row: any = existing.data;

    if (!row) {
      const created = await supabase
        .from("monthly_budgets")
        .upsert(
          { user_id: user.id, month: monthStr, amount: DEFAULT_BUDGET },
          { onConflict: "user_id,month", ignoreDuplicates: true },
        )
        .select(select)
        .maybeSingle();

      if (created.error) throw new Error(created.error.message);

      // ignoreDuplicates ne renvoie rien si la ligne existait déjà.
      row =
        created.data ??
        (
          await supabase
            .from("monthly_budgets")
            .select(select)
            .eq("user_id", user.id)
            .eq("month", monthStr)
            .maybeSingle()
        ).data;
    }

    if (!row) return empty;

    const expenses = (row.expenses ?? [])
      .map(mapExpense)
      .sort((a: any, b: any) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    return { id: row.id, month: row.month, amount: Number(row.amount), expenses };
  } catch (err: any) {
    if (isRedirectError(err)) throw err;
    console.error("getMonthlyBudget:", err?.message ?? err);
    return empty;
  }
}

export async function updateBudgetAmount(monthStr: string, newAmount: number) {
  if (!MONTH_RE.test(monthStr)) return { success: false as const, error: "Mois invalide." };
  if (!Number.isFinite(newAmount) || newAmount < 0) {
    return { success: false as const, error: "Montant invalide." };
  }

  try {
    const { supabase, user } = await requireSession();
    if (!user || !supabase) return { success: false as const, error: "Non connecté." };

    const { error } = await supabase
      .from("monthly_budgets")
      .upsert(
        { user_id: user.id, month: monthStr, amount: newAmount },
        { onConflict: "user_id,month" },
      );

    if (error) throw new Error(error.message);

    revalidatePath("/budget");
    return { success: true as const };
  } catch (err: any) {
    if (isRedirectError(err)) throw err;
    console.error("updateBudgetAmount:", err?.message ?? err);
    return { success: false as const, error: err?.message || "Erreur de mise à jour du budget." };
  }
}

export async function addExpense(data: {
  monthStr: string;
  dateStr: string;
  amount: number;
  category: string;
  description?: string;
}) {
  if (!Number.isFinite(data.amount) || data.amount <= 0 || !data.category) {
    return { success: false as const, error: "Montant et catégorie requis." };
  }

  try {
    const { supabase, user } = await requireSession();
    if (!user || !supabase) return { success: false as const, error: "Non connecté." };

    const budget = await getMonthlyBudget(data.monthStr);
    if (!budget.id) throw new Error("Budget du mois introuvable.");

    const { data: created, error } = await supabase
      .from("expenses")
      .insert({
        user_id: user.id,
        monthly_budget_id: budget.id,
        date: toDateKey(data.dateStr),
        amount: data.amount,
        category: data.category,
        description: data.description?.trim() || null,
      })
      .select("id, date, amount, category, description")
      .single();

    if (error) throw new Error(error.message);

    revalidatePath("/budget");
    return { success: true as const, expense: mapExpense(created) };
  } catch (err: any) {
    if (isRedirectError(err)) throw err;
    console.error("addExpense:", err?.message ?? err);
    return { success: false as const, error: err?.message || "Erreur lors de l'ajout de la dépense." };
  }
}

export async function updateExpense(data: {
  id: string;
  dateStr: string;
  amount: number;
  category: string;
  description?: string;
}) {
  if (!data.id) return { success: false as const, error: "Identifiant de la dépense invalide." };
  if (!Number.isFinite(data.amount) || data.amount <= 0 || !data.category) {
    return { success: false as const, error: "Montant et catégorie requis." };
  }

  try {
    const { supabase } = await requireSession();

    const { data: updated, error } = await supabase
      .from("expenses")
      .update({
        date: toDateKey(data.dateStr),
        amount: data.amount,
        category: data.category,
        description: data.description?.trim() || null,
      })
      .eq("id", data.id)
      .select("id, date, amount, category, description")
      .single();

    if (error) throw new Error(error.message);

    revalidatePath("/budget");
    return { success: true as const, expense: mapExpense(updated) };
  } catch (err: any) {
    if (isRedirectError(err)) throw err;
    console.error("updateExpense:", err?.message ?? err);
    return { success: false as const, error: err?.message || "Erreur lors de la modification de la dépense." };
  }
}

export async function deleteExpense(expenseId: string) {
  try {
    const { supabase } = await requireSession();
    const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
    if (error) throw new Error(error.message);

    revalidatePath("/budget");
    return { success: true as const };
  } catch (err: any) {
    if (isRedirectError(err)) throw err;
    console.error("deleteExpense:", err?.message ?? err);
    return { success: false as const, error: err?.message || "Erreur lors de la suppression." };
  }
}
