import { createMemo } from "solid-js";

interface IdentityCellProps {
  name: string;
  subtitle: string;
}

export default function IdentityCell(props: IdentityCellProps) {
  const initials = createMemo(() =>
    props.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "RH"
  );

  return (
    <div class="flex items-center gap-3">
      <div class="grid h-10 w-10 place-items-center rounded-2xl bg-brand-gradient text-xs font-bold text-white shadow-card">
        {initials()}
      </div>
      <div class="min-w-0">
        <div class="truncate font-semibold text-ink">{props.name}</div>
        <div class="truncate text-xs text-ink-soft">{props.subtitle}</div>
      </div>
    </div>
  );
}

