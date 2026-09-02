import { getRecipes } from "../actions/recipes";
import { getWeeklyPlanning } from "../actions/planning";
import { getCategories } from "../actions/ingredients";
import { startOfWeek } from "date-fns";
import PlannerUI from "@/components/PlannerUI";

export default async function PlanningPage() {
  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
  const [recipes, plannings, categories] = await Promise.all([
    getRecipes(),
    getWeeklyPlanning(startDate),
    getCategories(),
  ]);

  return (
    <div>
      <div className="page-header">
        <h1>📅 Planning Semainier</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: ".25rem" }}>
          Organisez vos repas de la semaine (Matin, Midi, Goûter, Soir) en quelques clics.
        </p>
      </div>
      <PlannerUI recipes={recipes} plannings={plannings} categories={categories} />
    </div>
  );
}
