import { For } from "solid-js";
import { cn } from "@/shared/lib/cn";
import { formatDateShortLabel, type BirthdayReminder } from "@/shared/lib/legajo";

interface BirthdayNoticeProps {
  reminders: BirthdayReminder[];
}

export default function BirthdayNotice(props: BirthdayNoticeProps) {
  const hasBirthdayToday = props.reminders.some((item) => item.daysUntil === 0);

  return props.reminders.length > 0 ? (
    <div class="pointer-events-none fixed right-6 top-6 z-[85] w-[min(92vw,360px)]">
      <article class="relative overflow-hidden rounded-3xl border border-[#f0d8ad] bg-[linear-gradient(180deg,rgba(255,252,245,0.98)_0%,rgba(249,241,225,0.98)_100%)] shadow-shell">
        {hasBirthdayToday && <ConfettiStrip />}
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
  return formatDateShortLabel(value);
}

function ConfettiStrip() {
  const pieces = Array.from({ length: 12 }, (_, index) => index);
  return (
    <div class="pointer-events-none absolute inset-x-0 top-0 flex h-12 items-start justify-between px-4 pt-3">
      <For each={pieces}>
        {(piece) => (
          <span
            class={cn(
              "block h-2 w-2 rounded-sm shadow-sm",
              piece % 4 === 0 && "bg-[#e7b23b]",
              piece % 4 === 1 && "bg-[#ff7f50]",
              piece % 4 === 2 && "bg-[#5aa4ff]",
              piece % 4 === 3 && "bg-[#61c38f]"
            )}
            style={{
              transform: `rotate(${piece * 14}deg) translateY(${piece % 2 === 0 ? "0px" : "3px"})`
            }}
          />
        )}
      </For>
    </div>
  );
}
