import { ChevronDown, Search } from "lucide-solid";
import type { Filters } from "@/shared/types/legajo";

interface FilterBarProps {
  filters: Filters;
  onChange: (next: Filters) => void;
}

export default function FilterBar(props: FilterBarProps) {
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    props.onChange({ ...props.filters, [key]: value });
  };

  return (
    <div class="rounded-card border border-shell-border bg-white/72 p-5 shadow-card">
      <div class="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        <label class="grid min-w-0 gap-2.5 text-sm">
          <span class="pl-1 font-medium text-ink-soft">Busqueda general</span>
          <div class="flex items-center gap-3 rounded-[24px] border border-shell-border bg-white px-4 py-3 shadow-[0_8px_24px_rgba(23,38,61,0.05)] transition duration-150 focus-within:border-brand/40 focus-within:shadow-[0_12px_28px_rgba(34,84,140,0.10)]">
            <Search class="h-4 w-4 shrink-0 text-ink-faint" />
            <input
              value={props.filters.search}
              onInput={(event) => update("search", event.currentTarget.value)}
              placeholder="Numero, nombre, DNI o cargo..."
              class="w-full min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
            />
          </div>
        </label>
        <label class="grid min-w-0 gap-2.5 text-sm">
          <span class="pl-1 font-medium text-ink-soft">Estado</span>
          <div class="relative">
            <select
              value={props.filters.estado}
              onChange={(event) => update("estado", event.currentTarget.value as Filters["estado"])}
              class="w-full appearance-none rounded-[24px] border border-shell-border bg-white px-4 py-3 pr-11 text-sm text-ink shadow-[0_8px_24px_rgba(23,38,61,0.05)] transition duration-150 focus:border-brand/40 focus:outline-none focus:shadow-[0_12px_28px_rgba(34,84,140,0.10)]"
            >
              <option value="todos">Todos</option>
              <option value="activo">Activo</option>
              <option value="pasivo">Pasivo</option>
            </select>
            <ChevronDown class="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          </div>
        </label>
        <label class="grid min-w-0 gap-2.5 text-sm">
          <span class="pl-1 font-medium text-ink-soft">Unidad organica</span>
          <input
            value={props.filters.organo_unidad}
            onInput={(event) => update("organo_unidad", event.currentTarget.value)}
            placeholder="Filtrar por unidad"
            class="w-full min-w-0 rounded-[24px] border border-shell-border bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-faint shadow-[0_8px_24px_rgba(23,38,61,0.05)] transition duration-150 focus:border-brand/40 focus:outline-none focus:shadow-[0_12px_28px_rgba(34,84,140,0.10)]"
          />
        </label>
        <label class="grid min-w-0 gap-2.5 text-sm">
          <span class="pl-1 font-medium text-ink-soft">Regimen</span>
          <input
            value={props.filters.regimen_laboral}
            onInput={(event) => update("regimen_laboral", event.currentTarget.value)}
            placeholder="Filtrar por regimen"
            class="w-full min-w-0 rounded-[24px] border border-shell-border bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-faint shadow-[0_8px_24px_rgba(23,38,61,0.05)] transition duration-150 focus:border-brand/40 focus:outline-none focus:shadow-[0_12px_28px_rgba(34,84,140,0.10)]"
          />
        </label>
      </div>
    </div>
  );
}
