"use server";

import prisma, { ensureDatabaseSchema } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function toPlainObject<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export async function getMonthlyBudget(monthStr: string) {
  try {
    await ensureDatabaseSchema();
    let budget = await prisma.monthlyBudget.findUnique({
      where: { month: monthStr },
      include: {
        expenses: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!budget) {
      budget = await prisma.monthlyBudget.create({
        data: {
          month: monthStr,
          amount: 400,
        },
        include: {
          expenses: true,
        },
      });
    }

    return toPlainObject(budget);
  } catch (err: any) {
    console.error("Error in getMonthlyBudget:", err);
    return {
      id: "default",
      month: monthStr,
      amount: 400,
      expenses: []
    };
  }
}

export async function updateBudgetAmount(monthStr: string, newAmount: number) {
  try {
    await ensureDatabaseSchema();
    if (isNaN(newAmount) || newAmount < 0) return { success: false, error: "Montant invalide." };

    await prisma.monthlyBudget.upsert({
      where: { month: monthStr },
      update: { amount: newAmount },
      create: { month: monthStr, amount: newAmount },
    });

    revalidatePath("/budget");
    return { success: true };
  } catch (err: any) {
    console.error("Error in updateBudgetAmount:", err);
    return { success: false, error: err?.message || "Erreur de mise à jour du budget." };
  }
}

export async function addExpense(data: {
  id?: string;
  monthStr: string;
  dateStr: string;
  amount: number;
  category: string;
  description?: string;
}) {
  try {
    await ensureDatabaseSchema();
    if (!data.amount || data.amount <= 0 || !data.category) {
      return { success: false, error: "Montant et catégorie requis." };
    }

    const budget = await getMonthlyBudget(data.monthStr);

    await prisma.expense.create({
      data: {
        ...(data.id ? { id: data.id } : {}),
        monthlyBudgetId: budget.id,
        date: new Date(data.dateStr),
        amount: data.amount,
        category: data.category,
        description: data.description || "",
      },
    });

    revalidatePath("/budget");
    return { success: true };
  } catch (err: any) {
    console.error("Error in addExpense:", err);
    return { success: false, error: err?.message || "Erreur lors de l'ajout de la dépense." };
  }
}

export async function deleteExpense(expenseId: string) {
  try {
    await ensureDatabaseSchema();
    await prisma.expense.delete({
      where: { id: expenseId },
    });

    revalidatePath("/budget");
    return { success: true };
  } catch (err: any) {
    console.error("Error in deleteExpense:", err);
    return { success: false, error: err?.message || "Erreur lors de la suppression." };
  }
}
