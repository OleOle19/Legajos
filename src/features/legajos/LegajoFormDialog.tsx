import { For, createEffect, createMemo, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import * as Dialog from "@kobalte/core/dialog";
import { buildNextLegajoNumber, calculateAge } from "@/shared/lib/legajo";
import { CONTRACT_TYPE_OPTIONS, type LegajoDetail, type SaveLegajoPayload } from "@/shared/types/legajo";
import ActionButton from "@/shared/ui/ActionButton";

interface LegajoFormDialogProps {
  open: boolean;
  current?: LegajoDetail | null;
  legajos: Array<Pick<LegajoDetail, "numero_legajo" | "regimen_laboral">>;
  areas: string[];
  onCreateArea: (areaName: string) => Promise<string> | string;
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
  fecha_nacimiento: "",
  fecha_vinculacion: "",
  remuneracion: "",
  celular: "",
  direccion: "",
  categoria_estudios: "",
  correo_electronico: "",
  perfil_mof: "",
  hijos_menores_de_edad: "",
  condicion: "",
  estado_legajo: "activo",
  ubicacion_legajo: "",
  observaciones: ""
});

export default function LegajoFormDialog(props: LegajoFormDialogProps) {
  const [form, setForm] = createStore<SaveLegajoPayload>(emptyForm());
  const [areaDraft, setAreaDraft] = createSignal("");

  const agePreview = createMemo(() => calculateAge(form.fecha_nacimiento));
  const areaOptions = createMemo(() => {
    const options = new Set(props.areas.map((item) => item.trim()).filter(Boolean));
    if (form.organo_unidad.trim()) options.add(form.organo_unidad.trim());
    return [...options].sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }));
  });

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
          fecha_nacimiento: props.current.fecha_nacimiento,
          fecha_vinculacion: props.current.fecha_vinculacion,
          remuneracion: props.current.remuneracion,
          celular: props.current.celular,
          direccion: props.current.direccion,
          categoria_estudios: props.current.categoria_estudios,
          correo_electronico: props.current.correo_electronico,
          perfil_mof: props.current.perfil_mof,
          hijos_menores_de_edad: props.current.hijos_menores_de_edad,
          condicion: props.current.condicion,
          estado_legajo: props.current.estado_legajo,
          ubicacion_legajo: props.current.ubicacion_legajo,
          observaciones: props.current.observaciones
        }
      : emptyForm();
    setForm(next);
    setAreaDraft("");
  });

  createEffect(() => {
    if (props.current) return;
    const nextLegajo = form.regimen_laboral ? buildNextLegajoNumber(props.legajos, form.regimen_laboral) : "";
    if (form.numero_legajo !== nextLegajo) {
      setForm("numero_legajo", nextLegajo);
    }
  });

  const update = <K extends keyof SaveLegajoPayload>(key: K, value: SaveLegajoPayload[K]) => {
    setForm(key, value as never);
  };

  const createAreaFromDraft = async () => {
    const name = areaDraft().trim();
    if (!name) return;
    const created = await props.onCreateArea(name);
    const nextArea = String(created || name).trim();
    if (nextArea) {
      update("organo_unidad", nextArea);
      setAreaDraft("");
    }
  };

  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-[70] bg-[#111b2e]/52 backdrop-blur-sm" />

        <div class="fixed inset-0 z-[71] overflow-hidden p-3 sm:p-4 lg:p-6">
          <div class="flex h-full items-start justify-center">
            <Dialog.Content class="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-shell border border-white/75 bg-[radial-gradient(circle_at_top_right,rgba(86,193,207,0.12),transparent_22%),linear-gradient(180deg,rgba(255,252,248,0.995)_0%,rgba(245,237,226,0.98)_100%)] shadow-shell outline-none">
              <div class="border-b border-shell-border/80 px-6 pb-5 pt-6 sm:px-7">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <p class="text-[11px] uppercase tracking-[0.22em] text-ink-soft">Ficha administrativa</p>
                    <Dialog.Title class="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                      {props.current ? "Editar legajo" : "Nuevo legajo"}
                    </Dialog.Title>
                    <p class="mt-3 max-w-3xl text-sm leading-6 text-ink-soft">
                      Completa los datos base del servidor o servidora, el tipo de contrato y la informacion que
                      antes quedaba repartida entre hojas del Excel.
                    </p>
                  </div>

                  <ActionButton variant="ghost" onClick={() => props.onOpenChange(false)} class="shrink-0">
                    Cerrar
                  </ActionButton>
                </div>

                <div class="mt-5 grid gap-3 sm:grid-cols-3">
                  <HeaderBadge
                    label="Numero de legajo"
                    value={form.numero_legajo || "pendiente"}
                    note="Se calcula segun el tipo de contrato"
                  />
                  <HeaderBadge
                    label="Tipo de contrato"
                    value={form.regimen_laboral || "pendiente"}
                    note="CAS, obreros, serenos, 276"
                  />
                  <HeaderBadge
                    label="Edad"
                    value={agePreview() === null ? "pendiente" : `${agePreview()} anios`}
                    note={form.fecha_nacimiento ? "Se calcula al guardar" : "Falta fecha de nacimiento"}
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
                    <FormSection title="Identidad y vinculo" eyebrow="Datos base">
                      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <TextField
                          label="Numero de legajo"
                          value={form.numero_legajo}
                          onInput={(value) => update("numero_legajo", value)}
                          readOnly
                          helper="Se genera automaticamente segun el contrato."
                        />
                        <TextField
                          label="Apellidos y nombres"
                          value={form.apellidos_nombres}
                          onInput={(value) => update("apellidos_nombres", value)}
                          required
                        />
                        <TextField label="DNI" value={form.dni} onInput={(value) => update("dni", value)} required />
                        <DateField
                          label="Fecha de nacimiento"
                          value={form.fecha_nacimiento}
                          onInput={(value) => update("fecha_nacimiento", value)}
                        />
                        <DateField
                          label="Fecha de vinculacion"
                          value={form.fecha_vinculacion}
                          onInput={(value) => update("fecha_vinculacion", value)}
                          required
                        />
                        <SelectField
                          label="Tipo de contrato"
                          value={form.regimen_laboral}
                          onInput={(value) => update("regimen_laboral", value)}
                          options={CONTRACT_TYPE_OPTIONS}
                          placeholder="Selecciona un tipo"
                          required
                        />
                      </div>
                    </FormSection>

                    <div class="grid gap-5 xl:grid-cols-2">
                      <FormSection title="Area de trabajo" eyebrow="Ubicacion laboral">
                        <div class="grid gap-4">
                          <SelectField
                            label="Area"
                            value={form.organo_unidad}
                            onInput={(value) => update("organo_unidad", value)}
                            options={areaOptions()}
                            placeholder="Selecciona un area"
                            required
                          />
                          <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                            <TextField
                              label="Nueva area"
                              value={areaDraft()}
                              onInput={setAreaDraft}
                              placeholder="Ej: Gestion Documental"
                            />
                            <div class="flex items-end">
                              <ActionButton
                                type="button"
                                variant="secondary"
                                onClick={createAreaFromDraft}
                                disabled={!areaDraft().trim()}
                              >
                                Crear area
                              </ActionButton>
                            </div>
                          </div>
                          <TextField
                            label="Cargo / puesto"
                            value={form.cargo_puesto}
                            onInput={(value) => update("cargo_puesto", value)}
                            placeholder="Opcional: si lo dejas vacio se usara el area"
                            helper="Si no se completa, el sistema guarda el area como cargo base."
                          />
                          <TextField
                            label="Categoria de estudios"
                            value={form.categoria_estudios}
                            onInput={(value) => update("categoria_estudios", value)}
                          />
                          <TextField
                            label="Condicion"
                            value={form.condicion}
                            onInput={(value) => update("condicion", value)}
                            placeholder="Ej: Nombrado, contratado, CAS, etc."
                          />
                        </div>
                      </FormSection>

                      <FormSection title="Contacto y remuneracion" eyebrow="Datos complementarios">
                        <div class="grid gap-4">
                          <TextField
                            label="Remuneracion"
                            value={form.remuneracion}
                            onInput={(value) => update("remuneracion", value)}
                            placeholder="Monto o referencia salarial"
                          />
                          <TextField
                            label="Celular"
                            value={form.celular}
                            onInput={(value) => update("celular", value)}
                          />
                          <TextField
                            label="Direccion"
                            value={form.direccion}
                            onInput={(value) => update("direccion", value)}
                          />
                          <TextField
                            label="Correo electronico"
                            value={form.correo_electronico}
                            onInput={(value) => update("correo_electronico", value)}
                          />
                        </div>
                      </FormSection>
                    </div>

                    <div class="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                      <FormSection title="Perfil y control" eyebrow="Archivo y trazabilidad">
                        <div class="grid gap-4">
                          <TextAreaField
                            label="Perfil solicitado segun el MOF"
                            value={form.perfil_mof}
                            onInput={(value) => update("perfil_mof", value)}
                            rows={5}
                            placeholder="Describe el perfil, funciones o referencia del MOF."
                          />
                          <TextField
                            label="Hijos menores de edad"
                            value={form.hijos_menores_de_edad}
                            onInput={(value) => update("hijos_menores_de_edad", value)}
                            placeholder="Ej: 2"
                          />
                        </div>
                      </FormSection>

                      <FormSection title="Custodia fisica" eyebrow="Archivo administrativo">
                        <div class="grid gap-4">
                          <SelectField
                            label="Estado del legajo"
                            value={form.estado_legajo}
                            onInput={(value) => update("estado_legajo", value as SaveLegajoPayload["estado_legajo"]) }
                            options={["activo", "pasivo"]}
                            required
                          />
                          <TextField
                            label="Ubicacion del legajo"
                            value={form.ubicacion_legajo}
                            onInput={(value) => update("ubicacion_legajo", value)}
                            required
                          />
                          <TextAreaField
                            label="Observaciones"
                            value={form.observaciones}
                            onInput={(value) => update("observaciones", value)}
                            rows={5}
                            placeholder="Notas de custodia, faltantes o comentarios internos."
                          />
                        </div>
                      </FormSection>
                    </div>
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
      <strong class="mt-2 block text-lg font-semibold tracking-[-0.03em] text-ink">{props.value}</strong>
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

function TextField(props: {
  label: string;
  value: string;
  onInput: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  helper?: string;
  readOnly?: boolean;
}) {
  return (
    <label class="grid self-start gap-2.5 text-sm">
      <span class="pl-1 font-medium text-ink">{props.label}</span>
      <input
        required={props.required}
        readOnly={props.readOnly}
        value={props.value}
        placeholder={props.placeholder}
        onInput={(event) => props.onInput(event.currentTarget.value)}
        class="rounded-3xl border border-shell-border bg-white/92 px-4 py-3 text-ink outline-none transition duration-150 placeholder:text-ink-faint focus:border-brand/35 focus:ring-2 focus:ring-brand-accent/20 read-only:bg-[#f7f5f2] read-only:text-ink-soft"
      />
      <ShowText when={props.helper}>{props.helper}</ShowText>
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
  options: readonly string[];
  required?: boolean;
  placeholder?: string;
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
        {props.placeholder && <option value="">{props.placeholder}</option>}
        <For each={props.options}>{(option) => <option value={option}>{option}</option>}</For>
      </select>
    </label>
  );
}

function TextAreaField(props: {
  label: string;
  value: string;
  onInput: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label class="grid gap-2.5 text-sm">
      <span class="pl-1 font-medium text-ink">{props.label}</span>
      <textarea
        rows={props.rows ?? 4}
        value={props.value}
        placeholder={props.placeholder}
        onInput={(event) => props.onInput(event.currentTarget.value)}
        class="min-h-[140px] rounded-3xl border border-shell-border bg-white/92 px-4 py-3 text-ink outline-none transition duration-150 placeholder:text-ink-faint focus:border-brand/35 focus:ring-2 focus:ring-brand-accent/20"
      />
    </label>
  );
}

function ShowText(props: { when?: string; children: any }) {
  return props.when ? <p class="pl-1 text-xs leading-5 text-ink-soft">{props.children}</p> : null;
}
