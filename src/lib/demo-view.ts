export const demoViews = ["clinica", "administracion", "todo"] as const;
export type DemoView = (typeof demoViews)[number];

export function parseDemoView(value: string | undefined): DemoView {
  return demoViews.includes(value as DemoView) ? (value as DemoView) : "todo";
}
