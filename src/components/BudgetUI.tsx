"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { format, parseISO, addMonths, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import {
  getMonthlyBudget,
  updateBudgetAmount,
  addExpense,
  updateExpense,
  deleteExpense,
} from "../app/actions/budget";

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

type PaymentCard = {
  id: string;
  name: string;
  icon: string;
  budgetAmount: number;
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

const CARD_ICONS = ["💳", "🍽️", "🟢", "👛", "🏦", "💳", "🎟️", "🛒"];

const getRestoCardKey = (mStr: string) => `mealfresh_resto_card_${mStr}`;
const getCardsKey = (mStr: string) => `mealfresh_custom_cards_v3_${mStr}`;

const loadRestoAmount = (mStr: string) => {
  if (typeof window === "undefined") return 0;
  try {
    const val = localStorage.getItem(getRestoCardKey(mStr));
    return val !== null ? parseFloat(val) : 0;
  } catch {
    return 0;
  }
};

const getDefaultCards = (mStr: string, defaultCB: number): PaymentCard[] => {
  const restoVal = loadRestoAmount(mStr);
  return [
    { id: "card_cb", name: "Carte Perso / CB", icon: "💳", budgetAmount: defaultCB },
    { id: "card_resto", name: "Carte Resto", icon: "🍽️", budgetAmount: restoVal },
  ];
};

const loadCustomCards = (mStr: string, defaultCB: number): PaymentCard[] => {
  if (typeof window === "undefined") return getDefaultCards(mStr, defaultCB);
  try {
    const val = localStorage.getItem(getCardsKey(mStr));
    if (!val) return getDefaultCards(mStr, defaultCB);
    const parsed = JSON.parse(val);
    if (!Array.isArray(parsed) || parsed.length === 0) return getDefaultCards(mStr, defaultCB);
    return parsed;
  } catch {
    return getDefaultCards(mStr, defaultCB);
  }
};

const saveCustomCards = (mStr: string, cards: PaymentCard[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getCardsKey(mStr), JSON.stringify(cards));
  } catch {}
};

function getWeekKeyFromDate(d: Date | string): string {
  const dateObj = new Date(d);
  const dayNum = dateObj.getDate();
  if (dayNum > 28) return "S5";
  if (dayNum > 21) return "S4";
  if (dayNum > 14) return "S3";
  if (dayNum > 7) return "S2";
  return "S1";
}

function getExpenseWeekKey(expense: ExpenseItem): string {
  if (expense.description) {
    if (expense.description.includes("[S1]")) return "S1";
    if (expense.description.includes("[S2]")) return "S2";
    if (expense.description.includes("[S3]")) return "S3";
    if (expense.description.includes("[S4]")) return "S4";
    if (expense.description.includes("[S5]")) return "S5";
  }
  return getWeekKeyFromDate(expense.date);
}

function getExpenseCardId(expense: ExpenseItem, cards: PaymentCard[]): string {
  if (!expense.description) return cards[0]?.id || "card_cb";
  const match = expense.description.match(/\[Card:([^\]]+)\]/);
  if (match && match[1]) {
    const found = cards.find(c => c.id === match[1]);
    if (found) return found.id;
  }
  if (expense.description.includes("[Carte Resto]")) {
    const restoCard = cards.find(c => c.id === "card_resto" || c.name.toLowerCase().includes("resto"));
    if (restoCard) return restoCard.id;
  }
  return cards[0]?.id || "card_cb";
}

