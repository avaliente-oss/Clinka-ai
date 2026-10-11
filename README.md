# Clinika AI

MVP funcional de gestión de consultorios para clínicas dentales y médicas en México. Reúne agenda, expediente, odontograma, presupuestos, caja, recordatorios y reportes con IA integrada en cada flujo. La interfaz está en español de México y todos los importes se muestran en MXN.

## Despliegue en Vercel

1. Importa este repositorio de GitHub como un proyecto nuevo en Vercel.
2. En el proyecto, abre **Storage**, crea una base de datos **Prisma Postgres** (o Neon) y conéctala al proyecto. Vercel añadirá `DATABASE_URL`.
3. Opcionalmente, añade `ANTHROPIC_API_KEY` en **Settings → Environment Variables** para usar Anthropic. Sin ella, las funciones de IA responden con datos demo deterministas. Puedes configurar `AI_MODEL`; el valor predeterminado es `claude-sonnet-5-5`.
4. Despliega el proyecto. El script `vercel-build` genera Prisma Client, aplica las migraciones, carga los datos demo de forma segura y compila Next.js automáticamente.

Al terminar, inicia sesión con `demo@clinika.mx` / `demo123`.

## Desarrollo local

Necesitas Node.js y una base de datos PostgreSQL (Prisma Postgres, Neon u otra) accesible desde tu equipo.

```bash
cp .env.example .env
# Sustituye DATABASE_URL en .env por tus URLs de PostgreSQL.
npm install
npm run db:setup
npm run dev
```

Abre `http://localhost:3000` e ingresa con `demo@clinika.mx` / `demo123`. La carga demo es idempotente: si la base ya contiene una clínica, no modifica sus datos.

## Incluye

- Dashboard con indicadores diarios e insights semanales.
- Agenda de dos semanas, alta de citas, estados y riesgo heurístico de inasistencia.
- 25 expedientes demo, historia SOAP, escriba con dictado del navegador, odontograma SVG de 32 piezas, tratamientos, pagos y metadatos de archivos.
- Presupuestos por partidas/fases, caja y saldos, recordatorios listos para copiar o abrir en WhatsApp.
- Reportes con Recharts: ingresos, estados de cita y tratamientos frecuentes.
- Plan de tratamiento, agenda inteligente, mensajería, copiloto del paciente e insights de negocio con módulos IA tipados con Zod.
- Autenticación demo local por cookie. Ninguna respuesta IA se guarda automáticamente; exige confirmación y muestra el aviso de revisión.

## Decisiones del MVP

El odontograma registra pieza, superficie y condición; la vista compacta colorea la pieza completa cuando existe un hallazgo. Los archivos guardan sólo metadatos. WhatsApp utiliza `wa.me` y no envía mensajes. La puntuación de inasistencia combina no-shows, anticipación, horario y confirmación de forma explicable. La autenticación es deliberadamente simple y no debe usarse en producción.

## Scripts

- `npm run dev`: servidor de desarrollo.
- `npm run build`: compilación de producción.
- `npm run vercel-build`: migra, carga datos demo y compila en Vercel.
- `npm run db:setup`: aplica las migraciones y carga datos demo.
- `npm run lint`: ESLint.

## Roadmap

- Facturación CFDI 4.0 y conciliación.
- Integración oficial con WhatsApp Business API.
- Portal del paciente y consentimientos digitales.
- Multi-sucursal, inventario y permisos granulares.
- Endurecimiento para NOM-024-SSA3 y LFPDPPP: trazabilidad, cifrado, retención, avisos de privacidad y controles de acceso.

> Clinika AI es una demostración. Las sugerencias clínicas de IA no sustituyen el juicio profesional.
