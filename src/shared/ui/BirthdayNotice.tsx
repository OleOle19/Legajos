import { For } from "solid-js";
import { cn } from "@/shared/lib/cn";
import type { BirthdayReminder } from "@/shared/lib/legajo";

interface BirthdayNoticeProps {
  reminders: BirthdayReminder[];
}

export default function BirthdayNotice(props: BirthdayNoticeProps) {
  return props.reminders.length > 0 ? (
    <div class="pointer-events-none fixed right-6 top-6 z-[85] w-[min(92vw,360px)]">
      <article class="overflow-hidden rounded-3xl border border-[#f0d8ad] bg-[linear-gradient(180deg,rgba(255,252,245,0.98)_0%,rgba(249,241,225,0.98)_100%)] shadow-shell">
        <div class="border-b border-[#ead6b4] bg-white/55 px-4 py-3">
          <p class="text-[11px] uppercase tracking-[0.2em] text-[#8d5f18]">Aviso cercano</p>
          <strong class="mt-1 block text-base text-ink">Cumpleaños próximos</strong>
        </div>
        <div class="grid gap-3 px-4 py-4">
          <For each={props.reminders.slice(0, 3)}>
            {(item) => (
              <div class={cn("rounded-2xl border border-[#eadcc0] bg-white/82 px-3 py-3 text-sm text-ink shadow-card")}>
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <strong class="block truncate text-ink">{item.name}</strong>
                    <p class="mt-1 text-xs text-ink-soft">
                      Cumple {item.nextAge} años en {item.daysUntil === 0 ? "hoy" : `${item.daysUntil} día(s)`}
                    </p>
                  </div>
                  <span class="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand-deep">
                    {formatBirthday(item.nextBirthday)}
                  </span>
                </div>
              </div>
            )}
          </For>
        </div>
      </article>
    </div>
  ) : null;
}

function formatBirthday(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return parsed.toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}
