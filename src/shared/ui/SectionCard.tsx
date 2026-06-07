import type { JSX } from "solid-js";
import { cn } from "@/shared/lib/cn";

interface SectionCardProps {
  title?: string;
  eyebrow?: string;
  aside?: JSX.Element;
  class?: string;
  headerClass?: string;
  eyebrowClass?: string;
  titleClass?: string;
  bodyClass?: string;
  children: JSX.Element;
}

export default function SectionCard(props: SectionCardProps) {
  return (
    <section class={cn("rounded-card border border-shell-border bg-shell-panel/95 p-6 shadow-card", props.class)}>
      {(props.title || props.eyebrow || props.aside) && (
        <header class={cn("mb-5 flex items-start justify-between gap-4", props.headerClass)}>
          <div>
            {props.eyebrow && (
              <p class={cn("mb-2 text-[11px] uppercase tracking-[0.22em] text-ink-soft", props.eyebrowClass)}>
                {props.eyebrow}
              </p>
            )}
            {props.title && (
              <h3 class={cn("font-display text-2xl font-semibold tracking-[-0.03em] text-ink", props.titleClass)}>
                {props.title}
              </h3>
            )}
          </div>
          {props.aside}
        </header>
      )}
      <div class={props.bodyClass}>{props.children}</div>
    </section>
  );
}
