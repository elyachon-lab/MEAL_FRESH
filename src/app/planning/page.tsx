import { getRecipes } from "../actions/recipes";
import { getWeeklyPlanning } from "../actions/planning";
import { startOfWeek } from "date-fns";
import PlannerUI from "@/components/PlannerUI";

export default async function PlanningPage() {
  const recipes = await getRecipes();
  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
  const plannings = await getWeeklyPlanning(startDate);

  return (
    <div>
      <div className="page-header">
        <h1>📅 Planning Semainier</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: ".25rem" }}>
          Glissez une recette depuis la banque vers les créneaux Midi &amp; Soir de votre semaine.
        </p>
      </div>
      <PlannerUI recipes={recipes} plannings={plannings} />
    </div>
  );
}
