import { createMemo, createSignal, For } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import LegajoDetailPanel from "@/features/legajos/LegajoDetailPanel";
import type { LegajoDetail, Filters, LegajoSummary } from "@/shared/types/legajo";
import ActionButton from "@/shared/ui/ActionButton";
import DataGrid from "@/shared/ui/DataGrid";
import FilterBar from "@/shared/ui/FilterBar";
import IdentityCell from "@/shared/ui/IdentityCell";
import SectionCard from "@/shared/ui/SectionCard";
import SegmentedPills from "@/shared/ui/SegmentedPills";
import StatusPill from "@/shared/ui/StatusPill";

type SortKey =
  | "numero_legajo"
  | "apellidos_nombres"
  | "dni"
  | "organo_unidad"
  | "cargo_puesto"
  | "regimen_laboral"
  | "estado_legajo"
  | "ubicacion_legajo"
  | "total_adjuntos"
  | "updated_at";

interface LegajosPageProps {
  filters: Filters;
  legajos: LegajoSummary[];
  stats: { total: number; activos: number; pasivos: number };
  selectedLegajoId: number | null;
  detail?: LegajoDetail | null;
  selectedAttachmentId: number | null;
  onFiltersChange: (filters: Filters) => void;
  onSelectLegajo: (id: number) => void;
  onOpenAttachment: (attachmentId: number) => void;
  onSelectAttachment: (attachmentId: number) => void;
  onAttach: (detail: LegajoDetail) => void;
  onEdit: (detail: LegajoDetail) => void;
  onCreate: () => void;
  onExport: (format: "pdf" | "xlsx") => void;
  onResetFilters: () => void;
}

export default function LegajosPage(props: LegajosPageProps) {
  const [sort, setSort] = createSignal<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "updated_at",
    direction: "desc"
  });

  const sortedRows = createMemo(() => {
    const { key, direction } = sort();
    const multiplier = direction === "asc" ? 1 : -1;
    return [...props.legajos].sort((left, right) => compareValues(left[key], right[key], key) * multiplier);
  });

  const columns = createMemo<ColumnDef<LegajoSummary, unknown>[]>(() => [
    {
      accessorKey: "numero_legajo",
      header: sortButton("Numero", "numero_legajo", sort(), setSort),
      cell: (context) => (
        <div>
          <div class="inline-flex rounded-2xl border border-shell-border bg-white/82 px-3 py-2 font-semibold text-brand-deep">
            {context.row.original.numero_legajo}
          </div>
          <div class="mt-1 text-xs text-ink-soft">Act. {formatShortDate(context.row.original.updated_at)}</div>
        </div>
      )
    },
    {
      accessorKey: "apellidos_nombres",
      header: sortButton("Servidor/a", "apellidos_nombres", sort(), setSort),
      cell: (context) => (
        <IdentityCell name={context.row.original.apellidos_nombres} subtitle={context.row.original.cargo_puesto} />
      )
    },
    {
      accessorKey: "dni",
      header: sortButton("DNI", "dni", sort(), setSort),
      cell: (context) => (
        <span class="inline-flex rounded-2xl border border-shell-border bg-white/82 px-3 py-2 font-mono text-xs text-ink">
          {context.row.original.dni}
        </span>
      )
    },
    {
      accessorKey: "organo_unidad",
      header: sortButton("Area", "organo_unidad", sort(), setSort),
      cell: (context) => (
        <div>
          <div class="font-medium text-ink">{context.row.original.organo_unidad}</div>
          <div class="text-xs text-ink-soft">Area de trabajo</div>
        </div>
      )
    },
    {
      accessorKey: "cargo_puesto",
      header: sortButton("Cargo", "cargo_puesto", sort(), setSort),
      cell: (context) => context.row.original.cargo_puesto
    },
    {
      accessorKey: "regimen_laboral",
      header: sortButton("Tipo de contrato", "regimen_laboral", sort(), setSort),
      cell: (context) => (
        <span class="inline-flex rounded-2xl border border-shell-border bg-white/82 px-3 py-2 text-xs text-ink-soft">
          {context.row.original.regimen_laboral}
        </span>
      )
    },
    {
      accessorKey: "estado_legajo",
      header: sortButton("Estado", "estado_legajo", sort(), setSort),
      cell: (context) => <StatusPill value={context.row.original.estado_legajo} />
    },
    {
      accessorKey: "ubicacion_legajo",
      header: sortButton("Ubicacion", "ubicacion_legajo", sort(), setSort),
      cell: (context) => (
        <div>
          <div class="font-medium text-ink">{context.row.original.ubicacion_legajo || "Sin ubicacion"}</div>
          <div class="text-xs text-ink-soft">{context.row.original.origen_registro}</div>
        </div>
      )
    },
    {
      accessorKey: "total_adjuntos",
      header: sortButton("Adjuntos", "total_adjuntos", sort(), setSort),
      cell: (context) => (
        <span class="inline-flex min-w-10 items-center justify-center rounded-full bg-brand/8 px-3 py-2 text-xs font-semibold text-brand-deep">
          {context.row.original.total_adjuntos || 0}
        </span>
      )
    }
  ]);

  return (
    <div class="grid gap-5 xl:grid-cols-[minmax(0,1.48fr)_minmax(360px,0.92fr)]">
      <SectionCard
        eyebrow="Archivo maestro"
        title="Listado de legajos"
        class="bg-[radial-gradient(circle_at_top_right,rgba(86,193,207,0.10),transparent_20%),linear-gradient(180deg,rgba(255,253,249,0.98)_0%,rgba(246,239,231,0.96)_100%)]"
        aside={
          <div class="flex flex-wrap gap-3">
            <ActionButton variant="secondary" onClick={() => props.onExport("xlsx")}>
              Exportar Excel
            </ActionButton>
            <ActionButton variant="secondary" onClick={() => props.onExport("pdf")}>
              Exportar PDF
            </ActionButton>
          </div>
        }
      >
        <div class="grid gap-4">
          <div class="flex flex-col gap-4 rounded-card border border-shell-border bg-white/68 p-5 shadow-card lg:flex-row lg:items-center lg:justify-between">
            <SegmentedPills
              items={[
                { key: "todos", label: "Todos", count: props.stats.total },
                { key: "activo", label: "Activos", count: props.stats.activos },
                { key: "pasivo", label: "Pasivos", count: props.stats.pasivos }
              ]}
              value={props.filters.estado}
              onChange={(value) => props.onFiltersChange({ ...props.filters, estado: value })}
            />

            <div class="flex flex-wrap items-center gap-3">
              <div class="min-w-[180px]">
                <p class="text-[11px] uppercase tracking-[0.18em] text-ink-faint">Resultado actual</p>
                <strong class="mt-2 block text-base text-ink">
                  {sortedRows().length === 1 ? "1 registro visible" : `${sortedRows().length} registros visibles`}
                </strong>
              </div>
              <ActionButton variant="secondary" onClick={props.onResetFilters}>
                Limpiar filtros
              </ActionButton>
            </div>
          </div>

          <FilterBar filters={props.filters} onChange={props.onFiltersChange} />

          <div class="flex flex-wrap gap-2.5">
            <For each={activeFilterChips(props.filters, sort())}>
              {(chip) => (
                <span class="inline-flex items-center gap-2 rounded-full border border-shell-border bg-white/88 px-3.5 py-2 text-xs text-ink-soft shadow-[0_8px_20px_rgba(23,38,61,0.05)]">
                  <strong class="text-ink">{chip.label}</strong>
                  <span>{chip.value}</span>
                </span>
              )}
            </For>
          </div>

          <DataGrid
            data={sortedRows()}
            columns={columns()}
            selectedRowId={props.selectedLegajoId}
            getRowId={(row) => String(row.id)}
            onRowClick={(row) => props.onSelectLegajo(row.id)}
            emptyTitle="Sin coincidencias visibles"
            emptyDescription="Prueba ajustando los filtros o registrando un nuevo legajo."
          />
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Ficha viva"
        title="Detalle del legajo"
        class="xl:sticky xl:top-[104px] xl:max-h-[calc(100vh-122px)] xl:overflow-auto"
      >
        <LegajoDetailPanel
          detail={props.detail}
          selectedAttachmentId={props.selectedAttachmentId}
          onSelectAttachment={props.onSelectAttachment}
          onOpenAttachment={props.onOpenAttachment}
          onAttach={props.onAttach}
          onEdit={props.onEdit}
          onCreate={props.onCreate}
        />
      </SectionCard>
    </div>
  );
}

