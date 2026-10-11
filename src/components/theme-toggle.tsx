"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type ThemePreference = "light" | "dark" | "system";

const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Laptop },
];

function applyTheme(preference: ThemePreference) {
  const resolved =
    preference === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : preference;

  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = preference;
}

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const stored = localStorage.getItem("clinika-theme");
    const initial =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";
    queueMicrotask(() => setPreference(initial));
    applyTheme(initial);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => {
      if (localStorage.getItem("clinika-theme") === "system" || !localStorage.getItem("clinika-theme")) {
        applyTheme("system");
      }
    };
    media.addEventListener("change", syncSystemTheme);
    return () => media.removeEventListener("change", syncSystemTheme);
  }, []);

  function selectTheme(next: ThemePreference) {
    localStorage.setItem("clinika-theme", next);
    setPreference(next);
    applyTheme(next);
  }

  return (
    <div className="theme-setting">
      <span className="theme-label">Apariencia</span>
      <div className="theme-toggle" role="group" aria-label="Tema de color">
        {options.map(({ value, label, icon: Icon }) => (
          <button
            aria-pressed={preference === value}
            className="theme-option"
            key={value}
            onClick={() => selectTheme(value)}
            title={label}
            type="button"
          >
            <Icon aria-hidden="true" size={14} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