export default function BudgetUI({ budget: initialBudget }: BudgetUIProps) {
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(
    parseISO(`${initialBudget.month}-01`)
  );
  
  const currentMonthStr = format(currentMonthDate, "yyyy-MM");

  // Cartes de paiement configurées
  const [cards, setCards] = useState<PaymentCard[]>(() =>
    loadCustomCards(initialBudget.month, initialBudget.amount)
  );

  // Formulaire d'ajout d'une nouvelle carte
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardName, setNewCardName] = useState("");
  const [newCardIcon, setNewCardIcon] = useState("💳");
  const [newCardAmount, setNewCardAmount] = useState("");

  // Édition en ligne d'une carte
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardName, setEditingCardName] = useState("");
  const [editingCardAmount, setEditingCardAmount] = useState("");

  // Dépenses du mois
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialBudget.expenses);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // État d'édition d'une dépense existante
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseDate, setEditExpenseDate] = useState("");
  const [editExpenseAmount, setEditExpenseAmount] = useState("");
  const [editExpenseCategory, setEditExpenseCategory] = useState("Supermarché");
  const [editExpenseCardId, setEditExpenseCardId] = useState<string>("");
  const [editExpenseWeek, setEditExpenseWeek] = useState("AUTO");
  const [editExpenseDescription, setEditExpenseDescription] = useState("");

  const [isPending, startTransition] = useTransition();

  // Champs de création de dépense
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [expenseDate, setExpenseDate] = useState(todayStr);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Supermarché");
  const [expenseCardId, setExpenseCardId] = useState<string>("");
  const [expenseWeek, setExpenseWeek] = useState<string>("AUTO");
  const [expenseDescription, setExpenseDescription] = useState("");

  // Synchroniser la carte sélectionnée par défaut
  useEffect(() => {
    if (cards.length > 0 && (!expenseCardId || !cards.some(c => c.id === expenseCardId))) {
      setExpenseCardId(cards[0].id);
    }
  }, [cards, expenseCardId]);

  // Recharger les données lors des changements de mois
  useEffect(() => {
    const loadedCards = loadCustomCards(currentMonthStr, initialBudget.amount);
    setCards(loadedCards);

    if (currentMonthStr === initialBudget.month) {
      setExpenses(initialBudget.expenses);
      return;
    }

    let cancelled = false;
    setIsLoadingMonth(true);

    getMonthlyBudget(currentMonthStr)
      .then((data) => {
        if (cancelled) return;
        setExpenses(data.expenses);
      })
      .catch(() => {
        if (!cancelled) setErrorMsg("Impossible de charger ce mois.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMonth(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentMonthStr, initialBudget]);

  // Sauvegarder les cartes à chaque modification
  const updateCardsState = (newCards: PaymentCard[]) => {
    setCards(newCards);
    saveCustomCards(currentMonthStr, newCards);

    // Mettre à jour la première carte CB sur le serveur de manière transparente
    const cbCard = newCards.find(c => c.id === "card_cb") || newCards[0];
    if (cbCard) {
      startTransition(async () => {
        await updateBudgetAmount(currentMonthStr, cbCard.budgetAmount);
      });
    }
  };

  // CALCULS PAR CARTE ET SOMME GLOBALE
  const cardBreakdown = useMemo(() => {
    return cards.map((card) => {
      const cardExpenses = expenses.filter(e => getExpenseCardId(e, cards) === card.id);
      const spent = cardExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
      const remaining = card.budgetAmount - spent;
      const percentage = card.budgetAmount > 0 ? Math.min(Math.round((spent / card.budgetAmount) * 100), 100) : 0;
      return {
        ...card,
        spent,
        remaining,
        percentage,
        count: cardExpenses.length,
      };
    });
  }, [cards, expenses]);

  const totalBudgetGlobal = useMemo(() => {
    return cards.reduce((acc, curr) => acc + curr.budgetAmount, 0);
  }, [cards]);

  const totalSpent = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
  }, [expenses]);

  const remainingBudgetGlobal = totalBudgetGlobal - totalSpent;
  const percentageSpentGlobal = totalBudgetGlobal > 0 ? Math.min(Math.round((totalSpent / totalBudgetGlobal) * 100), 100) : 0;

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
      const weekKey = getExpenseWeekKey(item);
      if (groups[weekKey]) {
        groups[weekKey].total += Number(item.amount);
        groups[weekKey].expenses.push(item);
      }
    });

    return groups;
  }, [expenses]);

  // Semaine calculée dynamiquement d'après la date si AUTO
  const autoCalculatedWeek = useMemo(() => {
    return getWeekKeyFromDate(expenseDate);
  }, [expenseDate]);

  // GESTION DES CARTES (Ajout, Édition, Suppression)
  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newCardAmount);
    if (!newCardName.trim() || isNaN(amt) || amt < 0) return;

    const newCard: PaymentCard = {
      id: "card_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      name: newCardName.trim(),
      icon: newCardIcon,
      budgetAmount: amt,
    };

    updateCardsState([...cards, newCard]);
    setNewCardName("");
    setNewCardAmount("");
    setShowAddCardModal(false);
  };

  const handleSaveCardEdit = (cardId: string) => {
    const amt = parseFloat(editingCardAmount);
    if (isNaN(amt) || amt < 0) return;

    const updated = cards.map(c => {
      if (c.id === cardId) {
        return { ...c, name: editingCardName.trim() || c.name, budgetAmount: amt };
      }
      return c;
    });

    updateCardsState(updated);
    setEditingCardId(null);
  };

  const handleDeleteCard = (cardId: string) => {
    if (cards.length <= 1) return; // Garder au moins 1 carte
    const updated = cards.filter(c => c.id !== cardId);
    updateCardsState(updated);
  };

  // AJOUT D'UNE DÉPENSE (AVEC SÉLECTION DE LA CARTE)
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    const amt = parseFloat(expenseAmount);
    if (isNaN(amt) || amt <= 0) return;

    const tempId = `temp_${Date.now()}`;
    const rawNote = expenseDescription.trim();

    const weekTag = expenseWeek !== "AUTO" ? `[${expenseWeek}]` : "";
    const cardTag = `[Card:${expenseCardId}]`;

    let formattedDesc = `${weekTag}${cardTag}`;
    if (rawNote) formattedDesc += `${formattedDesc ? " " : ""}${rawNote}`;

    setExpenses(prev => [
      { id: tempId, date: expenseDate, amount: amt, category: expenseCategory, description: formattedDesc || null },
      ...prev,
    ]);

    setExpenseAmount("");
    setExpenseDescription("");
    setErrorMsg(null);

    startTransition(async () => {
      const res = await addExpense({
        monthStr: currentMonthStr,
        dateStr: expenseDate,
        amount: amt,
        category: expenseCategory,
        description: formattedDesc,
      });

      if (res.success && res.expense) {
        setExpenses(prev => [res.expense, ...prev.filter(e => e.id !== tempId)]);
      } else {
        setExpenses(prev => prev.filter(e => e.id !== tempId));
        setErrorMsg(res.error ?? "La dépense n'a pas pu être enregistrée.");
      }
    });
  };

  // LANCER L'ÉDITION D'UNE DÉPENSE EXISTANTE
  const handleStartEditExpense = (expense: ExpenseItem) => {
    const cardId = getExpenseCardId(expense, cards);
    let weekTag = "AUTO";
    if (expense.description?.includes("[S1]")) weekTag = "S1";
    else if (expense.description?.includes("[S2]")) weekTag = "S2";
    else if (expense.description?.includes("[S3]")) weekTag = "S3";
    else if (expense.description?.includes("[S4]")) weekTag = "S4";
    else if (expense.description?.includes("[S5]")) weekTag = "S5";

    const cleanDesc = (expense.description || "")
      .replace(/\[Card:[^\]]+\]/g, "")
      .replace(/\[S[1-5]\]/g, "")
      .replace("[Carte Resto]", "")
      .trim();

    setEditingExpenseId(expense.id);
    setEditExpenseDate(format(new Date(expense.date), "yyyy-MM-dd"));
    setEditExpenseAmount(expense.amount.toString());
    setEditExpenseCategory(expense.category);
    setEditExpenseCardId(cardId);
    setEditExpenseWeek(weekTag);
    setEditExpenseDescription(cleanDesc);
  };

  // SAUVEGARDER LA MODIFICATION D'UNE DÉPENSE
  const handleSaveEditExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpenseId) return;

    const amt = parseFloat(editExpenseAmount);
    if (isNaN(amt) || amt <= 0) return;

    const weekTagStr = editExpenseWeek !== "AUTO" ? `[${editExpenseWeek}]` : "";
    const cardTagStr = `[Card:${editExpenseCardId}]`;
    const rawNote = editExpenseDescription.trim();

    let formattedDesc = `${weekTagStr}${cardTagStr}`;
    if (rawNote) formattedDesc += `${formattedDesc ? " " : ""}${rawNote}`;

    const targetId = editingExpenseId;
    const previous = expenses;

    setExpenses(prev => prev.map(item => {
      if (item.id === targetId) {
        return {
          ...item,
          date: editExpenseDate,
          amount: amt,
          category: editExpenseCategory,
          description: formattedDesc || null,
        };
      }
      return item;
    }));

    setEditingExpenseId(null);
    setErrorMsg(null);

    startTransition(async () => {
      const res = await updateExpense({
        id: targetId,
        dateStr: editExpenseDate,
        amount: amt,
        category: editExpenseCategory,
        description: formattedDesc,
      });

      if (!res.success) {
        setExpenses(previous);
        setErrorMsg(res.error ?? "La dépense n'a pas pu être modifiée.");
      }
    });
  };

  // SUPPRESSION D'UNE DÉPENSE
  const handleDeleteExpense = (id: string) => {
    const previous = expenses;
    setExpenses(prev => prev.filter(e => e.id !== id));
    setErrorMsg(null);

    startTransition(async () => {
      const res = await deleteExpense(id);
      if (!res.success) {
        setExpenses(previous);
        setErrorMsg(res.error ?? "La dépense n'a pas pu être supprimée.");
      }
    });
  };

  const monthTitle = format(currentMonthDate, "MMMM yyyy", { locale: fr });

  return (
    <div className="budget-dashboard" style={{ opacity: isPending || isLoadingMonth ? 0.9 : 1 }}>

      {errorMsg && (
        <div
          role="alert"
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            borderRadius: "var(--radius-md)",
            background: "#fee2e2",
            color: "#b91c1c",
            fontSize: "0.875rem",
          }}
        >
          {errorMsg}
        </div>
      )}
      
      {/* ── En-tête du Budget & Navigation par Mois ── */}
      <div className="budget-header-card card" style={{ padding: "1.5rem" }}>
        <div className="budget-header-main" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.25rem" }}>
          <div style={{ flex: 1, minWidth: "260px" }}>
            <div className="badge badge-accent mb-1">💳 Gestion Multi-Cartes & Budgets</div>
            <h1 style={{ textTransform: "capitalize", margin: ".25rem 0" }}>Budget du Mois — {monthTitle}</h1>
            <p className="text-secondary text-sm" style={{ margin: 0 }}>
              Gérez vos différentes cartes (CB, Carte Resto, Compte Joint...) et consultez ce qu'il reste en détail sur chacune.
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
        </div>
      </div>

      {/* ── SECTION EXCLUSIVE : RUSTES EN DÉTAIL PAR CARTE DE PAIEMENT ── */}
      <div style={{ margin: "1.5rem 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", margin: 0 }}>💳 Vos Cartes & Solde Reste à Dépenser</h2>
            <p className="text-xs text-muted" style={{ margin: 0 }}>
              Chaque carte possède son budget alloué et son solde restant en temps réel.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddCardModal(true)}
          >
            ➕ Ajouter une nouvelle carte
          </button>
        </div>

        {/* Formulaire modale d'ajout d'une nouvelle carte */}
        {showAddCardModal && (
          <div className="card panel" style={{ padding: "1.25rem", marginBottom: "1.25rem", background: "var(--bg)", border: "2px solid var(--primary-light)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <h3 style={{ fontSize: "1rem", margin: 0 }}>➕ Ajouter une Carte de Paiement</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddCardModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddCard} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: "160px" }}>
                <label className="text-xs text-muted" style={{ display: "block" }}>Nom de la carte *</label>
                <input
                  type="text"
                  placeholder="Ex: Swile, Edenred, N26..."
                  className="input-field input-sm"
                  style={{ width: "100%" }}
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                  required
                />
              </div>

              <div style={{ width: "90px" }}>
                <label className="text-xs text-muted" style={{ display: "block" }}>Icône</label>
                <select
                  className="input-field input-sm"
                  style={{ width: "100%" }}
                  value={newCardIcon}
                  onChange={(e) => setNewCardIcon(e.target.value)}
                >
                  {CARD_ICONS.map((icon, idx) => (
                    <option key={idx} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>

              <div style={{ width: "130px" }}>
                <label className="text-xs text-muted" style={{ display: "block" }}>Budget Alloué (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 150.00"
                  className="input-field input-sm"
                  style={{ width: "100%" }}
                  value={newCardAmount}
                  onChange={(e) => setNewCardAmount(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-sm">Enregistrer la carte</button>
            </form>
          </div>
        )}

        {/* Grille des Cartes avec Reste en Détail */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
          {cardBreakdown.map((card) => {
            const isEditing = editingCardId === card.id;

            return (
              <div
                key={card.id}
                className="card"
                style={{
                  padding: "1.25rem",
                  background: card.id === "card_resto" ? "linear-gradient(135deg, rgba(49,151,149,0.06) 0%, rgba(49,151,149,0.12) 100%)" : "var(--surface)",
                  border: "1.5px solid var(--border)",
                  borderRadius: "var(--radius-lg)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.5rem" }}>{card.icon}</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>{card.name}</h3>
                      <span className="text-xs text-muted">{card.count} opération{card.count > 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ padding: "0.15rem 0.4rem", fontSize: "0.8rem" }}
                      onClick={() => {
                        setEditingCardId(card.id);
                        setEditingCardName(card.name);
                        setEditingCardAmount(card.budgetAmount.toString());
                      }}
                      title="Modifier le budget de cette carte"
                    >
                      ✏️
                    </button>

                    {cards.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ padding: "0.15rem 0.4rem", fontSize: "0.8rem" }}
                        onClick={() => handleDeleteCard(card.id)}
                        title="Supprimer la carte"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div style={{ marginTop: "0.5rem", background: "var(--bg)", padding: "0.75rem", borderRadius: "var(--radius-md)" }}>
                    <label className="text-xs text-muted" style={{ display: "block" }}>Nom & Budget (€)</label>
                    <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.25rem" }}>
                      <input
                        type="text"
                        className="input-field input-sm"
                        style={{ flex: 1 }}
                        value={editingCardName}
                        onChange={(e) => setEditingCardName(e.target.value)}
                      />
                      <input
                        type="number"
                        step="0.01"
                        className="input-field input-sm"
                        style={{ width: "80px" }}
                        value={editingCardAmount}
                        onChange={(e) => setEditingCardAmount(e.target.value)}
                      />
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => handleSaveCardEdit(card.id)}>OK</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem", background: "var(--bg)", padding: "0.6rem 0.75rem", borderRadius: "var(--radius-md)" }}>
                      <div>
                        <span className="text-xs text-muted" style={{ display: "block" }}>Budget Alloué</span>
                        <strong style={{ fontSize: "1rem" }}>{card.budgetAmount.toFixed(2)} €</strong>
                      </div>
                      <div>
                        <span className="text-xs text-muted" style={{ display: "block" }}>Total Dépensé</span>
                        <strong style={{ fontSize: "1rem", color: "var(--primary)" }}>{card.spent.toFixed(2)} €</strong>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "0.5rem" }}>
                      <span className="text-xs text-secondary fw-600">Reste disponible :</span>
                      <span style={{ fontSize: "1.3rem", fontWeight: 900, color: card.remaining < 0 ? "var(--danger)" : "#319795" }}>
                        {card.remaining.toFixed(2)} €
                      </span>
                    </div>

                    <div className="progress-bar-bg" style={{ background: "var(--border)", borderRadius: "999px", height: "6px", overflow: "hidden", marginTop: "0.5rem" }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          height: "100%",
                          width: `${card.percentage}%`,
                          backgroundColor: card.remaining < 0 ? "var(--danger)" : "#319795",
                          transition: "width 0.4s ease"
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Cartes d'Indicateurs Clés Globaux (Somme Totale) ── */}
      <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", margin: "1.5rem 0" }}>
        
        {/* CARTE MAJEURE : SOMME TOTALE DISPONIBLE */}
        <div className="card kpi-card" style={{ padding: "1.25rem", background: "linear-gradient(135deg, rgba(255,122,33,0.08) 0%, rgba(49,151,149,0.08) 100%)", border: "2px solid var(--primary-light)" }}>
          <div className="kpi-icon" style={{ fontSize: "2rem" }}>💰</div>
          <div className="kpi-content">
            <span className="kpi-label" style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700 }}>
              Somme Globale Disponible ({cards.length} cartes)
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
              <span className="kpi-value" style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--primary)" }}>
                {totalBudgetGlobal.toFixed(2)} €
              </span>
            </div>
            <span className="text-xs text-muted" style={{ fontSize: "0.72rem" }}>
              Cumul de vos {cards.length} cartes de paiement
            </span>
          </div>
        </div>

        <div className="card kpi-card" style={{ padding: "1.25rem" }}>
          <div className="kpi-icon" style={{ fontSize: "2rem" }}>🛒</div>
          <div className="kpi-content">
            <span className="kpi-label" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Total Dépenses Cumulées</span>
            <span className="kpi-value text-orange" style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--primary)" }}>{totalSpent.toFixed(2)} €</span>
          </div>
        </div>

        <div className="card kpi-card" style={{ padding: "1.25rem" }}>
          <div className="kpi-icon" style={{ fontSize: "2rem" }}>✨</div>
          <div className="kpi-content">
            <span className="kpi-label" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Reste à Dépenser Total</span>
            <span className={`kpi-value ${remainingBudgetGlobal < 0 ? 'text-danger' : 'text-accent'}`} style={{ fontSize: "1.4rem", fontWeight: 800 }}>
              {remainingBudgetGlobal.toFixed(2)} €
            </span>
          </div>
        </div>

        <div className="card kpi-card" style={{ padding: "1.25rem" }}>
          <div className="kpi-icon" style={{ fontSize: "2rem" }}>📊</div>
          <div className="kpi-content" style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
              <span className="kpi-label" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Consommé Global</span>
              <span className="fw-700 text-sm">{percentageSpentGlobal}%</span>
            </div>
            <div className="progress-bar-bg" style={{ background: "var(--border)", borderRadius: "999px", height: "8px", overflow: "hidden" }}>
              <div
                className="progress-bar-fill"
                style={{
                  height: "100%",
                  width: `${percentageSpentGlobal}%`,
                  backgroundColor: percentageSpentGlobal > 90 ? "var(--danger)" : "var(--primary)",
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

              {/* SÉLECTEUR DE CARTE DE PAIEMENT */}
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                  💳 Carte de paiement utilisée
                </label>
                <select
                  className="input-field"
                  value={expenseCardId}
                  onChange={(e) => setExpenseCardId(e.target.value)}
                  style={{ fontWeight: 600 }}
                >
                  {cards.map(card => (
                    <option key={card.id} value={card.id}>
                      {card.icon} {card.name} (Reste: {(card.budgetAmount - expenses.filter(e => getExpenseCardId(e, cards) === card.id).reduce((s, e) => s + Number(e.amount), 0)).toFixed(2)} €)
                    </option>
                  ))}
                </select>
              </div>

              {/* SÉLECTEUR DE SEMAINE DE LA DÉPENSE */}
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                  📅 Semaine attribuée
                </label>
                <select
                  className="input-field"
                  value={expenseWeek}
                  onChange={(e) => setExpenseWeek(e.target.value)}
                  style={{ fontWeight: 600 }}
                >
                  <option value="AUTO">⚡ Auto d'après date ({autoCalculatedWeek})</option>
                  <option value="S1">📅 Semaine 1 (du 1 au 7)</option>
                  <option value="S2">📅 Semaine 2 (du 8 au 14)</option>
                  <option value="S3">📅 Semaine 3 (du 15 au 21)</option>
                  <option value="S4">📅 Semaine 4 (du 22 au 28)</option>
                  <option value="S5">📅 Semaine 5 (du 29 au 31)</option>
                </select>
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
                  placeholder="Ex: Carrefour, Auchan, Resto..."
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
              Objectif hebdo : {(totalBudgetGlobal / 4).toFixed(2)} €
            </p>

            <div className="weekly-tracker-list" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {Object.entries(weekGroups).map(([key, data]) => {
                const targetWeekly = totalBudgetGlobal / 4;
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
                      <th style={{ padding: "0.6rem" }}>Semaine</th>
                      <th style={{ padding: "0.6rem" }}>Catégorie</th>
                      <th style={{ padding: "0.6rem" }}>Carte / Note</th>
                      <th style={{ padding: "0.6rem", textAlign: "right" }}>Montant</th>
                      <th style={{ padding: "0.6rem", width: "90px", textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => {
                      const isEditingThis = editingExpenseId === expense.id;

                      if (isEditingThis) {
                        return (
                          <tr key={expense.id} style={{ background: "var(--surface-hover)", borderBottom: "1px solid var(--border)" }}>
                            <td colSpan={6} style={{ padding: "1rem" }}>
                              <form onSubmit={handleSaveEditExpense} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <strong style={{ fontSize: "0.95rem" }}>✏️ Modifier la dépense</strong>
                                  <div style={{ display: "flex", gap: "0.4rem" }}>
                                    <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>💾 Enregistrer</button>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingExpenseId(null)}>✕ Annuler</button>
                                  </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem" }}>
                                  <div>
                                    <label className="text-xs text-muted" style={{ display: "block" }}>Montant (€) *</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="input-field input-sm"
                                      style={{ width: "100%" }}
                                      value={editExpenseAmount}
                                      onChange={(e) => setEditExpenseAmount(e.target.value)}
                                      required
                                    />
                                  </div>

                                  <div>
                                    <label className="text-xs text-muted" style={{ display: "block" }}>Date *</label>
                                    <input
                                      type="date"
                                      className="input-field input-sm"
                                      style={{ width: "100%" }}
                                      value={editExpenseDate}
                                      onChange={(e) => setEditExpenseDate(e.target.value)}
                                      required
                                    />
                                  </div>

                                  <div>
                                    <label className="text-xs text-muted" style={{ display: "block" }}>Carte de paiement</label>
                                    <select
                                      className="input-field input-sm"
                                      style={{ width: "100%" }}
                                      value={editExpenseCardId}
                                      onChange={(e) => setEditExpenseCardId(e.target.value)}
                                    >
                                      {cards.map(c => (
                                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="text-xs text-muted" style={{ display: "block" }}>Semaine</label>
                                    <select
                                      className="input-field input-sm"
                                      style={{ width: "100%" }}
                                      value={editExpenseWeek}
                                      onChange={(e) => setEditExpenseWeek(e.target.value)}
                                    >
                                      <option value="AUTO">⚡ Auto d'après date</option>
                                      <option value="S1">📅 Semaine 1 (1-7)</option>
                                      <option value="S2">📅 Semaine 2 (8-14)</option>
                                      <option value="S3">📅 Semaine 3 (15-21)</option>
                                      <option value="S4">📅 Semaine 4 (22-28)</option>
                                      <option value="S5">📅 Semaine 5 (29-31)</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="text-xs text-muted" style={{ display: "block" }}>Catégorie</label>
                                    <select
                                      className="input-field input-sm"
                                      style={{ width: "100%" }}
                                      value={editExpenseCategory}
                                      onChange={(e) => setEditExpenseCategory(e.target.value)}
                                    >
                                      {CATEGORIES.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                          {cat.icon} {cat.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div style={{ gridColumn: "span 2" }}>
                                    <label className="text-xs text-muted" style={{ display: "block" }}>Note / Enseigne</label>
                                    <input
                                      type="text"
                                      className="input-field input-sm"
                                      style={{ width: "100%" }}
                                      value={editExpenseDescription}
                                      onChange={(e) => setEditExpenseDescription(e.target.value)}
                                      placeholder="Ex: Carrefour..."
                                    />
                                  </div>
                                </div>
                              </form>
                            </td>
                          </tr>
                        );
                      }

                      const catInfo = CATEGORIES.find((c) => c.id === expense.category);
                      const assignedCardId = getExpenseCardId(expense, cards);
                      const assignedCard = cards.find(c => c.id === assignedCardId) || cards[0];
                      const weekKey = getExpenseWeekKey(expense);

                      const displayDesc = (expense.description || "")
                        .replace(/\[Card:[^\]]+\]/g, "")
                        .replace(/\[S[1-5]\]/g, "")
                        .replace("[Carte Resto]", "")
                        .trim() || "—";

                      return (
                        <tr key={expense.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "0.6rem" }}>
                            <span className="text-sm fw-500">
                              {format(new Date(expense.date), "dd/MM/yyyy")}
                            </span>
                          </td>
                          <td style={{ padding: "0.6rem" }}>
                            <span className="chip" style={{ fontSize: "0.75rem", background: "var(--primary-light)", color: "var(--primary-dark)", padding: "0.15rem 0.5rem", borderRadius: "999px", fontWeight: 700 }}>
                              📅 {weekKey}
                            </span>
                          </td>
                          <td style={{ padding: "0.6rem" }}>
                            <span className="chip" style={{ fontSize: "0.75rem", background: "var(--surface-hover)", padding: "0.2rem 0.5rem", borderRadius: "999px" }}>
                              {catInfo?.icon || "🛒"} {expense.category}
                            </span>
                          </td>
                          <td style={{ padding: "0.6rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span className="chip" style={{ fontSize: "0.7rem", background: "rgba(49,151,149,0.12)", color: "#319795", padding: "0.15rem 0.45rem", borderRadius: "999px", fontWeight: 700 }}>
                                {assignedCard?.icon || "💳"} {assignedCard?.name || "CB"}
                              </span>
                              <span className="text-sm text-secondary">
                                {displayDesc}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "right" }}>
                            <strong style={{ color: "var(--primary)" }}>{Number(expense.amount).toFixed(2)} €</strong>
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: "0.25rem", justifyContent: "center" }}>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{ padding: "0.2rem 0.4rem" }}
                                title="Modifier la dépense"
                                onClick={() => handleStartEditExpense(expense)}
                                disabled={isPending}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{ padding: "0.2rem 0.4rem" }}
                                title="Supprimer la dépense"
                                onClick={() => handleDeleteExpense(expense.id)}
                                disabled={isPending}
                              >
                                🗑️
                              </button>
                            </div>
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
