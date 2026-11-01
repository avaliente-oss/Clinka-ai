import { Suspense } from "react";
import { AIDisclaimer } from "./ai-disclaimer";
import { businessInsights } from "@/lib/ai/insights";

async function InsightsContent({ context }: { context: string }) {
  const insights = await businessInsights(context);
  return (
    <>
      <p className="insight-summary">{insights.summary}</p>
      <ol className="insight-list">
        {insights.recommendations.map((recommendation) => (
          <li key={recommendation}>{recommendation}</li>
        ))}
      </ol>
      <AIDisclaimer />
    </>
  );
}

function InsightsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Generando insights">
      <div className="skeleton skeleton-line" style={{ marginTop: 16 }} />
      <div className="skeleton skeleton-line" style={{ width: "85%" }} />
      <div className="skeleton skeleton-line" style={{ width: "70%", marginTop: 16 }} />
      <div className="skeleton skeleton-line" style={{ width: "75%" }} />
      <div className="skeleton skeleton-line" style={{ width: "60%" }} />
    </div>
  );
}

/** Streams AI insights so the rest of the page renders without waiting for the model. */
export function InsightsBody({ context }: { context: string }) {
  return (
    <Suspense fallback={<InsightsSkeleton />}>
      <InsightsContent context={context} />
    </Suspense>
  );
}
