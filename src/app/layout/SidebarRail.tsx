import { FileSpreadsheet, FolderArchive, LayoutGrid } from "lucide-solid";
import { For } from "solid-js";
import { cn } from "@/shared/lib/cn";

interface SidebarRailProps {
  route: "dashboard" | "legajos" | "operaciones";
  onNavigate: (route: "/dashboard" | "/legajos" | "/operaciones") => void;
  search: string;
  onSearch: (value: string) => void;
}

const navItems = [
  { id: "dashboard", label: "Inicio", value: "/dashboard" as const, icon: LayoutGrid },
  { id: "legajos", label: "Legajos", value: "/legajos" as const, icon: FileSpreadsheet },
  { id: "operaciones", label: "Importación y respaldo", value: "/operaciones" as const, icon: FolderArchive }
];

export default function SidebarRail(props: SidebarRailProps) {
  return (
    <aside class="relative flex flex-col gap-5 overflow-hidden rounded-shell border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(86,193,207,0.28),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(213,140,60,0.28),transparent_24%),linear-gradient(180deg,rgba(18,37,61,1)_0%,rgba(22,52,91,1)_52%,rgba(16,31,50,1)_100%)] px-5 py-6 text-white shadow-shell xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-auto">
      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)] lg:items-end xl:grid-cols-1">
        <div>
          <p class="text-[11px] uppercase tracking-[0.22em] text-white/78">Archivo de RR. HH.</p>
          <h1 class="mt-3 font-display text-[2.35rem] font-semibold leading-none tracking-[-0.05em] sm:text-[2.6rem]">
            Legajo RH
          </h1>
          <p class="mt-3 max-w-[13rem] text-[13px] leading-5 text-white/84">
            Custodia local de legajos con trazabilidad documental.
          </p>
        </div>

        <label class="rounded-3xl border border-white/16 bg-white/14 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <input
            value={props.search}
            onInput={(event) => props.onSearch(event.currentTarget.value)}
            placeholder="Buscar legajo o DNI..."
            class="w-full bg-transparent text-sm text-white placeholder:text-white/72 focus:outline-none"
          />
        </label>
      </div>

      <nav class="grid gap-2 md:grid-cols-3 xl:grid-cols-1">
        <For each={navItems}>
          {(item, index) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                onClick={() => props.onNavigate(item.value)}
                class={cn(
                  "flex items-center gap-3 rounded-3xl border px-4 py-3 text-left transition duration-200 md:min-h-[92px] xl:min-h-0",
                  props.route === item.id
                    ? "border-white/22 bg-white/16 shadow-card"
                    : "border-transparent bg-white/10 text-white/88 hover:bg-white/14"
                )}
              >
                <span class="grid h-10 w-10 place-items-center rounded-2xl bg-white/14 text-white">
                  <Icon size={18} />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block text-[11px] uppercase tracking-[0.2em] text-white/68">
                    0{index() + 1}
                  </span>
                  <span class="mt-1 block text-sm font-semibold">{item.label}</span>
                </span>
              </button>
            );
          }}
        </For>
      </nav>
    </aside>
  );
}
