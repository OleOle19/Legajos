import { For, Match, Show, Switch, createMemo } from "solid-js";
import * as Tabs from "@kobalte/core/tabs";
import type { Adjunto, LegajoDetail } from "@/shared/types/legajo";
import ActionButton from "@/shared/ui/ActionButton";
import EmptyState from "@/shared/ui/EmptyState";
import StatusPill from "@/shared/ui/StatusPill";
import AttachmentCard from "@/shared/ui/AttachmentCard";
import { calculateAge } from "@/shared/lib/legajo";

interface LegajoDetailPanelProps {
  detail?: LegajoDetail | null;
  selectedAttachmentId: number | null;
  onSelectAttachment: (attachmentId: number) => void;
  onEdit: (detail: LegajoDetail) => void;
  onAttach: (detail: LegajoDetail) => void;
  onOpenAttachment: (attachmentId: number) => void;
  onDelete: (detail: LegajoDetail) => void;
  onCreate: () => void;
}

export default function LegajoDetailPanel(props: LegajoDetailPanelProps) {
  const selectedAttachment = createMemo(() => {
    if (!props.detail) return null;
    return (
      props.detail.adjuntos.find((item) => item.id === props.selectedAttachmentId) ??
      props.detail.adjuntos[0] ??
      null
    );
  });

  return (
    <Show
      when={props.detail}
      fallback={
        <EmptyState
          title="Selecciona un legajo"
          description="La ficha lateral mostrará identidad, propiedades, documentos y trazabilidad del registro seleccionado."
          action={
            <ActionButton variant="primary" onClick={props.onCreate}>
              Crear legajo
            </ActionButton>
          }
        />
      }
    >
      {(detail) => (
        <div class="grid gap-5">
          <article class="rounded-card border border-shell-border bg-[radial-gradient(circle_at_top_right,rgba(86,193,207,0.20),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.985)_0%,rgba(245,237,226,0.97)_100%)] p-6 shadow-card">
            <div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div class="min-w-0 flex-1">
                <p class="text-[11px] uppercase tracking-[0.22em] text-ink-soft">Legajo {detail().numero_legajo}</p>
                <h3 class="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                  {detail().apellidos_nombres}
                </h3>
                <p class="mt-2 text-sm leading-6 text-ink-soft">
                  {detail().cargo_puesto} - {detail().organo_unidad}
                </p>
                <div class="mt-5 flex flex-wrap gap-2">
                  <RecordChip label="DNI" value={detail().dni} />
                  <RecordChip label="Tipo de contrato" value={detail().regimen_laboral} />
                  <RecordChip label="Edad" value={formatAge(detail().fecha_nacimiento)} />
                  <RecordChip label="Alta" value={formatDate(detail().fecha_vinculacion)} />
                  <StatusPill value={detail().estado_legajo} />
                </div>
              </div>

              <div class="grid min-w-[132px] gap-3 md:grid-cols-2 xl:grid-cols-1">
                <HeroBadge label="Adjuntos" value={detail().adjuntos.length} />
                <HeroBadge label="Movimientos" value={detail().movimientos.length} />
              </div>
            </div>

            <div class="mt-6 flex flex-wrap gap-3">
              <ActionButton variant="secondary" onClick={() => props.onEdit(detail())}>
                Editar
              </ActionButton>
              <ActionButton variant="primary" onClick={() => props.onAttach(detail())}>
                Adjuntar archivo
              </ActionButton>
              <ActionButton variant="danger" onClick={() => props.onDelete(detail())}>
                Eliminar
              </ActionButton>
            </div>
          </article>

          <Tabs.Root defaultValue="resumen" class="rounded-card border border-shell-border bg-white/82 p-5 shadow-card">
            <Tabs.List class="flex flex-wrap gap-2 border-b border-shell-border pb-4">
              <TabTrigger value="resumen" label="Resumen" />
              <TabTrigger value="documentos" label={`Documentos (${detail().adjuntos.length})`} />
              <TabTrigger value="historial" label={`Historial (${detail().movimientos.length})`} />
            </Tabs.List>

            <Tabs.Content value="resumen" class="pt-5">
              <div class="grid gap-4 md:grid-cols-2">
                <DetailItem label="Número de legajo" value={detail().numero_legajo} />
                <DetailItem label="Documento de identidad" value={detail().dni} />
                <DetailItem label="Área de trabajo" value={detail().organo_unidad} />
                <DetailItem label="Cargo / puesto" value={detail().cargo_puesto} />
                <DetailItem label="Tipo de contrato" value={detail().regimen_laboral} />
                <DetailItem label="Fecha de nacimiento" value={formatDate(detail().fecha_nacimiento)} />
                <DetailItem label="Edad actual" value={formatAge(detail().fecha_nacimiento)} />
                <DetailItem label="Fecha de vinculación" value={formatDate(detail().fecha_vinculacion)} />
                <DetailItem label="Remuneración" value={detail().remuneracion} />
                <DetailItem label="Celular" value={detail().celular} />
                <DetailItem label="Dirección" value={detail().direccion} />
                <DetailItem label="Categoría de estudios" value={detail().categoria_estudios} />
                <DetailItem label="Correo electrónico" value={detail().correo_electronico} />
                <DetailItem label="Perfil MOF" value={detail().perfil_mof} />
                <DetailItem label="Hijos menores de edad" value={detail().hijos_menores_de_edad} />
                <DetailItem label="Condición" value={detail().condicion} />
                <DetailItem label="Estado" value={detail().estado_legajo} />
                <DetailItem label="Ubicación del legajo" value={detail().ubicacion_legajo} />
                <DetailItem label="Origen del registro" value={detail().origen_registro} />
                <DetailItem label="Última actualización" value={formatDateTime(detail().updated_at)} />
              </div>

              <div class="mt-4 rounded-3xl border border-shell-border bg-white/88 p-4">
                <strong class="text-[11px] uppercase tracking-[0.18em] text-ink-soft">Observaciones</strong>
                <p class="mt-3 text-sm leading-7 text-ink-soft">
                  {detail().observaciones || "Sin observaciones registradas."}
                </p>
              </div>
            </Tabs.Content>

            <Tabs.Content value="documentos" class="pt-5">
              <Show
                when={detail().adjuntos.length}
                fallback={
                  <div class="grid gap-4">
                    <div class="rounded-3xl border border-shell-border bg-white/84 p-5 text-sm leading-7 text-ink-soft">
                      Aún no se ha digitalizado evidencia para este legajo.
                    </div>
                    <div class="overflow-hidden rounded-card border border-shell-border bg-white/88 shadow-card">
                      <AttachmentPreview attachment={null} />
                    </div>
                  </div>
                }
              >
                <div class="grid gap-4">
                  <div class="grid gap-3">
                    <For each={detail().adjuntos}>
                      {(attachment) => (
                        <AttachmentCard
                          attachment={attachment}
                          selected={selectedAttachment()?.id === attachment.id}
                          onSelect={() => props.onSelectAttachment(attachment.id)}
                          onOpen={() => props.onOpenAttachment(attachment.id)}
                        />
                      )}
                    </For>
                  </div>

                  <div class="overflow-hidden rounded-card border border-shell-border bg-white/88 shadow-card">
                    <AttachmentPreview attachment={selectedAttachment()} />
                  </div>
                </div>
              </Show>
            </Tabs.Content>

            <Tabs.Content value="historial" class="pt-5">
              <div class="grid gap-3">
                <Show
                  when={detail().movimientos.length}
                  fallback={
                    <div class="rounded-3xl border border-shell-border bg-white/82 p-5 text-sm text-ink-soft">
                      Sin movimientos registrados.
                    </div>
                  }
                >
                  <For each={detail().movimientos}>
                    {(item) => (
                      <article class="rounded-3xl border border-shell-border bg-white/86 p-4 shadow-card">
                        <div class="flex items-start justify-between gap-3">
                          <strong class="text-sm text-ink">{humanizeMovement(item.tipo_movimiento)}</strong>
                          <span class="rounded-full bg-brand/8 px-3 py-1 text-[11px] font-semibold text-brand-deep">
                            {humanizeMovement(item.tipo_movimiento)}
                          </span>
                        </div>
                        <p class="mt-3 text-sm leading-6 text-ink-soft">{item.detalle}</p>
                        <p class="mt-2 text-xs text-ink-soft">{formatDateTime(item.fecha)}</p>
                      </article>
                    )}
                  </For>
                </Show>
              </div>
            </Tabs.Content>
          </Tabs.Root>
        </div>
      )}
    </Show>
  );
}

