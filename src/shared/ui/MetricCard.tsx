import { cn } from "@/shared/lib/cn";

interface MetricCardProps {
  label: string;
  value: string | number;
  note: string;
  tone?: "brand" | "success" | "warning" | "neutral";
}

const toneStyles = {
  brand: "before:bg-gradient-to-r before:from-brand-deep before:to-brand-accent",
  success: "before:bg-gradient-to-r before:from-success before:to-emerald-300",
  warning: "before:bg-gradient-to-r before:from-brand-warm before:to-amber-300",
  neutral: "before:bg-gradient-to-r before:from-slate-300 before:to-slate-100"
};

export default function MetricCard(props: MetricCardProps) {
  return (
    <article
      class={cn(
        "relative overflow-hidden rounded-card border border-white/70 bg-shell-panel-strong p-5 shadow-card before:absolute before:left-0 before:top-0 before:h-1.5 before:w-full before:content-['']",
        toneStyles[props.tone ?? "brand"]
      )}
    >
      <p class="text-[11px] uppercase tracking-[0.2em] text-ink-soft">{props.label}</p>
      <p class="mt-3 text-4xl font-bold tracking-[-0.04em] text-ink">{props.value}</p>
      <p class="mt-2 text-sm text-ink-soft">{props.note}</p>
    </article>
  );
}
