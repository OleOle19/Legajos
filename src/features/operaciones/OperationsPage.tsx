import { For, createEffect, createMemo, createSignal } from "solid-js";
import ActionButton from "@/shared/ui/ActionButton";
import SectionCard from "@/shared/ui/SectionCard";
import { CONTRACT_TYPE_OPTIONS, type Filters } from "@/shared/types/legajo";

interface OperationsPageProps {
  filters: Filters;
  areas: string[];
  onImport: () => void;
  onBackup: () => void;
  onExport: (format: "pdf" | "xlsx", filters: Partial<Filters>) => void;
  onSaveTemplate: () => void;
  importSummary?: string | null;
}

type ExportScope = "current" | "all" | "area" | "contract";

export default function OperationsPage(props: OperationsPageProps) {
  const [scope, setScope] = createSignal<ExportScope>("current");
  const [selectedArea, setSelectedArea] = createSignal("");
  const [selectedContract, setSelectedContract] = createSignal<string>(CONTRACT_TYPE_OPTIONS[0] ?? "");

  createEffect(() => {
    if (!selectedArea() && props.areas.length) {
      setSelectedArea(props.areas[0]);
    }
  });

  const scopeDescription = createMemo(() => {
    switch (scope()) {
      case "all":
        return "Se exportarán todos los legajos del archivo.";
      case "area":
        return selectedArea().trim()
          ? `Se exportarán solo los legajos del área ${selectedArea().trim()}.`
          : "Selecciona un área para preparar la exportación.";
      case "contract":
        return selectedContract().trim()
          ? `Se exportarán solo los legajos del contrato ${selectedContract().trim()}.`
          : "Selecciona un tipo de contrato para preparar la exportación.";
      default:
        return "Se exportarán los legajos que coincidan con los filtros actuales.";
    }
  });

  const exportFilters = createMemo(() => {
    switch (scope()) {
      case "all":
        return {};
      case "area":
        return { organo_unidad: selectedArea().trim() };
      case "contract":
        return { regimen_laboral: selectedContract().trim() };
      default:
        return props.filters;
    }
  });

  return (
    <div class="grid gap-5 xl:grid-cols-3">
      <SectionCard eyebrow="Carga inicial" title="Importar desde Excel de RR. HH." class="xl:col-span-1">
        <p class="text-sm leading-7 text-ink-soft">
          Descarga la plantilla nueva o importa el libro de RR. HH. con varias hojas. Si el número de legajo ya existe,
          la fila actualizará el registro y conservará la trazabilidad.
        </p>
        <div class="mt-6 flex flex-wrap gap-3">
          <ActionButton variant="secondary" onClick={props.onSaveTemplate}>
            Guardar plantilla
          </ActionButton>
          <ActionButton variant="primary" onClick={props.onImport}>
            Importar legajos
          </ActionButton>
        </div>
        <div class="mt-6 rounded-3xl border border-dashed border-shell-border bg-white/60 p-4 text-sm text-ink-soft">
          {props.importSummary ?? "Aún no se ha realizado una importación en esta sesión. La plantilla ahora incluye tipo de contrato y columnas comunes entre hojas."}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Salida administrativa" title="Exportaciones normativas" class="xl:col-span-1">
        <p class="text-sm leading-7 text-ink-soft">
          Genera la relación digital completa o filtrada según el alcance que elijas antes de exportar.
        </p>

        <div class="mt-5 grid gap-4">
          <label class="grid gap-2 text-sm">
            <span class="pl-1 font-medium text-ink-soft">Alcance de exportación</span>
            <select
              value={scope()}
              onChange={(event) => setScope(event.currentTarget.value as ExportScope)}
              class="w-full rounded-3xl border border-shell-border bg-white px-4 py-3 text-ink outline-none transition duration-150 focus:border-brand/35 focus:ring-2 focus:ring-brand-accent/20"
            >
              <option value="current">Filtros actuales</option>
              <option value="all">Todos los legajos</option>
              <option value="area">Por área</option>
              <option value="contract">Por tipo de contrato</option>
            </select>
          </label>

          {scope() === "area" && (
            <label class="grid gap-2 text-sm">
              <span class="pl-1 font-medium text-ink-soft">Área</span>
              <select
                value={selectedArea()}
                onChange={(event) => setSelectedArea(event.currentTarget.value)}
                class="w-full rounded-3xl border border-shell-border bg-white px-4 py-3 text-ink outline-none transition duration-150 focus:border-brand/35 focus:ring-2 focus:ring-brand-accent/20"
              >
                <For each={props.areas}>
                  {(area) => <option value={area}>{area}</option>}
                </For>
              </select>
            </label>
          )}

          {scope() === "contract" && (
            <label class="grid gap-2 text-sm">
              <span class="pl-1 font-medium text-ink-soft">Tipo de contrato</span>
              <select
                value={selectedContract()}
                onChange={(event) => setSelectedContract(event.currentTarget.value)}
                class="w-full rounded-3xl border border-shell-border bg-white px-4 py-3 text-ink outline-none transition duration-150 focus:border-brand/35 focus:ring-2 focus:ring-brand-accent/20"
              >
                <For each={CONTRACT_TYPE_OPTIONS}>
                  {(option) => <option value={option}>{option}</option>}
                </For>
              </select>
            </label>
          )}

          <div class="rounded-3xl border border-shell-border bg-white/60 p-4 text-sm leading-7 text-ink-soft">
            {scopeDescription()}
          </div>
        </div>

        <div class="mt-6 grid gap-3 sm:grid-cols-2">
          <ActionButton variant="secondary" onClick={() => props.onExport("xlsx", exportFilters())}>
            Exportar Excel
          </ActionButton>
          <ActionButton variant="secondary" onClick={() => props.onExport("pdf", exportFilters())}>
            Exportar PDF
          </ActionButton>
        </div>

        <div class="mt-6 rounded-3xl border border-shell-border bg-white/60 p-4 text-sm text-ink-soft">
          Filtros actuales: estado <strong class="text-ink">{props.filters.estado}</strong>, búsqueda{" "}
          <strong class="text-ink">{props.filters.search || "sin texto"}</strong>.
        </div>
      </SectionCard>

      <SectionCard eyebrow="Continuidad operativa" title="Respaldos locales" class="xl:col-span-1">
        <p class="text-sm leading-7 text-ink-soft">
          Crea una copia local de la base de datos y los adjuntos internos para mantener continuidad operativa.
        </p>
        <div class="mt-6 grid gap-3">
          <ActionButton variant="primary" onClick={props.onBackup}>
            Crear respaldo ahora
          </ActionButton>
        </div>
        <div class="mt-6 rounded-3xl border border-shell-border bg-brand/5 p-4 text-sm text-ink-soft">
          La exportación y el respaldo siguen usando el flujo Tauri actual. La importación ahora entiende libros de
          RR. HH. con varias hojas, fechas numéricas de Excel y el tipo de contrato por hoja.
        </div>
      </SectionCard>
    </div>
  );
}
