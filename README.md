# Clinika AI

MVP funcional de gestión de consultorios para clínicas dentales y médicas en México. Reúne agenda, expediente, odontograma, presupuestos, caja, recordatorios y reportes con IA integrada en cada flujo. La interfaz está en español de México y todos los importes se muestran en MXN.

## Inicio rápido (3 comandos)

```bash
npm install
npm run db:setup
npm run dev
```

Abre `http://localhost:3000` e ingresa con `demo@clinika.mx` / `demo123`.

## Variables de entorno

Copia `.env.example` a `.env`. `DATABASE_URL="file:./dev.db"` usa SQLite. Para Postgres basta cambiar `provider` a `postgresql` en `prisma/schema.prisma` y definir una URL de Postgres. `ANTHROPIC_API_KEY` es opcional: si no existe, todas las funciones IA responden con mocks deterministas. `AI_MODEL` usa `claude-sonnet-5-5` por defecto.

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
- `npm run build`: build de producción.
- `npm run db:setup`: crea/aplica la migración y carga datos demo.
- `npm run lint`: ESLint.

## Roadmap

- Facturación CFDI 4.0 y conciliación.
- Integración oficial con WhatsApp Business API.
- Portal del paciente y consentimientos digitales.
- Multi-sucursal, inventario y permisos granulares.
- Endurecimiento para NOM-024-SSA3 y LFPDPPP: trazabilidad, cifrado, retención, avisos de privacidad y controles de acceso.

> Clinika AI es una demostración. Las sugerencias clínicas de IA no sustituyen el juicio profesional.
