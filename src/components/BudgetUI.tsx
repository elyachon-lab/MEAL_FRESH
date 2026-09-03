"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { updateBudgetAmount, addExpense, deleteExpense } from "../app/actions/budget";

type ExpenseItem = {
  id: string;
  date: Date | string;
  amount: number;
  category: string;
  description: string | null;
};

type MonthlyBudgetType = {
  id: string;
  month: string;
  amount: number;
  expenses: ExpenseItem[];
};

type BudgetUIProps = {
  budget: MonthlyBudgetType;
};

const CATEGORIES = [
  { id: "Supermarché", label: "Supermarché", icon: "🛒", color: "#FF7A21" },
  { id: "Marché", label: "Marché local", icon: "🧺", color: "#79D880" },
  { id: "Boucherie", label: "Boucherie / Poissonnerie", icon: "🥩", color: "#E53E3E" },
  { id: "Boulangerie", label: "Boulangerie", icon: "🥖", color: "#FFD45C" },
  { id: "Épicerie", label: "Épicerie bio / Vrac", icon: "🥑", color: "#319795" },
  { id: "Autre", label: "Autre / Restauration", icon: "🧾", color: "#805AD5" },
];

export default function BudgetUI({ budget }: BudgetUIProps) {
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetAmountInput, setBudgetAmountInput] = useState(budget.amount.toString());
  const [isPending, startTransition] = useTransition();

  // Saisie nouvelle dépense
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [expenseDate, setExpenseDate] = useState(todayStr);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Supermarché");
  const [expenseDescription, setExpenseDescription] = useState("");

  // Calculs financiers
  const totalSpent = budget.expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const remainingBudget = budget.amount - totalSpent;
  const percentageSpent = budget.amount > 0 ? Math.min(Math.round((totalSpent / budget.amount) * 100), 100) : 0;

  // Répartition par catégorie
  const categoryTotals = CATEGORIES.map((cat) => {
    const sum = budget.expenses
      .filter((e) => e.category === cat.id)
      .reduce((acc, curr) => acc + curr.amount, 0);
    const pct = totalSpent > 0 ? (sum / totalSpent) * 100 : 0;
    return { ...cat, total: sum, percentage: pct };
  }).filter((c) => c.total > 0 || true);

  // Groupement par semaines
  const weekGroups: { [key: string]: { label: string; total: number; expenses: ExpenseItem[] } } = {
    "S1": { label: "Semaine 1 (1-7)", total: 0, expenses: [] },
    "S2": { label: "Semaine 2 (8-14)", total: 0, expenses: [] },
    "S3": { label: "Semaine 3 (15-21)", total: 0, expenses: [] },
    "S4": { label: "Semaine 4 (22-28)", total: 0, expenses: [] },
    "S5": { label: "Semaine 5 (29+)", total: 0, expenses: [] },
  };

  budget.expenses.forEach((item) => {
    const d = new Date(item.date);
    const dayNum = d.getDate();
    let weekKey = "S1";
    if (dayNum > 28) weekKey = "S5";
    else if (dayNum > 21) weekKey = "S4";
    else if (dayNum > 14) weekKey = "S3";
    else if (dayNum > 7) weekKey = "S2";

    weekGroups[weekKey].total += item.amount;
    weekGroups[weekKey].expenses.push(item);
  });

  const handleUpdateBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(budgetAmountInput);
    if (!isNaN(val) && val >= 0) {
      startTransition(async () => {
        await updateBudgetAmount(budget.month, val);
        setIsEditingBudget(false);
      });
    }
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expenseAmount);
    if (isNaN(amt) || amt <= 0) return;

    startTransition(async () => {
      await addExpense({
        monthStr: budget.month,
        dateStr: expenseDate,
        amount: amt,
        category: expenseCategory,
        description: expenseDescription,
      });

      setExpenseAmount("");
      setExpenseDescription("");
    });
  };

  const handleDeleteExpense = (id: string) => {
    startTransition(async () => {
      await deleteExpense(id);
    });
  };

  const currentMonthDate = parseISO(`${budget.month}-01`);
  const monthTitle = format(currentMonthDate, "MMMM yyyy", { locale: fr });

  return (
    <div className="budget-dashboard" style={{ opacity: isPending ? 0.8 : 1 }}>
      
      {/* ── En-tête du Budget ── */}
      <div className="budget-header-card card">
        <div className="budget-header-main" style={{ alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div className="badge badge-accent mb-1">🧮 Économe sans pépin</div>
            <h1>Budget du Mois — <span style={{ textTransform: "capitalize" }}>{monthTitle}</span></h1>
            <p className="text-secondary text-sm">
              Gérez vos dépenses de courses, suivez votre reste à dépenser et analysez vos habitudes par semaine.
            </p>
          </div>

          <div className="budget-edit-box">

            <span className="text-xs text-muted">Budget Global Prévu</span>
            {isEditingBudget ? (
              <form onSubmit={handleUpdateBudget} className="budget-inline-form">
                <input
                  type="number"
                  step="0.01"
                  className="input-field input-sm"
                  value={budgetAmountInput}
                  onChange={(e) => setBudgetAmountInput(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>Valider</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsEditingBudget(false)} disabled={isPending}>✕</button>
              </form>
            ) : (
              <div className="budget-amount-display">
                <span className="amount-number">{budget.amount.toFixed(2)} €</span>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setIsEditingBudget(true)}>
                  ✏️ Modifier
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Cartes d'Indicateurs Clés (KPI) ── */}
      <div className="kpi-grid">
        <div className="card kpi-card">
          <div className="kpi-icon">💶</div>
          <div className="kpi-content">
            <span className="kpi-label">Budget Prévu</span>
            <span className="kpi-value">{budget.amount.toFixed(2)} €</span>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon">🛒</div>
          <div className="kpi-content">
            <span className="kpi-label">Total Dépensé</span>
            <span className="kpi-value text-orange">{totalSpent.toFixed(2)} €</span>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon">✨</div>
          <div className="kpi-content">
            <span className="kpi-label">Reste à Dépenser</span>
            <span className={`kpi-value ${remainingBudget < 0 ? 'text-danger' : 'text-accent'}`}>
              {remainingBudget.toFixed(2)} €
            </span>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon">📊</div>
          <div className="kpi-content" style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
              <span className="kpi-label">Consommé</span>
              <span className="fw-700 text-sm">{percentageSpent}%</span>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${percentageSpent}%`,
                  backgroundColor: percentageSpent > 90 ? "var(--danger)" : "var(--primary)"
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section Graphiques & Saisie ── */}
      <div className="budget-body-grid">
        
        {/* Colonne Gauche : Formulaire Saisie + Tracker Hebdo */}
        <div className="budget-left-col">
          
          {/* Formulaire de saisie rapide */}
          <div className="card panel">
            <h3 style={{ marginBottom: "1rem" }}>➕ Ajouter une Dépense</h3>

            <form onSubmit={handleAddExpense}>
              <div className="input-group">
                <label className="input-label">Montant (€)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 45.50"
                  className="input-field"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Catégorie / Enseigne</label>
                <select
                  className="input-field"
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Note / Magasin (Optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: Carrefour, Marché bio..."
                  className="input-field"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", marginTop: "0.5rem" }}
                disabled={isPending}
              >
                {isPending ? "Enregistrement..." : "Enregistrer la dépense"}
              </button>
            </form>
          </div>

          {/* Tracker par Semaine */}
          <div className="card panel">
            <h3>📅 Suivi Hebdomadaire</h3>
            <p className="text-xs text-muted" style={{ marginBottom: "1rem" }}>
              Objectif moyen indicatif : {(budget.amount / 4).toFixed(2)} € / semaine
            </p>

            <div className="weekly-tracker-list">
              {Object.entries(weekGroups).map(([key, data]) => {
                const targetWeekly = budget.amount / 4;
                const ratio = targetWeekly > 0 ? Math.min((data.total / targetWeekly) * 100, 100) : 0;

                return (
                  <div key={key} className="weekly-tracker-item">
                    <div className="weekly-item-header">
                      <span className="fw-600 text-sm">{data.label}</span>
                      <span className="fw-700 text-sm">{data.total.toFixed(2)} €</span>
                    </div>
                    <div className="progress-bar-bg" style={{ height: "6px" }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${ratio}%`,
                          backgroundColor: data.total > targetWeekly ? "var(--danger)" : "var(--accent)"
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Colonne Droite : Graphiques Visualisation + Historique */}
        <div className="budget-right-col">
          
          {/* Visualisations Graphiques SVG */}
          <div className="card panel">
            <h3>📈 Analyse & Répartition des Dépenses</h3>
            
            <div className="charts-flex-container">
              
              {/* Jauge Donut SVG Budget Restant */}
              <div className="donut-chart-box">
                <svg viewBox="0 0 160 160" className="donut-svg">
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    fill="transparent"
                    stroke="var(--border)"
                    strokeWidth="16"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    fill="transparent"
                    stroke={percentageSpent >= 100 ? "var(--danger)" : "var(--primary)"}
                    strokeWidth="16"
                    strokeDasharray={`${(percentageSpent * 377) / 100} 377`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    transform="rotate(-90 80 80)"
                    style={{ transition: "stroke-dasharray 0.6s ease" }}
                  />
                </svg>
                <div className="donut-center-text">
                  <span className="donut-pct">{percentageSpent}%</span>
                  <span className="donut-sub">Consommé</span>
                </div>
              </div>

              {/* Barres de répartition par Catégorie */}
              <div className="category-bars-box">
                {categoryTotals.map((cat) => (
                  <div key={cat.id} className="category-bar-row">
                    <div className="category-bar-info">
                      <span className="text-sm">
                        {cat.icon} {cat.label}
                      </span>
                      <span className="fw-600 text-sm">
                        {cat.total.toFixed(2)} € ({Math.round(cat.percentage)}%)
                      </span>
                    </div>
                    <div className="progress-bar-bg" style={{ height: "8px" }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Tableau des Dépenses Récentes */}
          <div className="card panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3>🧾 Historique des Dépenses</h3>
              <span className="badge">{budget.expenses.length} opérations</span>
            </div>

            {budget.expenses.length === 0 ? (
              <p className="text-muted text-sm text-center" style={{ padding: "2rem 0" }}>
                Aucune dépense enregistrée pour le moment.
              </p>
            ) : (
              <div className="expenses-table-wrapper">
                <table className="expenses-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Catégorie</th>
                      <th>Note / Enseigne</th>
                      <th style={{ textAlign: "right" }}>Montant</th>
                      <th style={{ width: "40px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {budget.expenses.map((expense) => {
                      const catInfo = CATEGORIES.find((c) => c.id === expense.category);
                      return (
                        <tr key={expense.id}>
                          <td>
                            <span className="text-sm fw-500">
                              {format(new Date(expense.date), "dd/MM/yyyy")}
                            </span>
                          </td>
                          <td>
                            <span className="chip" style={{ fontSize: "0.75rem" }}>
                              {catInfo?.icon || "🛒"} {expense.category}
                            </span>
                          </td>
                          <td>
                            <span className="text-sm text-secondary">
                              {expense.description || "—"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <strong className="text-orange">{expense.amount.toFixed(2)} €</strong>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              title="Supprimer"
                              onClick={() => handleDeleteExpense(expense.id)}
                              disabled={isPending}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
