import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { formatDateShortLabel, type BirthdayReminder } from "@/shared/lib/legajo";

interface BirthdayNoticeProps {
  reminders: BirthdayReminder[];
}

const NOTICE_STORAGE_KEY = "legajo:birthday-notice:seen-date";
const NOTICE_VISIBLE_MS = 18_000;
const DAY_POLL_MS = 60_000;

export default function BirthdayNotice(props: BirthdayNoticeProps) {
  const [todayKey, setTodayKey] = createSignal(currentDayKey());
  const [visible, setVisible] = createSignal(false);
  const confettiPieces = createMemo(() => buildConfettiPieces());

  onMount(() => {
    const timer = window.setInterval(() => setTodayKey(currentDayKey()), DAY_POLL_MS);
    onCleanup(() => window.clearInterval(timer));
  });

  createEffect(() => {
    if (!props.reminders.length) {
      setVisible(false);
      return;
    }

    const key = todayKey();
    if (readSeenDate() === key) {
      setVisible(false);
      return;
    }

    setVisible(true);
    writeSeenDate(key);

    const timeout = window.setTimeout(() => setVisible(false), NOTICE_VISIBLE_MS);
    onCleanup(() => window.clearTimeout(timeout));
  });

  return (
    <Show when={visible() && props.reminders.length > 0}>
      <div class="pointer-events-none fixed inset-0 z-[84]">
        <Show when={props.reminders.some((item) => item.daysUntil === 0)}>
          <ConfettiStorm pieces={confettiPieces()} />
        </Show>
      </div>

      <div class="pointer-events-none fixed right-6 top-6 z-[85] w-[min(92vw,360px)]">
        <article class="relative overflow-hidden rounded-3xl border border-[#f0d8ad] bg-[linear-gradient(180deg,rgba(255,252,245,0.98)_0%,rgba(249,241,225,0.98)_100%)] shadow-shell">
          <div class="border-b border-[#ead6b4] bg-white/55 px-4 py-3">
            <p class="text-[11px] uppercase tracking-[0.2em] text-[#8d5f18]">Aviso cercano</p>
            <strong class="mt-1 block text-base text-ink">Cumpleaños próximos</strong>
          </div>
          <div class="grid gap-3 px-4 py-4">
            <For each={props.reminders.slice(0, 3)}>
              {(item) => (
                <div class="rounded-2xl border border-[#eadcc0] bg-white/82 px-3 py-3 text-sm text-ink shadow-card">
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
    </Show>
  );
}

function formatBirthday(value: string) {
  return formatDateShortLabel(value);
}

function ConfettiStorm(props: { pieces: ConfettiPiece[] }) {
  return (
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <For each={props.pieces}>
        {(piece) => (
          <span class="birthday-confetti-piece" style={pieceStyle(piece)} />
        )}
      </For>
    </div>
  );
}

function currentDayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readSeenDate() {
  try {
    return window.localStorage.getItem(NOTICE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSeenDate(value: string) {
  try {
    window.localStorage.setItem(NOTICE_STORAGE_KEY, value);
  } catch {
    // Local storage can be unavailable in restricted environments.
  }
}

interface ConfettiPiece {
  left: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
  spin: number;
  hue: number;
}

function buildConfettiPieces() {
  return Array.from({ length: 42 }, (_, index) => ({
    left: Math.round(Math.random() * 100),
    delay: Math.round(Math.random() * 1200) / 1000,
    duration: 3.4 + Math.random() * 2.6,
    size: 6 + Math.round(Math.random() * 8),
    drift: (Math.random() * 48 - 24) * (index % 2 === 0 ? 1 : -1),
    spin: (Math.random() * 720 - 360),
    hue: [38, 18, 205, 150, 320][index % 5]
  }));
}

function pieceStyle(piece: ConfettiPiece) {
  return `
    left: ${piece.left}vw;
    width: ${piece.size}px;
    height: ${Math.max(4, Math.round(piece.size * 0.72))}px;
    background: hsl(${piece.hue} 86% 62%);
    animation-duration: ${piece.duration}s;
    animation-delay: ${piece.delay}s;
    --confetti-drift: ${piece.drift}vw;
    --confetti-spin: ${piece.spin}deg;
  `;
}
