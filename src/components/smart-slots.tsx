import { Suspense } from "react";
import { Clock3 } from "lucide-react";
import { AIDisclaimer } from "./ai-disclaimer";
import { suggestSlots } from "@/lib/ai/smart-schedule";

async function SlotsContent({ context }: { context: string }) {
  const schedule = await suggestSlots(context);
  return (
    <>
      {schedule.slots.map((slot, index) => (
        <div className="listitem" key={slot.datetime}>
          <span className="row">
            <Clock3 size={15} />
            <span>
              <b>{slot.datetime}</b>
              <span className="small block">{slot.reason}</span>
            </span>
          </span>
          <span className="badge">{index === 0 ? "Óptimo" : "Disponible"}</span>
        </div>
      ))}
      <AIDisclaimer />
    </>
  );
}

/** Streams AI slot suggestions so the agenda renders without waiting for the model. */
export function SmartSlots({ context }: { context: string }) {
  return (
    <Suspense
      fallback={
        <div aria-busy="true" aria-label="Buscando horarios">
          {[0, 1, 2].map((item) => <div className="skeleton skeleton-row" key={item} />)}
        </div>
      }
    >
      <SlotsContent context={context} />
    </Suspense>
  );
}
