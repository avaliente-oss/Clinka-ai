/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Bell, Search } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { DemoViewSwitch } from "@/components/demo-view-switch";
import { activeProvider } from "@/lib/ai/client";
import { parseDemoView } from "@/lib/demo-view";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clinika AI",
  description: "Gestión clínica inteligente",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const view = parseDemoView((await cookies()).get("clinika_view")?.value);
  const themeScript = `(() => {
    try {
      const saved = localStorage.getItem("clinika-theme");
      const preference = saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
      const theme = preference === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : preference;
      document.documentElement.dataset.theme = theme;
      document.documentElement.dataset.themePreference = preference;
    } catch (_) {}
  })();`;

  return (
    <html lang="es-MX" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div className="shell">
          <Sidebar view={view} />
          <div className="content">
            <header className="topbar">
              <div className="row">
                <Search size={17} />
                <span className="small">Buscar paciente, cita o tratamiento…</span>
              </div>
              <div className="row">
                <DemoViewSwitch value={view} />
                <Bell size={18} />
                <span className="avatar avatar-user">AL</span>
                <div>
                  <b className="user-name">Dra. Ana López</b>
                  <div className="small">Administradora</div>
                </div>
              </div>
            </header>
            {!activeProvider() && (
              <div className="ai-demo-banner" role="status">
                <b>IA en modo demostración.</b> Las respuestas de IA son ejemplos fijos porque no hay una llave de IA
                configurada (OPENAI_API_KEY o ANTHROPIC_API_KEY).
              </div>
            )}
            <main className="main">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
