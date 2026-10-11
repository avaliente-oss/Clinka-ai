import type { Metadata } from "next";
import { Bell, Menu, Search } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clinika AI",
  description: "Gestión clínica inteligente",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body>
        <div className="shell">
          <Sidebar />
          <div className="content">
            <header className="topbar">
              <div className="row">
                <Menu className="mobilebar" size={20} />
                <Search size={17} />
                <span className="small">Buscar paciente, cita o tratamiento…</span>
              </div>
              <div className="row">
                <Bell size={18} />
                <span className="avatar avatar-user">AL</span>
                <div>
                  <b className="user-name">Dra. Ana López</b>
                  <div className="small">Administradora</div>
                </div>
              </div>
            </header>
            <main className="main">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
