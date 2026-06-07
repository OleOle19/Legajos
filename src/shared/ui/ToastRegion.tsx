import { Show } from "solid-js";
import { cn } from "@/shared/lib/cn";

export interface ToastState {
  message: string;
  tone?: "success" | "danger" | "neutral";
}

interface ToastRegionProps {
  toast: ToastState | null;
}

export default function ToastRegion(props: ToastRegionProps) {
  return (
    <Show when={props.toast}>
      {(toast) => (
        <div class="pointer-events-none fixed bottom-6 right-6 z-[80]">
          <div
            class={cn(
              "min-w-[280px] max-w-[420px] rounded-3xl px-5 py-4 text-sm font-medium text-white shadow-shell backdrop-blur",
              toast().tone === "danger"
                ? "bg-danger/95"
                : toast().tone === "success"
                  ? "bg-success/95"
                  : "bg-brand-deep/95"
            )}
          >
            {toast().message}
          </div>
        </div>
      )}
    </Show>
  );
}

