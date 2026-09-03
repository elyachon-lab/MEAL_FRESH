"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { format, parseISO, addMonths, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { updateBudgetAmount, addExpense, deleteExpense } from "../app/actions/budget";
import {
  mergeExpenses,
  saveLocalExpense,
  removeLocalExpense,
  getLocalBudgetAmount,
  saveLocalBudgetAmount
} from "../lib/storage";

type ExpenseItem = {
  id: string;
  date: Date | string;
  amount: number;
  category: string;
  description: string | null;
  monthStr?: string;
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

export default function BudgetUI({ budget: initialBudget }: BudgetUIProps) {
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(
    parseISO(`${initialBudget.month}-01`)
  );
  
  const currentMonthStr = format(currentMonthDate, "yyyy-MM");

  // Budget global du mois
  const [budgetAmount, setBudgetAmount] = useState<number>(
    getLocalBudgetAmount(currentMonthStr, initialBudget.amount)
  );

  // Liste des dépenses cumulées du mois (Persistées sans doublons)
  const [expenses, setExpenses] = useState<ExpenseItem[]>(
    mergeExpenses(initialBudget.expenses, currentMonthStr)
  );

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetAmountInput, setBudgetAmountInput] = useState(budgetAmount.toString());
  const [isPending, startTransition] = useTransition();

  // Champs de création de dépense
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [expenseDate, setExpenseDate] = useState(todayStr);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Supermarché");
  const [expenseDescription, setExpenseDescription] = useState("");

  // Recharger lors des changements de mois ou de données
  useEffect(() => {
    setBudgetAmount(getLocalBudgetAmount(currentMonthStr, initialBudget.amount));
    setExpenses(mergeExpenses(initialBudget.expenses, currentMonthStr));
  }, [currentMonthStr, initialBudget]);

  // CALCULS FINANCIERS CUMULÉS DU MOIS
  const totalSpent = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
  }, [expenses]);

  const remainingBudget = budgetAmount - totalSpent;
  const percentageSpent = budgetAmount > 0 ? Math.min(Math.round((totalSpent / budgetAmount) * 100), 100) : 0;

  // Répartition par catégorie
  const categoryTotals = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const sum = expenses
        .filter((e) => e.category === cat.id)
        .reduce((acc, curr) => acc + Number(curr.amount), 0);
      const pct = totalSpent > 0 ? (sum / totalSpent) * 100 : 0;
      return { ...cat, total: sum, percentage: pct };
    });
  }, [expenses, totalSpent]);

  // Groupement par semaines (S1 à S5)
  const weekGroups = useMemo(() => {
    const groups: { [key: string]: { label: string; total: number; expenses: ExpenseItem[] } } = {
      "S1": { label: "Semaine 1 (1-7)", total: 0, expenses: [] },
      "S2": { label: "Semaine 2 (8-14)", total: 0, expenses: [] },
      "S3": { label: "Semaine 3 (15-21)", total: 0, expenses: [] },
      "S4": { label: "Semaine 4 (22-28)", total: 0, expenses: [] },
      "S5": { label: "Semaine 5 (29+)", total: 0, expenses: [] },
    };

    expenses.forEach((item) => {
      const d = new Date(item.date);
      const dayNum = d.getDate();
      let weekKey = "S1";
      if (dayNum > 28) weekKey = "S5";
      else if (dayNum > 21) weekKey = "S4";
      else if (dayNum > 14) weekKey = "S3";
      else if (dayNum > 7) weekKey = "S2";

      groups[weekKey].total += Number(item.amount);
      groups[weekKey].expenses.push(item);
    });

    return groups;
  }, [expenses]);

  // Mise à jour du montant du budget global
  const handleUpdateBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(budgetAmountInput);
    if (!isNaN(val) && val >= 0) {
      setBudgetAmount(val);
      saveLocalBudgetAmount(currentMonthStr, val);
      setIsEditingBudget(false);

      startTransition(async () => {
        await updateBudgetAmount(currentMonthStr, val);
      });
    }
  };

  // AJOUT D'UNE DÉPENSE (SANS DOUBLON FOIS DEUX)
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return; // Bloquer les soumissions multiples accidentelles

    const amt = parseFloat(expenseAmount);
    if (isNaN(amt) || amt <= 0) return;

    // Identifiant unique partagé client + serveur
    const expenseId = "exp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);

    const newExpenseObj = {
      id: expenseId,
      date: expenseDate,
      amount: amt,
      category: expenseCategory,
      description: expenseDescription || null,
      monthStr: currentMonthStr,
    };

    // 1. Sauvegarde locale unique
    saveLocalExpense(newExpenseObj);
    setExpenses(prev => [newExpenseObj, ...prev.filter(e => e.id !== expenseId)]);

    setExpenseAmount("");
    setExpenseDescription("");

    // 2. Synchronisation serveur avec l'ID identique
    startTransition(async () => {
      await addExpense({
        id: expenseId,
        monthStr: currentMonthStr,
        dateStr: expenseDate,
        amount: amt,
        category: expenseCategory,
        description: expenseDescription,
      });
    });
  };

  // SUPPRESSION D'UNE DÉPENSE
  const handleDeleteExpense = (id: string) => {
    removeLocalExpense(id);
    setExpenses(prev => prev.filter(e => e.id !== id));

    startTransition(async () => {
      await deleteExpense(id);
    });
  };

  const monthTitle = format(currentMonthDate, "MMMM yyyy", { locale: fr });

  return (
    <div className="budget-dashboard" style={{ opacity: isPending ? 0.9 : 1 }}>
      
      {/* ── En-tête du Budget & Navigation par Mois ── */}
      <div className="budget-header-card card" style={{ padding: "1.5rem" }}>
        <div className="budget-header-main" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ flex: 1 }}>
            <div className="badge badge-accent mb-1">🧮 Suivi Financier & Cumul</div>
            <h1 style={{ textTransform: "capitalize", margin: ".25rem 0" }}>Budget du Mois — {monthTitle}</h1>
            <p className="text-secondary text-sm" style={{ margin: 0 }}>
              Toutes vos dépenses s'additionnent automatiquement et restent enregistrées tout au long du mois.
            </p>
          </div>

          {/* ── BARRE DE NAVIGATION PAR MOIS (◀ Mois Précédent | Mois Suivant ▶) ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--surface-hover)", padding: "0.5rem 0.85rem", borderRadius: "999px", border: "1px solid var(--border)" }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ fontWeight: 700, fontSize: "0.9rem" }}
              onClick={() => setCurrentMonthDate(prev => subMonths(prev, 1))}
              title="Mois précédent"
            >
              ◀ Mois Précédent
            </button>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ padding: "0.25rem 0.75rem", fontSize: "0.8rem", background: "white" }}
              onClick={() => setCurrentMonthDate(new Date())}
              title="Mois en cours"
            >
              Ce mois-ci
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ fontWeight: 700, fontSize: "0.9rem" }}
              onClick={() => setCurrentMonthDate(prev => addMonths(prev, 1))}
              title="Mois suivant"
            >
              Mois Suivant ▶
            </button>
          </div>

          {/* Édition du budget global */}
          <div className="budget-edit-box" style={{ background: "var(--bg)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
            <span className="text-xs text-muted" style={{ display: "block" }}>Budget Prévu ({monthTitle})</span>
            {isEditingBudget ? (
              <form onSubmit={handleUpdateBudget} className="budget-inline-form" style={{ display: "flex", gap: "0.4rem", marginTop: "0.25rem" }}>
                <input
                  type="number"
                  step="0.01"
                  className="input-field input-sm"
                  style={{ width: "100px" }}
                  value={budgetAmountInput}
                  onChange={(e) => setBudgetAmountInput(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>OK</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsEditingBudget(false)}>✕</button>
              </form>
            ) : (
              <div className="budget-amount-display" style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.2rem" }}>
                <span className="amount-number" style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--primary)" }}>{budgetAmount.toFixed(2)} €</span>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => { setBudgetAmountInput(budgetAmount.toString()); setIsEditingBudget(true); }}>
                  ✏️ Modifier
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Cartes d'Indicateurs Clés (KPI Cumulés en Temps Réel) ── */}
      <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", margin: "1.5rem 0" }}>
        <div className="card kpi-card" style={{ padding: "1.25rem" }}>
          <div className="kpi-icon" style={{ fontSize: "2rem" }}>💶</div>
          <div className="kpi-content">
            <span className="kpi-label" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Budget Total du Mois</span>
            <span className="kpi-value" style={{ fontSize: "1.4rem", fontWeight: 800 }}>{budgetAmount.toFixed(2)} €</span>
          </div>
        </div>

        <div className="card kpi-card" style={{ padding: "1.25rem" }}>
          <div className="kpi-icon" style={{ fontSize: "2rem" }}>🛒</div>
          <div className="kpi-content">
            <span className="kpi-label" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Total Dépenses Additionnées</span>
            <span className="kpi-value text-orange" style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--primary)" }}>{totalSpent.toFixed(2)} €</span>
          </div>
        </div>

        <div className="card kpi-card" style={{ padding: "1.25rem" }}>
          <div className="kpi-icon" style={{ fontSize: "2rem" }}>✨</div>
          <div className="kpi-content">
            <span className="kpi-label" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Reste à Dépenser</span>
            <span className={`kpi-value ${remainingBudget < 0 ? 'text-danger' : 'text-accent'}`} style={{ fontSize: "1.4rem", fontWeight: 800 }}>
              {remainingBudget.toFixed(2)} €
            </span>
          </div>
        </div>

        <div className="card kpi-card" style={{ padding: "1.25rem" }}>
          <div className="kpi-icon" style={{ fontSize: "2rem" }}>📊</div>
          <div className="kpi-content" style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
              <span className="kpi-label" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Consommé</span>
              <span className="fw-700 text-sm">{percentageSpent}%</span>
            </div>
            <div className="progress-bar-bg" style={{ background: "var(--border)", borderRadius: "999px", height: "8px", overflow: "hidden" }}>
              <div
                className="progress-bar-fill"
                style={{
                  height: "100%",
                  width: `${percentageSpent}%`,
                  backgroundColor: percentageSpent > 90 ? "var(--danger)" : "var(--primary)",
                  transition: "width 0.4s ease"
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section Saisie & Historique des Dépenses ── */}
      <div className="budget-body-grid" style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "1.5rem", alignItems: "start" }}>
        
        {/* Colonne Gauche : Formulaire de Saisie d'une Dépense */}
        <div className="budget-left-col" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          <div className="card panel" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>➕ Ajouter une Dépense (Additionnée)</h3>

            <form onSubmit={handleAddExpense} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontSize: "0.85rem" }}>Montant (€) *</label>
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

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontSize: "0.85rem" }}>Catégorie / Magasin</label>
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

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontSize: "0.85rem" }}>Date de l'achat</label>
                <input
                  type="date"
                  className="input-field"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontSize: "0.85rem" }}>Note / Enseigne (Optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: Carrefour, Auchan, Marché..."
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
                {isPending ? "Enregistrement..." : "➕ Ajouter à la somme du mois"}
              </button>
            </form>
          </div>

          {/* Tracker Hebdomadaire */}
          <div className="card panel" style={{ padding: "1.25rem" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "0.35rem" }}>📅 Cumul par Semaine</h3>
            <p className="text-xs text-muted" style={{ marginBottom: "1rem" }}>
              Objectif hebdo : {(budgetAmount / 4).toFixed(2)} €
            </p>

            <div className="weekly-tracker-list" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {Object.entries(weekGroups).map(([key, data]) => {
                const targetWeekly = budgetAmount / 4;
                const ratio = targetWeekly > 0 ? Math.min((data.total / targetWeekly) * 100, 100) : 0;

                return (
                  <div key={key} className="weekly-tracker-item">
                    <div className="weekly-item-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <span className="fw-600 text-sm">{data.label}</span>
                      <span className="fw-700 text-sm">{data.total.toFixed(2)} €</span>
                    </div>
                    <div className="progress-bar-bg" style={{ height: "6px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          height: "100%",
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

        {/* Colonne Droite : Visualisation Graphique & Historique */}
        <div className="budget-right-col" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Visualisations Graphiques */}
          <div className="card panel" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginBottom: "1rem" }}>📈 Répartition des Dépenses du Mois</h3>
            
            <div className="category-bars-box" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {categoryTotals.map((cat) => (
                <div key={cat.id} className="category-bar-row">
                  <div className="category-bar-info" style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span className="text-sm">
                      {cat.icon} {cat.label}
                    </span>
                    <span className="fw-600 text-sm">
                      {cat.total.toFixed(2)} € ({Math.round(cat.percentage)}%)
                    </span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: "8px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        height: "100%",
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color,
                        transition: "width 0.4s ease"
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tableau des Dépenses Récentes Cumulées */}
          <div className="card panel" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0 }}>🧾 Opérations Enregistrées ({monthTitle})</h3>
              <span className="badge badge-accent">{expenses.length} dépense{expenses.length > 1 ? "s" : ""}</span>
            </div>

            {expenses.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem 0" }}>
                <p className="text-muted text-sm">
                  Aucune dépense enregistrée pour {monthTitle}.
                </p>
              </div>
            ) : (
              <div className="expenses-table-wrapper" style={{ overflowX: "auto" }}>
                <table className="expenses-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                      <th style={{ padding: "0.6rem" }}>Date</th>
                      <th style={{ padding: "0.6rem" }}>Catégorie</th>
                      <th style={{ padding: "0.6rem" }}>Note / Enseigne</th>
                      <th style={{ padding: "0.6rem", textAlign: "right" }}>Montant</th>
                      <th style={{ padding: "0.6rem", width: "40px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => {
                      const catInfo = CATEGORIES.find((c) => c.id === expense.category);
                      return (
                        <tr key={expense.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "0.6rem" }}>
                            <span className="text-sm fw-500">
                              {format(new Date(expense.date), "dd/MM/yyyy")}
                            </span>
                          </td>
                          <td style={{ padding: "0.6rem" }}>
                            <span className="chip" style={{ fontSize: "0.75rem", background: "var(--surface-hover)", padding: "0.2rem 0.5rem", borderRadius: "999px" }}>
                              {catInfo?.icon || "🛒"} {expense.category}
                            </span>
                          </td>
                          <td style={{ padding: "0.6rem" }}>
                            <span className="text-sm text-secondary">
                              {expense.description || "—"}
                            </span>
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "right" }}>
                            <strong style={{ color: "var(--primary)" }}>{Number(expense.amount).toFixed(2)} €</strong>
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "center" }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              title="Supprimer la dépense"
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
