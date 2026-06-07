import { For, createEffect } from "solid-js";
import { createStore } from "solid-js/store";
import * as Dialog from "@kobalte/core/dialog";
import type { LegajoDetail, SaveLegajoPayload } from "@/shared/types/legajo";
import ActionButton from "@/shared/ui/ActionButton";

interface LegajoFormDialogProps {
  open: boolean;
  current?: LegajoDetail | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: SaveLegajoPayload) => Promise<unknown> | unknown;
}

const emptyForm = (): SaveLegajoPayload => ({
  numero_legajo: "",
  apellidos_nombres: "",
  dni: "",
  organo_unidad: "",
  cargo_puesto: "",
  regimen_laboral: "",
  fecha_vinculacion: "",
  estado_legajo: "activo",
  ubicacion_legajo: "",
  observaciones: ""
});

export default function LegajoFormDialog(props: LegajoFormDialogProps) {
  const [form, setForm] = createStore<SaveLegajoPayload>(emptyForm());

  createEffect(() => {
    const next = props.current
      ? {
          id: props.current.id,
          numero_legajo: props.current.numero_legajo,
          apellidos_nombres: props.current.apellidos_nombres,
          dni: props.current.dni,
          organo_unidad: props.current.organo_unidad,
          cargo_puesto: props.current.cargo_puesto,
          regimen_laboral: props.current.regimen_laboral,
          fecha_vinculacion: props.current.fecha_vinculacion,
          estado_legajo: props.current.estado_legajo,
          ubicacion_legajo: props.current.ubicacion_legajo,
          observaciones: props.current.observaciones
        }
      : emptyForm();
    setForm(next);
  });

  const update = (key: keyof SaveLegajoPayload, value: string) => setForm(key, value as never);

  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-[70] bg-[#111b2e]/52 backdrop-blur-sm" />

        <div class="fixed inset-0 z-[71] overflow-hidden p-3 sm:p-4 lg:p-6">
          <div class="flex h-full items-start justify-center">
            <Dialog.Content class="flex w-full max-w-5xl flex-col overflow-hidden rounded-shell border border-white/75 bg-[radial-gradient(circle_at_top_right,rgba(86,193,207,0.12),transparent_22%),linear-gradient(180deg,rgba(255,252,248,0.995)_0%,rgba(245,237,226,0.98)_100%)] shadow-shell outline-none max-h-full">
              <div class="border-b border-shell-border/80 px-6 pb-5 pt-6 sm:px-7">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <p class="text-[11px] uppercase tracking-[0.22em] text-ink-soft">Ficha administrativa</p>
                    <Dialog.Title class="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                      {props.current ? "Editar legajo" : "Nuevo legajo"}
                    </Dialog.Title>
                    <p class="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
                      Registra la identidad institucional, la situacion administrativa y la ubicacion fisica del
                      legajo en una sola ficha.
                    </p>
                  </div>

                  <ActionButton variant="ghost" onClick={() => props.onOpenChange(false)} class="shrink-0">
                    Cerrar
                  </ActionButton>
                </div>

                <div class="mt-5 grid gap-3 sm:grid-cols-3">
                  <HeaderBadge label="Campos obligatorios" value="8" note="Base minima requerida" />
                  <HeaderBadge label="Estado inicial" value={form.estado_legajo} note="Activo o pasivo" />
                  <HeaderBadge
                    label="Control de custodia"
                    value={form.ubicacion_legajo ? "listo" : "pendiente"}
                    note={form.ubicacion_legajo ? "Ubicacion capturada" : "Falta ubicacion fisica"}
                  />
                </div>
              </div>

              <form
                class="flex min-h-0 flex-1 flex-col"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await props.onSubmit(form);
                  props.onOpenChange(false);
                }}
              >
                <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-5 sm:px-7">
                  <div class="grid gap-5">
                    <div class="grid gap-5 xl:grid-cols-2">
                      <FormSection title="Identidad institucional" eyebrow="Datos base">
                        <TextField label="Numero de legajo" value={form.numero_legajo} onInput={(value) => update("numero_legajo", value)} required />
                        <TextField label="Apellidos y nombres" value={form.apellidos_nombres} onInput={(value) => update("apellidos_nombres", value)} required />
                        <TextField label="DNI" value={form.dni} onInput={(value) => update("dni", value)} required />
                        <DateField label="Fecha de vinculacion" value={form.fecha_vinculacion} onInput={(value) => update("fecha_vinculacion", value)} required />
                      </FormSection>

                      <FormSection title="Situacion administrativa" eyebrow="Clasificacion">
                        <TextField label="Organo o unidad organica" value={form.organo_unidad} onInput={(value) => update("organo_unidad", value)} required />
                        <TextField label="Cargo estructural y/o puesto" value={form.cargo_puesto} onInput={(value) => update("cargo_puesto", value)} required />
                        <TextField label="Regimen laboral" value={form.regimen_laboral} onInput={(value) => update("regimen_laboral", value)} required />
                        <SelectField label="Estado del legajo" value={form.estado_legajo} onInput={(value) => update("estado_legajo", value)} options={["activo", "pasivo"]} required />
                      </FormSection>
                    </div>

                    <FormSection title="Custodia y notas" eyebrow="Control interno">
                      <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <TextField label="Ubicacion del legajo" value={form.ubicacion_legajo} onInput={(value) => update("ubicacion_legajo", value)} required />
                        <div class="grid gap-2.5 self-start text-sm">
                          <span class="pl-1 font-medium text-ink">Observaciones</span>
                          <textarea
                            rows={6}
                            value={form.observaciones}
                            onInput={(event) => update("observaciones", event.currentTarget.value)}
                            class="min-h-[172px] rounded-3xl border border-shell-border bg-white/92 px-4 py-3 text-ink outline-none transition duration-150 placeholder:text-ink-faint focus:border-brand/35 focus:ring-2 focus:ring-brand-accent/20"
                            placeholder="Detalles de custodia, notas de archivo o comentarios administrativos."
                          />
                        </div>
                      </div>
                    </FormSection>
                  </div>
                </div>

                <div class="border-t border-shell-border/80 bg-white/76 px-6 py-4 sm:px-7">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <p class="text-sm text-ink-soft">Puedes desplazarte dentro de esta ficha para completar todos los campos.</p>
                    <div class="flex flex-wrap justify-end gap-3">
                      <ActionButton variant="secondary" type="button" onClick={() => props.onOpenChange(false)}>
                        Cancelar
                      </ActionButton>
                      <ActionButton variant="primary" type="submit">
                        Guardar legajo
                      </ActionButton>
                    </div>
                  </div>
                </div>
              </form>
            </Dialog.Content>
          </div>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function HeaderBadge(props: { label: string; value: string; note: string }) {
  return (
    <article class="rounded-3xl border border-shell-border bg-white/82 p-4 shadow-card">
      <p class="text-[11px] uppercase tracking-[0.18em] text-ink-soft">{props.label}</p>
      <strong class="mt-2 block text-lg font-semibold capitalize tracking-[-0.03em] text-ink">{props.value}</strong>
      <p class="mt-2 text-sm text-ink-soft">{props.note}</p>
    </article>
  );
}

