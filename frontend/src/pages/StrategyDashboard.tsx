import { Navigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { StrategyBlueprint } from "@/components/StrategyBlueprint";
import { LoadingSplash } from "@/components/LoadingSplash";

export default function StrategyDashboard() {
  const { user, preferences } = useStore();

  if (user.id === "anon") {
    return <LoadingSplash open />;
  }

  if (!preferences?.showStrategyPage) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Strategy Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          CAT-focused targets, historical percentile context, and a school-level execution matrix. Private to your account.
        </p>
      </header>
      <StrategyBlueprint />
    </div>
  );
}
