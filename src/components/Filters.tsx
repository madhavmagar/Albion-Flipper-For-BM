"use client";

import { CATEGORIES, CITIES, TIERS, MATERIAL_TYPES, type Category } from "@/lib/constants";
import { Chip } from "./ui";

export function CategoryChips({
  selected,
  onToggle,
  onClear,
}: {
  selected: Category[];
  onToggle: (c: Category) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip active={selected.length === 0} onClick={onClear}>
        All
      </Chip>
      {CATEGORIES.map((c) => (
        <Chip key={c} active={selected.includes(c)} onClick={() => onToggle(c)}>
          {c}
        </Chip>
      ))}
    </div>
  );
}

export function TierChips({
  selected,
  onToggle,
  onClear,
}: {
  selected: number[];
  onToggle: (t: number) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Chip active={selected.length === 0} onClick={onClear}>
        All tiers
      </Chip>
      {TIERS.map((t) => (
        <Chip key={t} active={selected.includes(t)} onClick={() => onToggle(t)}>
          T{t}
        </Chip>
      ))}
    </div>
  );
}

export function CityChips({
  selected,
  onToggle,
  onClear,
}: {
  selected: string[];
  onToggle: (c: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Chip active={selected.length === 0} onClick={onClear}>
        All cities
      </Chip>
      {CITIES.map((c) => (
        <Chip key={c} active={selected.includes(c)} onClick={() => onToggle(c)}>
          {c}
        </Chip>
      ))}
    </div>
  );
}

export function MaterialTypeChips({
  selected,
  onToggle,
  onClear,
}: {
  selected: string[];
  onToggle: (t: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip active={selected.length === 0} onClick={onClear}>
        All types
      </Chip>
      {MATERIAL_TYPES.map((t) => (
        <Chip key={t} active={selected.includes(t)} onClick={() => onToggle(t)}>
          {t}
        </Chip>
      ))}
    </div>
  );
}

export const SORT_OPTIONS = [
  { value: "profit", label: "Profit" },
  { value: "margin", label: "Margin %" },
  { value: "tier", label: "Tier" },
  { value: "name", label: "Name" },
] as const;
