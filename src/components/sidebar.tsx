"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarDays,
  ChartNoAxesCombined,
  Clock3,
  LayoutDashboard,
  Users,
  WalletCards,
} from "lucide-react";

const navigation = [
  ["/", "Inicio", LayoutDashboard],
  ["/agenda", "Agenda", CalendarDays],
  ["/pacientes", "Pacientes", Users],
  ["/presupuestos", "Tratamientos", Activity],
  ["/caja", "Caja y pagos", WalletCards],
  ["/recordatorios", "Recordatorios", Clock3],
  ["/reportes", "Reportes", ChartNoAxesCombined],
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
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
        {navigation.map(([href, label, Icon]) => {
          const active = href === "/" ? pathname === href : pathname.startsWith(href);

          return (
            <Link className={active ? "active" : undefined} href={href} key={href}>
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="clinic">
        <div className="row">
          <span className="avatar avatar-small">CH</span>
          <div>
            <b>Clínica Horizonte</b>
            <div className="small">Plan Demo · Monterrey</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