function TabTrigger(props: { value: string; label: string }) {
  return (
    <Tabs.Trigger
      value={props.value}
      class="rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-ink transition data-[selected]:border-brand/15 data-[selected]:bg-brand/10 data-[selected]:text-brand-deep"
    >
      {props.label}
    </Tabs.Trigger>
  );
}

function RecordChip(props: { label: string; value: string }) {
  return (
    <span class="inline-flex items-center gap-2 rounded-full border border-shell-border bg-white/88 px-3 py-2 text-xs text-ink-soft">
      <strong class="text-ink">{props.label}</strong>
      <span>{props.value}</span>
    </span>
  );
}

function HeroBadge(props: { label: string; value: number }) {
  return (
    <div class="grid rounded-3xl border border-shell-border bg-white/86 p-4 text-center shadow-card">
      <span class="text-[11px] uppercase tracking-[0.16em] text-ink-soft">{props.label}</span>
      <strong class="mt-2 text-3xl font-bold tracking-[-0.03em] text-ink">{props.value}</strong>
    </div>
  );
}

function DetailItem(props: { label: string; value: string }) {
  return (
    <div class="rounded-3xl border border-shell-border bg-white/88 p-4">
      <strong class="text-[11px] uppercase tracking-[0.18em] text-ink-soft">{props.label}</strong>
      <p class="mt-2 break-words text-sm leading-6 text-ink">{props.value || "-"}</p>
    </div>
  );
}

function AttachmentPreview(props: { attachment: Adjunto | null }) {
  if (!props.attachment) {
    return (
      <div class="grid min-h-[220px] place-items-center px-6 py-10 text-center text-sm text-ink-soft">
        Selecciona un adjunto para ver una vista previa.
      </div>
    );
  }

  return (
    <div class="grid min-h-[220px] place-items-center px-6 py-10 text-center">
      <div class="max-w-[320px]">
        <strong class="block text-base text-ink">{props.attachment.nombre_archivo}</strong>
        <p class="mt-2 text-sm text-ink-soft">Tipo: {props.attachment.tipo_archivo}</p>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleDateString("es-PE");
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleString("es-PE");
}

function formatAge(value: string) {
  const age = calculateAge(value);
  return age === null ? "-" : `${age} años`;
}

function humanizeMovement(type: string) {
  const labels: Record<string, string> = {
    creacion: "Creación",
    edicion: "Edición",
    cambio_estado: "Cambio de estado",
    cambio_ubicacion: "Cambio de ubicación",
    adjunto: "Adjunto"
  };
  return labels[type] || type;
}
