import { redirect } from "next/navigation";
import Image from "next/image";
import { login } from "@/lib/auth";

async function enter() {
  "use server";

  await login();
  redirect("/");
}

export default function LoginPage() {
  return (
    <div className="login login-overlay">
      <div className="card">
        <div className="login-brand">
          <Image
            className="login-logo"
            src="/davalsy-logo.png"
            alt="Davalsy Solutions"
            width={215}
            height={53}
            priority
          />
          <div className="login-product">
            Clinika <span className="brand-ai">AI</span>
          </div>
          <div className="login-byline">by Davalsy Solutions</div>
        </div>
        <div className="eyebrow">Acceso demo</div>
        <h1>Bienvenida de vuelta</h1>
        <p className="subtitle">Gestión clínica inteligente para tu equipo.</p>
        <form action={enter} className="login-form">
          <div className="field">
            <label>Correo</label>
            <input className="input" value="demo@clinika.mx" readOnly />
          </div>
          <div className="field top-gap">
            <label>Contraseña</label>
            <input
              className="input"
              type="password"
              value="demo123"
              readOnly
            />
          </div>
          <button className="btn primary full-button">Entrar a la demo</button>
        </form>
        <p className="small centered login-note">
          Sesión local por cookie · sin proveedores externos
        </p>
      </div>
    </div>
  );
}