function sortButton(
  label: string,
  key: SortKey,
  sort: { key: SortKey; direction: "asc" | "desc" },
  setSort: (value: { key: SortKey; direction: "asc" | "desc" }) => void
) {
  return () => (
    <button
      type="button"
      class="inline-flex items-center gap-2 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-ink-faint"
      onClick={() => {
        if (sort.key === key) {
          setSort({ key, direction: sort.direction === "asc" ? "desc" : "asc" });
        } else {
          setSort({
            key,
            direction: key === "updated_at" || key === "total_adjuntos" ? "desc" : "asc"
          });
        }
      }}
    >
      {label}
      {sort.key === key && (
        <span class="rounded-full bg-brand/8 px-2 py-0.5 text-[10px] tracking-[0.16em] text-brand-deep">
          {sort.direction === "asc" ? "ASC" : "DESC"}
        </span>
      )}
    </button>
  );
}

function compareValues(left: unknown, right: unknown, key: SortKey) {
  if (key === "total_adjuntos") {
    return Number(left || 0) - Number(right || 0);
  }

  if (key === "updated_at") {
    return new Date(String(left || 0)).valueOf() - new Date(String(right || 0)).valueOf();
  }

  return String(left || "").localeCompare(String(right || ""), "es", {
    sensitivity: "base",
    numeric: true
  });
}

function activeFilterChips(filters: Filters, sort: { key: SortKey; direction: "asc" | "desc" }) {
  const chips = [];
  if (filters.search) chips.push({ label: "Busqueda", value: filters.search });
  if (filters.estado !== "todos") chips.push({ label: "Estado", value: filters.estado });
  if (filters.organo_unidad) chips.push({ label: "Area", value: filters.organo_unidad });
  if (filters.regimen_laboral) chips.push({ label: "Tipo de contrato", value: filters.regimen_laboral });
  chips.push({
    label: "Orden",
    value: `${humanizeSortKey(sort.key)} ${sort.direction === "asc" ? "ascendente" : "descendente"}`
  });
  return chips;
}

function humanizeSortKey(value: SortKey) {
  const labels: Record<SortKey, string> = {
    numero_legajo: "Numero de legajo",
    apellidos_nombres: "Nombre",
    dni: "DNI",
    organo_unidad: "Area",
    cargo_puesto: "Cargo",
    regimen_laboral: "Tipo de contrato",
    estado_legajo: "Estado",
    ubicacion_legajo: "Ubicacion",
    total_adjuntos: "Adjuntos",
    updated_at: "Actualizacion"
  };

  return labels[value];
}

function formatShortDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf())
    ? value
    : parsed.toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}
