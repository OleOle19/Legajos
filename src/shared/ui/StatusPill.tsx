import { cn } from "@/shared/lib/cn";
import type { EstadoLegajo } from "@/shared/types/legajo";

interface StatusPillProps {
  value: EstadoLegajo | string;
}

export default function StatusPill(props: StatusPillProps) {
  const isActivo = () => props.value === "activo";

  return (
    <span
      class={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold capitalize",
        isActivo() ? "bg-success/12 text-success" : "bg-warning/12 text-warning"
      )}
    >
      {props.value}
    </span>
  );
}

