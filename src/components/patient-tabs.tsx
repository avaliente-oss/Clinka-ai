"use client";

import { useEffect, useState } from "react";

type Tab = { id: string; label: string };

function tabFromHash(hash: string, tabs: Tab[]) {
  const target = hash.replace(/^#/, "");
  if (target.startsWith("tratamiento-")) return "tratamientos";
  return tabs.some((tab) => tab.id === target) ? target : "datos";
}

export function PatientTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState("datos");

  useEffect(() => {
    const show = (id: string) => {
      setActive(id);
      document.querySelectorAll<HTMLElement>("[data-patient-panel]").forEach((panel) => {
        panel.hidden = panel.id !== id;
      });
    };
    const syncHash = () => {
      const id = tabFromHash(window.location.hash, tabs);
      show(id);
      if (window.location.hash.startsWith("#tratamiento-")) {
        window.setTimeout(() => document.querySelector(window.location.hash)?.scrollIntoView(), 0);
      }
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [tabs]);

  function select(id: string) {
    setActive(id);
    document.querySelectorAll<HTMLElement>("[data-patient-panel]").forEach((panel) => {
      panel.hidden = panel.id !== id;
    });
    window.history.replaceState(null, "", `#${id}`);
  }

  return (
    <div className="tabs" role="tablist" aria-label="Secciones del expediente">
      {tabs.map((tab) => (
        <button
          aria-controls={tab.id}
          aria-selected={active === tab.id}
          className={`tab${active === tab.id ? " active" : ""}`}
          id={`tab-${tab.id}`}
          key={tab.id}
          onClick={() => select(tab.id)}
          role="tab"
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
