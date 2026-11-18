"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  CalendarDays,
  ChartNoAxesCombined,
  Clock3,
  LayoutDashboard,
  Menu,
  Package,
  Settings2,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import type { DemoView } from "@/lib/demo-view";

const navigation = [
  ["/", "Inicio", LayoutDashboard, "shared"],
  ["/agenda", "Agenda", CalendarDays, "shared"],
  ["/pacientes", "Pacientes", Users, "shared"],
  ["/tratamientos", "Tratamientos", Activity, "clinica"],
  ["/caja", "Caja y pagos", WalletCards, "administracion"],
  ["/recordatorios", "Recordatorios", Clock3, "administracion"],
  ["/reportes", "Reportes", ChartNoAxesCombined, "administracion"],
  ["/inventario", "Inventario", Package, "administracion"],
  ["/configuracion", "Documentos y configuración", Settings2, "administracion"],
] as const;

export function Sidebar({ view }: { view: DemoView }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-expanded={open}
        aria-label={open ? "Cerrar navegación" : "Abrir navegación"}
        className="mobile-menu-button"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {open ? <X size={19} /> : <Menu size={19} />}
      </button>
      {open && (
        <button
          aria-label="Cerrar navegación"
          className="sidebar-backdrop"
          onClick={() => setOpen(false)}
          type="button"
        />
      )}
      <aside className={`sidebar${open ? " mobile-open" : ""}`}>
      <div className="brand">
        <Image
          className="brandmark"
          src="/davalsy-mark.png"
          alt="Davalsy Solutions"
          width={34}
          height={36}
          priority
        />
        <span>
          Clinika <span className="brand-ai">AI</span>
        </span>
      </div>
      <nav className="nav">
        {navigation.filter(([, , , area]) => view === "todo" || area === "shared" || area === view).map(([href, label, Icon]) => {
          const active = href === "/" ? pathname === href : pathname.startsWith(href);

          return (
            <Link
              className={active ? "active" : undefined}
              href={href}
              key={href}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <ThemeToggle />
        <div className="clinic">
          <div className="row">
            <span className="avatar avatar-small">CH</span>
            <div>
              <b>Clínica Horizonte</b>
              <div className="small">Plan Demo · Monterrey</div>
            </div>
          </div>
        </div>
      </div>
      </aside>
    </>
  );
}
