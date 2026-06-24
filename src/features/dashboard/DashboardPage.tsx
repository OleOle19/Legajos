import { For, createMemo, onMount } from "solid-js";
import { animate } from "motion";
import type { DashboardStats, LegajoSummary } from "@/shared/types/legajo";
import MetricCard from "@/shared/ui/MetricCard";
import SectionCard from "@/shared/ui/SectionCard";

interface DashboardPageProps {
  stats: DashboardStats;
  visibleLegajos: LegajoSummary[];
  onNavigateLegajos: () => void;
  onNavigateOperaciones: () => void;
  onNewLegajo: () => void;
}

export default function DashboardPage(props: DashboardPageProps) {
  let rootRef: HTMLDivElement | undefined;

  onMount(() => {
    if (rootRef) {
      animate(
        Array.from(rootRef.querySelectorAll("[data-animate]")) as any,
        { opacity: [0, 1], y: [18, 0] } as any,
        { duration: 0.44, delay: 0.04, easing: "ease-out" } as any
      );
    }
  });

  const visibleStats = createMemo(() => {
    const rows = props.visibleLegajos;
    const visibles = rows.length;
    const sinAdjuntos = rows.filter((item) => Number(item.total_adjuntos || 0) === 0).length;
    const sinUbicacion = rows.filter((item) => !String(item.ubicacion_legajo || "").trim()).length;
    const total = props.stats.total || visibles;
    const recientes = props.stats.recientes.length;

    return {
      visibles,
      sinAdjuntos,
      sinUbicacion,
      recientes,
      coberturaAdjuntos: toPercent(visibles - sinAdjuntos, visibles),
      coberturaUbicacion: toPercent(visibles - sinUbicacion, visibles),
      ratioActivos: toPercent(props.stats.activos, total),
      ratioPasivos: toPercent(props.stats.pasivos, total)
    };
  });

  const metricCards = createMemo(() => [
    { label: "Total de legajos", value: props.stats.total, note: "Relación consolidada", tone: "brand" as const },
    { label: "Activos", value: props.stats.activos, note: "Legajos en uso", tone: "success" as const },
    { label: "Pasivos", value: props.stats.pasivos, note: "Custodia histórica", tone: "warning" as const },
    { label: "Sin ubicación", value: props.stats.sinUbicacion, note: "Revisar archivo físico", tone: "neutral" as const },
    { label: "Adjuntos", value: props.stats.adjuntos, note: "Soporte digital asociado", tone: "brand" as const }
  ]);

  const regimenRows = createMemo(() => groupByRegimen(props.visibleLegajos));

  return (
    <div ref={rootRef} class="grid gap-5">
      <section
        data-animate
        class="relative overflow-hidden rounded-shell border border-white/90 bg-[radial-gradient(circle_at_top_right,rgba(86,193,207,0.22),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(213,140,60,0.15),transparent_22%),linear-gradient(140deg,rgba(255,253,249,1)_0%,rgba(247,240,230,0.98)_100%)] px-7 py-7 shadow-shell"
      >
        <div class="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,rgba(21,37,60,1)_0%,rgba(34,84,140,1)_52%,rgba(86,193,207,1)_100%)]" />
        <div class="grid gap-6 xl:grid-cols-[minmax(0,1.06fr)_390px]">
          <div>
            <p class="text-[11px] uppercase tracking-[0.22em] text-brand-warm">Vista ejecutiva</p>
            <h2 class="mt-3 max-w-4xl font-display text-[clamp(2.6rem,5vw,4.2rem)] font-semibold leading-[0.94] tracking-[-0.05em] text-ink">
              Panorama operativo del archivo de legajos
            </h2>
            <p class="mt-4 max-w-3xl text-[15px] leading-7 text-ink-soft">
              Revisa el padrón activo y pasivo, controla la cobertura documental y entra rápido a las
              operaciones que hoy realmente importan.
            </p>

            <div class="mt-7 grid gap-3 md:grid-cols-3">
              <OverviewTile
                label="Base visible"
                value={visibleStats().visibles}
                note="Registros listos para consulta diaria."
                tone="brand"
              />
              <OverviewTile
                label="Cobertura documental"
                value={`${visibleStats().coberturaAdjuntos}%`}
                note={`${Math.max(visibleStats().visibles - visibleStats().sinAdjuntos, 0)} con adjuntos internos.`}
                tone={visibleStats().sinAdjuntos ? "warning" : "success"}
              />
              <OverviewTile
                label="Ubicación trazable"
                value={`${visibleStats().coberturaUbicacion}%`}
                note={`${Math.max(visibleStats().visibles - visibleStats().sinUbicacion, 0)} con ubicación visible.`}
                tone={visibleStats().sinUbicacion ? "warning" : "success"}
              />
            </div>
          </div>

          <div class="rounded-[28px] border border-shell-border bg-white/90 p-5 shadow-card">
            <p class="text-[11px] uppercase tracking-[0.22em] text-ink-soft">Estado general hoy</p>
            <div class="mt-5 grid gap-4">
              <ProgressPanel
                label="Legajos activos"
                value={visibleStats().ratioActivos}
                hint={`${props.stats.activos} en atencion corriente`}
                tone="brand"
              />
              <ProgressPanel
                label="Cobertura con adjuntos"
                value={visibleStats().coberturaAdjuntos}
                hint={`${visibleStats().sinAdjuntos} pendientes de digitalizacion`}
                tone={visibleStats().sinAdjuntos ? "warning" : "success"}
              />
              <ProgressPanel
                label="Ubicación documentada"
                value={visibleStats().coberturaUbicacion}
                hint={`${visibleStats().sinUbicacion} con ubicación por revisar`}
                tone={visibleStats().sinUbicacion ? "danger" : "success"}
              />
            </div>

            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              <StatusNote
                label="Movimientos recientes"
                value={visibleStats().recientes}
                note="Eventos recientes registrados en el archivo."
              />
              <StatusNote
                label="Archivo pasivo"
                value={`${visibleStats().ratioPasivos}%`}
                note="Participacion visible del legajo pasivo."
              />
            </div>
          </div>
        </div>
      </section>

      <div class="grid gap-4 xl:grid-cols-5" data-animate>
        <For each={metricCards()}>{(card) => <MetricCard {...card} />}</For>
      </div>

      <div class="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <SectionCard eyebrow="Atencion inmediata" title="Lo crucial ahora" class="bg-shell-panel-strong/95" bodyClass="grid gap-3">
          <ActionTile
            title="Revisar padrón principal"
            note="Entrar al listado completo, buscar por DNI, nombre o número de legajo."
            meta={`${visibleStats().visibles} visibles`}
            onClick={props.onNavigateLegajos}
            tone="brand"
          />
          <ActionTile
            title="Registrar nueva ficha"
            note="Crear un legajo con trazabilidad inicial y datos obligatorios completos."
            meta={`${props.stats.total} totales`}
            onClick={props.onNewLegajo}
            tone="success"
          />
          <ActionTile
            title="Importar o exportar"
            note="Continuar carga desde Excel, generar PDF o emitir una copia operativa."
            meta={`${visibleStats().recientes} movs. recientes`}
            onClick={props.onNavigateOperaciones}
            tone="warning"
          />
        </SectionCard>

        <SectionCard eyebrow="Composicion visible" title="Distribucion por tipo de contrato" class="bg-shell-panel-strong/95">
          <div class="grid gap-3">
            <For each={regimenRows()}>
              {(item) => (
                <article class="rounded-3xl border border-shell-border bg-white/86 p-4 shadow-card">
                  <div class="flex items-end justify-between gap-3">
                    <div>
                      <strong class="block text-base text-ink">{item.label}</strong>
                      <span class="mt-1 block text-xs text-ink-soft">{item.count} legajo(s) visibles</span>
                    </div>
                    <span class="text-2xl font-bold tracking-[-0.04em] text-brand-deep">{item.ratio}%</span>
                  </div>
                  <div class="mt-4 h-3 overflow-hidden rounded-full bg-[#e7eef6]">
                    <div class="h-full rounded-full bg-[linear-gradient(90deg,rgba(21,37,60,1)_0%,rgba(34,84,140,1)_65%,rgba(86,193,207,1)_100%)]" style={{ width: `${item.ratio}%` }} />
                  </div>
                </article>
              )}
            </For>
            {regimenRows().length === 0 && (
              <div class="grid min-h-[250px] place-items-center rounded-3xl border border-dashed border-shell-border bg-white/70 px-6 text-center">
                <div class="max-w-[320px]">
                  <strong class="text-base text-ink">Aún no hay tipos de contrato visibles</strong>
                  <p class="mt-2 text-sm leading-6 text-ink-soft">
                    Cuando registres o importes legajos, aquí verás su reparto por tipo de contrato.
                  </p>
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SectionCard eyebrow="Salud documental" title="Cobertura del archivo" class="bg-shell-panel-strong/95">
          <div class="grid gap-4 md:grid-cols-2">
            <CoverageCard
              label="Adjuntos internos"
              value={visibleStats().coberturaAdjuntos}
              count={`${Math.max(visibleStats().visibles - visibleStats().sinAdjuntos, 0)} cubiertos`}
              tone={visibleStats().sinAdjuntos ? "warning" : "success"}
            />
            <CoverageCard
              label="Ubicacion visible"
              value={visibleStats().coberturaUbicacion}
              count={`${Math.max(visibleStats().visibles - visibleStats().sinUbicacion, 0)} registrados`}
              tone={visibleStats().sinUbicacion ? "danger" : "success"}
            />
            <CoverageCard
              label="Legajo activo"
              value={visibleStats().ratioActivos}
              count={`${props.stats.activos} en curso`}
              tone="brand"
            />
            <CoverageCard
              label="Custodia pasiva"
              value={visibleStats().ratioPasivos}
              count={`${props.stats.pasivos} historicos`}
              tone="neutral"
            />
          </div>
        </SectionCard>

        <SectionCard eyebrow="Actividad reciente" title="Últimos movimientos" class="bg-shell-panel-strong/95">
          <div class="grid gap-3">
            <For each={props.stats.recientes}>
              {(item) => (
                <article class="rounded-3xl border border-shell-border bg-white/86 p-4 shadow-card">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0">
                      <strong class="block text-sm text-ink">{item.apellidos_nombres}</strong>
                      <p class="mt-2 text-sm leading-6 text-ink-soft">{item.detalle}</p>
                    </div>
                    <span class="rounded-full bg-brand/10 px-3 py-1 text-[11px] font-semibold capitalize text-brand-deep">
                      {humanizeMovement(item.tipo_movimiento)}
                    </span>
                  </div>
                  <p class="mt-3 text-xs text-ink-soft">{new Date(item.fecha).toLocaleString("es-PE")}</p>
                </article>
              )}
            </For>
            {props.stats.recientes.length === 0 && (
              <div class="rounded-3xl border border-dashed border-shell-border bg-white/70 px-5 py-8 text-center text-sm text-ink-soft">
                Aún no hay movimientos registrados para mostrar en el inicio.
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function OverviewTile(props: {
  label: string;
  value: string | number;
  note: string;
  tone: "brand" | "success" | "warning";
}) {
  const toneStyles = {
    brand: "border-brand/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(232,241,250,0.92)_100%)]",
    success: "border-success/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(233,246,240,0.92)_100%)]",
    warning: "border-warning/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(249,241,228,0.94)_100%)]"
  }[props.tone];

  return (
    <article class={`rounded-3xl border p-4 shadow-card ${toneStyles}`}>
      <p class="text-[11px] uppercase tracking-[0.18em] text-ink-soft">{props.label}</p>
      <strong class="mt-2 block text-3xl font-bold tracking-[-0.04em] text-ink">{props.value}</strong>
      <p class="mt-2 text-sm leading-6 text-ink-soft">{props.note}</p>
    </article>
  );
}

function ProgressPanel(props: {
  label: string;
  value: number;
  hint: string;
  tone: "brand" | "success" | "warning" | "danger";
}) {
  const toneStyles = {
    brand: "bg-[linear-gradient(90deg,rgba(21,37,60,1)_0%,rgba(34,84,140,1)_65%,rgba(86,193,207,1)_100%)]",
    success: "bg-[linear-gradient(90deg,rgba(47,125,92,1)_0%,rgba(79,196,140,1)_100%)]",
    warning: "bg-[linear-gradient(90deg,rgba(154,104,45,1)_0%,rgba(220,168,89,1)_100%)]",
    danger: "bg-[linear-gradient(90deg,rgba(162,79,88,1)_0%,rgba(217,112,123,1)_100%)]"
  }[props.tone];

  return (
    <div class="rounded-3xl border border-shell-border bg-[#fcfbf8] p-4">
      <div class="flex items-center justify-between gap-3">
        <strong class="text-sm text-ink">{props.label}</strong>
        <span class="text-sm font-semibold text-ink">{props.value}%</span>
      </div>
      <div class="mt-3 h-2.5 overflow-hidden rounded-full bg-[#e6dfd4]">
        <div class={`h-full rounded-full ${toneStyles}`} style={{ width: `${props.value}%` }} />
      </div>
      <p class="mt-3 text-sm text-ink-soft">{props.hint}</p>
    </div>
  );
}

function StatusNote(props: { label: string; value: string | number; note: string }) {
  return (
    <div class="rounded-3xl border border-shell-border bg-[#fcfbf8] p-4">
      <p class="text-[11px] uppercase tracking-[0.18em] text-ink-soft">{props.label}</p>
      <strong class="mt-2 block text-2xl font-bold tracking-[-0.04em] text-ink">{props.value}</strong>
      <p class="mt-2 text-sm leading-6 text-ink-soft">{props.note}</p>
    </div>
  );
}

function ActionTile(props: {
  title: string;
  note: string;
  meta: string;
  onClick: () => void;
  tone: "brand" | "success" | "warning";
}) {
  const toneStyles = {
    brand: "before:bg-brand",
    success: "before:bg-success",
    warning: "before:bg-warning"
  }[props.tone];

  return (
    <button
      type="button"
      onClick={props.onClick}
      class={`relative overflow-hidden rounded-3xl border border-shell-border bg-white/88 px-5 py-5 text-left shadow-card transition duration-200 hover:-translate-y-0.5 hover:bg-white ${toneStyles} before:absolute before:bottom-0 before:left-0 before:top-0 before:w-1.5 before:content-['']`}
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <strong class="block text-base text-ink">{props.title}</strong>
          <p class="mt-2 text-sm leading-6 text-ink-soft">{props.note}</p>
        </div>
        <span class="rounded-full bg-[#eef3f9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-deep">
          {props.meta}
        </span>
      </div>
    </button>
  );
}

function CoverageCard(props: {
  label: string;
  value: number;
  count: string;
  tone: "brand" | "success" | "warning" | "danger" | "neutral";
}) {
  const toneStyles = {
    brand: "from-[#edf4fb] to-white",
    success: "from-[#edf7f1] to-white",
    warning: "from-[#fbf3e8] to-white",
    danger: "from-[#faecee] to-white",
    neutral: "from-[#f1f4f7] to-white"
  }[props.tone];

  return (
    <article class={`rounded-3xl border border-shell-border bg-gradient-to-br ${toneStyles} p-4 shadow-card`}>
      <div class="flex items-end justify-between gap-3">
        <div>
          <p class="text-[11px] uppercase tracking-[0.18em] text-ink-soft">{props.label}</p>
          <strong class="mt-2 block text-3xl font-bold tracking-[-0.04em] text-ink">{props.value}%</strong>
        </div>
        <span class="text-xs font-medium text-ink-soft">{props.count}</span>
      </div>
      <div class="mt-4 h-2.5 overflow-hidden rounded-full bg-[#e5ddd1]">
        <div class="h-full rounded-full bg-brand-gradient" style={{ width: `${props.value}%` }} />
      </div>
    </article>
  );
}

function groupByRegimen(rows: LegajoSummary[]) {
  const total = rows.length || 1;
  const grouped = new Map<string, number>();

  for (const row of rows) {
    const key = String(row.regimen_laboral || "Sin contrato").trim() || "Sin contrato";
    grouped.set(key, (grouped.get(key) || 0) + 1);
  }

  return [...grouped.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => ({
      label,
      count,
      ratio: Math.round((count / total) * 100)
    }));
}

function humanizeMovement(type: string) {
  const labels: Record<string, string> = {
    creacion: "Creacion",
    edicion: "Edicion",
    cambio_estado: "Cambio de estado",
    cambio_ubicacion: "Cambio de ubicacion",
    adjunto: "Adjunto"
  };

  return labels[type] || type;
}

function toPercent(value: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}
