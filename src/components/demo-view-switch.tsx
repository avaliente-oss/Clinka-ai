"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { DemoView } from "@/lib/demo-view";
import { setDemoView } from "@/lib/actions";

const options: Array<{ value: DemoView; label: string }> = [
  { value: "clinica", label: "Clínica" },
  { value: "administracion", label: "Administración" },
  { value: "todo", label: "Todo" },
];

export function DemoViewSwitch({ value }: { value: DemoView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function select(next: DemoView) {
    startTransition(async () => {
      await setDemoView(next);
      router.refresh();
    });
  }

  return (
    <div className="view-setting" title="Vista de demostración: no restringe permisos">
      <span className="view-label">Vista:</span>
      <div className="view-toggle" role="group" aria-label="Vista de demostración: no restringe permisos">
        {options.map((option) => (
          <button aria-pressed={value === option.value} disabled={pending} key={option.value} onClick={() => select(option.value)} type="button">
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
