import type { JSX } from "solid-js";
import { cn } from "@/shared/lib/cn";

interface EmptyStateProps {
  title: string;
  description: string;
  marker?: string;
  action?: JSX.Element;
  class?: string;
}

export default function EmptyState(props: EmptyStateProps) {
  return (
    <div class={cn("grid min-h-[320px] place-items-center rounded-card border border-shell-border bg-white/70 px-6 py-10 text-center shadow-card", props.class)}>
      <div class="max-w-sm">
        <div class="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-brand-gradient text-lg font-bold text-white shadow-glow">
          {props.marker ?? "RH"}
        </div>
        <h3 class="mt-6 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">{props.title}</h3>
        <p class="mt-3 text-sm leading-6 text-ink-soft">{props.description}</p>
        {props.action && <div class="mt-6 flex justify-center">{props.action}</div>}
      </div>
    </div>
  );
}

