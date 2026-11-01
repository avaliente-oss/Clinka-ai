"use client";

const options = [["O", "O"], ["M", "M"], ["D", "D"], ["V", "V"], ["LP", "L/P"]] as const;

export function SurfaceSelector({
  value,
  onChange,
  label = "Superficies",
}: {
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
}) {
  function toggle(surface: string) {
    onChange(
      value.includes(surface)
        ? value.filter((item) => item !== surface)
        : [...value, surface],
    );
  }

  return (
    <div className="surface-picker" aria-label={label}>
      {options.map(([surface, label]) => (
        <button
          className="surface-chip"
          aria-pressed={value.includes(surface)}
          key={surface}
          onClick={() => toggle(surface)}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
