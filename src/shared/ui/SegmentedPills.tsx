import { For } from "solid-js";
import { cn } from "@/shared/lib/cn";

export interface SegmentedItem<T extends string> {
  key: T;
  label: string;
  count?: number;
}

interface SegmentedPillsProps<T extends string> {
  items: SegmentedItem<T>[];
  value: T;
  onChange: (value: T) => void;
}

export default function SegmentedPills<T extends string>(props: SegmentedPillsProps<T>) {
  return (
    <div class="flex flex-wrap gap-2">
      <For each={props.items}>
        {(item) => (
          <button
            type="button"
            class={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition duration-200",
              props.value === item.key
                ? "border-transparent bg-brand-gradient text-white shadow-card"
                : "border-shell-border bg-white/88 text-ink hover:-translate-y-0.5 hover:bg-white"
            )}
            onClick={() => props.onChange(item.key)}
          >
            <span>{item.label}</span>
            {item.count !== undefined && <strong class="text-xs">{item.count}</strong>}
          </button>
        )}
      </For>
    </div>
  );
}
