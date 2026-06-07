import type { JSX } from "solid-js";
import { cn } from "@/shared/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ActionButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-brand-deep text-white shadow-glow hover:-translate-y-0.5 hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60",
  secondary:
    "bg-white/92 text-ink border border-shell-border shadow-card hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/40",
  ghost:
    "bg-transparent text-ink-soft hover:-translate-y-0.5 hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/40",
  danger:
    "bg-danger/10 text-danger border border-danger/15 hover:-translate-y-0.5 hover:bg-danger/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
};

export default function ActionButton(props: ActionButtonProps) {
  const variant = () => props.variant ?? "secondary";

  return (
    <button
      {...props}
      class={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition duration-200 disabled:cursor-default disabled:opacity-50 disabled:transform-none",
        variantStyles[variant()],
        props.class
      )}
    />
  );
}
