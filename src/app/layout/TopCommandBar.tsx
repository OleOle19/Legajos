import type { JSX } from "solid-js";
import ActionButton from "@/shared/ui/ActionButton";
import { cn } from "@/shared/lib/cn";

interface TopCommandBarProps {
  search: string;
  onSearch: (value: string) => void;
  onBackup: () => void;
  onNewLegajo: () => void;
  scrolled: boolean;
}

export default function TopCommandBar(props: TopCommandBarProps): JSX.Element {
  return (
    <header
      class={cn(
        "overflow-hidden rounded-b-[28px] border bg-[linear-gradient(120deg,rgba(255,252,248,0.995)_0%,rgba(245,237,226,0.985)_100%)] px-4 py-4 shadow-card transition duration-200 sm:px-5 sm:py-5 md:px-6",
        props.scrolled ? "border-[#ebdfd1] shadow-shell" : "border-white/80"
      )}
    >
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex min-w-0 flex-1">
          <label class="flex w-full items-center gap-3 rounded-3xl border border-shell-border bg-white/90 px-4 py-3.5 shadow-card">
            <span class="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-deep">Buscar</span>
            <input
              value={props.search}
              onInput={(event) => props.onSearch(event.currentTarget.value)}
            placeholder="Buscar por legajo, nombre, DNI, área o cargo..."
              class="w-full bg-transparent text-sm text-ink placeholder:text-ink-soft focus:outline-none"
            />
          </label>
        </div>

        <div class="flex flex-wrap items-center gap-3 lg:justify-end">
          <div class="inline-flex items-center gap-2 rounded-full border border-shell-border bg-white/90 px-4 py-2.5 text-xs font-semibold text-ink">
            <span class="h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_0_6px_rgba(47,125,92,0.15)]" />
            Operación local segura
          </div>
          <ActionButton variant="secondary" onClick={props.onBackup}>
            Crear respaldo
          </ActionButton>
          <ActionButton variant="primary" onClick={props.onNewLegajo}>
            Nuevo legajo
          </ActionButton>
        </div>
      </div>
    </header>
  );
}
