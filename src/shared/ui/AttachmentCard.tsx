import type { JSX } from "solid-js";
import type { Adjunto } from "@/shared/types/legajo";
import { cn } from "@/shared/lib/cn";
import ActionButton from "@/shared/ui/ActionButton";

interface AttachmentCardProps {
  attachment: Adjunto;
  selected?: boolean;
  onSelect: () => void;
  onOpen: () => void;
}

function attachmentGlyph(type: string) {
  const normalized = type.toLowerCase();
  if (normalized === "pdf") return "PDF";
  if (["png", "jpg", "jpeg", "webp", "tif", "tiff"].includes(normalized)) return "IMG";
  return "DOC";
}

export default function AttachmentCard(props: AttachmentCardProps): JSX.Element {
  return (
    <article
      class={cn(
        "flex items-center justify-between gap-3 rounded-3xl border p-4 transition duration-200",
        props.selected ? "border-brand/30 bg-brand/5 shadow-card" : "border-shell-border bg-white/70"
      )}
    >
      <button type="button" class="flex flex-1 items-center gap-3 text-left" onClick={props.onSelect}>
        <div class="grid h-12 w-12 place-items-center rounded-2xl border border-brand/10 bg-brand/10 text-xs font-bold text-brand-deep">
          {attachmentGlyph(props.attachment.tipo_archivo)}
        </div>
        <div class="min-w-0">
          <div class="truncate font-semibold text-ink">{props.attachment.nombre_archivo}</div>
          <div class="truncate text-xs text-ink-soft">{props.attachment.tipo_archivo.toUpperCase()}</div>
          <div class="truncate text-xs text-ink-faint">{new Date(props.attachment.fecha_carga).toLocaleString("es-PE")}</div>
        </div>
      </button>
      <ActionButton type="button" variant="secondary" class="px-3 py-2 text-xs" onClick={props.onOpen}>
        Abrir
      </ActionButton>
    </article>
  );
}

