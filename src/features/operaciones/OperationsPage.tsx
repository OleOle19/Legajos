import type { Filters } from "@/shared/types/legajo";
import SectionCard from "@/shared/ui/SectionCard";
import ActionButton from "@/shared/ui/ActionButton";

interface OperationsPageProps {
  filters: Filters;
  onImport: () => void;
  onBackup: () => void;
  onExport: (format: "pdf" | "xlsx") => void;
  onSaveTemplate: () => void;
  importSummary?: string | null;
}

export default function OperationsPage(props: OperationsPageProps) {
  return (
    <div class="grid gap-5 xl:grid-cols-3">
      <SectionCard eyebrow="Carga inicial" title="Importar desde Excel de RR.HH." class="xl:col-span-1">
        <p class="text-sm leading-7 text-ink-soft">
          Descarga la plantilla nueva o importa el libro de RR.HH. con varias hojas. Si el numero de legajo ya existe,
          la fila actualizara el registro y conservara la trazabilidad.
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
          {props.importSummary ?? "Aun no se ha realizado una importacion en esta sesion. La plantilla ahora incluye tipo de contrato y columnas comunes entre hojas."}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Salida administrativa" title="Exportaciones normativas" class="xl:col-span-1">
        <p class="text-sm leading-7 text-ink-soft">
          Genera la relacion digital completa o filtrada segun el estado actual del padron visible.
        </p>
        <div class="mt-6 grid gap-3">
          <ActionButton variant="secondary" onClick={() => props.onExport("xlsx")}>
            Exportar Excel
          </ActionButton>
          <ActionButton variant="secondary" onClick={() => props.onExport("pdf")}>
            Exportar PDF
          </ActionButton>
        </div>
        <div class="mt-6 rounded-3xl border border-shell-border bg-white/60 p-4 text-sm text-ink-soft">
          Filtros actuales: estado <strong class="text-ink">{props.filters.estado}</strong>, busqueda{" "}
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
          La exportacion y el respaldo siguen usando el flujo Tauri actual. La importacion ahora entiende libros de
          RR.HH. con varias hojas, fechas numericas de Excel y el tipo de contrato por hoja.
        </div>
      </SectionCard>
    </div>
  );
}