function FormSection(props: { title: string; eyebrow: string; children: any }) {
  return (
    <section class="rounded-card border border-shell-border bg-white/78 p-5 shadow-card">
      <p class="text-[11px] uppercase tracking-[0.22em] text-ink-soft">{props.eyebrow}</p>
      <h4 class="mt-2 font-display text-xl font-semibold tracking-[-0.03em] text-ink">{props.title}</h4>
      <div class="mt-5 grid gap-4">{props.children}</div>
    </section>
  );
}

function TextField(props: { label: string; value: string; onInput: (value: string) => void; required?: boolean }) {
  return (
    <label class="grid self-start gap-2.5 text-sm">
      <span class="pl-1 font-medium text-ink">{props.label}</span>
      <input
        required={props.required}
        value={props.value}
        onInput={(event) => props.onInput(event.currentTarget.value)}
        class="rounded-3xl border border-shell-border bg-white/92 px-4 py-3 text-ink outline-none transition duration-150 placeholder:text-ink-faint focus:border-brand/35 focus:ring-2 focus:ring-brand-accent/20"
      />
    </label>
  );
}

function DateField(props: { label: string; value: string; onInput: (value: string) => void; required?: boolean }) {
  return (
    <label class="grid self-start gap-2.5 text-sm">
      <span class="pl-1 font-medium text-ink">{props.label}</span>
      <input
        required={props.required}
        type="date"
        value={props.value}
        onInput={(event) => props.onInput(event.currentTarget.value)}
        class="rounded-3xl border border-shell-border bg-white/92 px-4 py-3 text-ink outline-none transition duration-150 focus:border-brand/35 focus:ring-2 focus:ring-brand-accent/20"
      />
    </label>
  );
}

function SelectField(props: {
  label: string;
  value: string;
  onInput: (value: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <label class="grid self-start gap-2.5 text-sm">
      <span class="pl-1 font-medium text-ink">{props.label}</span>
      <select
        required={props.required}
        value={props.value}
        onChange={(event) => props.onInput(event.currentTarget.value)}
        class="rounded-3xl border border-shell-border bg-white/92 px-4 py-3 text-ink outline-none transition duration-150 focus:border-brand/35 focus:ring-2 focus:ring-brand-accent/20"
      >
        <For each={props.options}>{(option) => <option value={option}>{option}</option>}</For>
      </select>
    </label>
  );
}
