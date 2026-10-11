# Sistema de diseño DAVALSY · Clinika AI

Clinika AI usa un mismo sistema visual en temas claro y oscuro. El tema sólo cambia tokens; la estructura, densidad, radios y comportamiento permanecen iguales.

## Tokens

- `--primary`: teal DAVALSY para acciones, selección, foco y navegación activa.
- `--success`: verde, sólo para confirmación, atención terminada o métricas positivas.
- `--warning`: naranja, sólo para advertencias, riesgo medio y pagos pendientes.
- `--danger`: rojo, sólo para error, riesgo alto y acciones destructivas.
- `--background`, `--surface`, `--surface-raised`, `--text`, `--text-muted` y `--border`: superficies y contraste semánticos por tema.
- Tipografía: Sora; si no carga, Inter y la fuente sans-serif del sistema.

Los tokens viven en `src/app/globals.css`. El tema oscuro se activa con `[data-theme="dark"]`; el sistema operativo es la preferencia inicial.

## Temas

El selector **Claro / Oscuro / Sistema** está en la barra lateral y persiste en `localStorage`. Un script en el layout resuelve el tema antes de pintar para evitar destellos. La opción Sistema escucha cambios del sistema operativo.

## Componentes

Las clases globales forman la base reutilizable: `.btn` con variantes `primary`, `ghost` y `danger`; `.input` para input, select y textarea; `.tabs`; `.badge`; `.notice`; `.card`; `.kpi`; `.table`; y estilos de estado vacío mediante `.empty-state`. Modales o drawers futuros deben usar `--surface-raised`, el radio común y el mismo foco visible.

## Reglas

- Espaciado en múltiplos de 4, densidad media, bordes finos, radios de 6–8 px y sombras mínimas.
- Sin gradientes, glassmorphism, colores decorativos ni tarjetas arcoíris.
- Los estados siempre incluyen texto o icono, nunca sólo color.
- Confirmada/atendida usan éxito; agendada, teal o neutral; cancelada/no asistió/riesgo alto, peligro; riesgo medio y pago pendiente, advertencia.
- Los gráficos leen variables CSS: teal como serie principal y neutros como series secundarias; los colores semánticos sólo describen estados.
- Todo control interactivo debe conservar hover, disabled y foco visible en ambos temas.
