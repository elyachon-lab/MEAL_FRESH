import React from "react";
import { format } from "date-fns";
import { getMonthlyBudget } from "../actions/budget";
import BudgetUI from "@/components/BudgetUI";

export const metadata = {
  title: "Budget du Mois — MealFresh",
  description: "Suivez vos dépenses de courses par semaine, votre reste à dépenser et la répartition par enseigne.",
};

export default async function BudgetPage() {
  const currentMonthStr = format(new Date(), "yyyy-MM");
  const budget = await getMonthlyBudget(currentMonthStr);

  // Formater les dates des dépenses pour transmission au client
  const formattedBudget = {
    ...budget,
    expenses: budget.expenses.map((e) => ({
      ...e,
      date: e.date.toISOString(),
    })),
  };

  return <BudgetUI budget={formattedBudget} />;
}
