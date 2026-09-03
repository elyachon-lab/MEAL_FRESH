"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function toPlainObject<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export async function getMonthlyBudget(monthStr: string) {
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
        amount: 400, // Budget par défaut initial de 400€
      },
      include: {
        expenses: true,
      },
    });
  }

  return toPlainObject(budget);
}

export async function updateBudgetAmount(monthStr: string, newAmount: number) {
  if (isNaN(newAmount) || newAmount < 0) return { success: false };

  await prisma.monthlyBudget.upsert({
    where: { month: monthStr },
    update: { amount: newAmount },
    create: { month: monthStr, amount: newAmount },
  });

  revalidatePath("/budget");
  return { success: true };
}

export async function addExpense(data: {
  monthStr: string;
  dateStr: string;
  amount: number;
  category: string;
  description?: string;
}) {
  if (!data.amount || data.amount <= 0 || !data.category) return { success: false };

  const budget = await getMonthlyBudget(data.monthStr);

  await prisma.expense.create({
    data: {
      monthlyBudgetId: budget.id,
      date: new Date(data.dateStr),
      amount: data.amount,
      category: data.category,
      description: data.description || "",
    },
  });

  revalidatePath("/budget");
  return { success: true };
}

export async function deleteExpense(expenseId: string) {
  await prisma.expense.delete({
    where: { id: expenseId },
  });

  revalidatePath("/budget");
  return { success: true };
}
