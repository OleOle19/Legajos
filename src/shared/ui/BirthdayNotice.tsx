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
  const [confettiPulse, setConfettiPulse] = createSignal(0);
  const confettiPieces = createMemo(() => {
    confettiPulse();
    return buildConfettiPieces();
  });
  const hasBirthdayToday = createMemo(() => props.reminders.some((item) => item.daysUntil === 0));
  let hideTimer: number | undefined;

  onMount(() => {
    const timer = window.setInterval(() => setTodayKey(currentDayKey()), DAY_POLL_MS);
    onCleanup(() => window.clearInterval(timer));
  });

  onCleanup(() => {
    if (hideTimer) window.clearTimeout(hideTimer);
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
    scheduleHide();
  });

  const triggerConfetti = () => {
    setConfettiPulse((value) => value + 1);
    setVisible(true);
    writeSeenDate(todayKey());
    scheduleHide();
  };

  return (
    <Show when={props.reminders.length > 0}>
      <Show when={hasBirthdayToday()}>
        <div class="pointer-events-none fixed inset-0 z-[84]">
          <ConfettiStorm pieces={confettiPieces()} />
        </div>

        <button
          type="button"
          class="pointer-events-auto fixed bottom-6 left-6 z-[90] grid h-14 w-14 place-items-center rounded-full border border-white/75 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.32),transparent_32%),linear-gradient(135deg,#1b3b67_0%,#2d5f97_52%,#61c38f_100%)] text-lg font-semibold text-white shadow-[0_16px_36px_rgba(23,38,61,0.28)] ring-4 ring-white/35 transition duration-200 hover:scale-105 active:scale-95"
          title="Lanzar confeti"
          aria-label="Lanzar confeti"
          onClick={triggerConfetti}
        >
          <span class="text-xl leading-none">+</span>
        </button>
      </Show>

      <Show when={visible()}>
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
    </Show>
  );

  function scheduleHide() {
    if (hideTimer) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => setVisible(false), NOTICE_VISIBLE_MS);
  }
}

function formatBirthday(value: string) {
  return formatDateShortLabel(value);
}

function ConfettiStorm(props: { pieces: ConfettiPiece[] }) {
  return (
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <For each={props.pieces}>
        {(piece) => <span class="birthday-confetti-piece" style={pieceStyle(piece)} />}
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
  shape: "circle" | "square" | "pill";
}

function buildConfettiPieces() {
  return Array.from({ length: 58 }, (_, index): ConfettiPiece => ({
    left: Math.round(Math.random() * 100),
    delay: Math.round(Math.random() * 1200) / 1000,
    duration: 4.2 + Math.random() * 3.2,
    size: 7 + Math.round(Math.random() * 10),
    drift: (Math.random() * 84 - 42) * (index % 2 === 0 ? 1 : -1),
    spin: Math.random() * 1080 - 540,
    hue: [38, 18, 205, 150, 320, 290, 55][index % 7],
    shape: index % 7 === 0 ? "circle" : index % 5 === 0 ? "pill" : "square"
  }));
}

function pieceStyle(piece: ConfettiPiece) {
  const borderRadius =
    piece.shape === "circle" ? "999px" : piece.shape === "pill" ? "999px" : "4px";

  return `
    left: ${piece.left}vw;
    width: ${piece.size}px;
    height: ${Math.max(5, Math.round(piece.size * 0.72))}px;
    border-radius: ${borderRadius};
    background: linear-gradient(180deg, hsl(${piece.hue} 90% 67%) 0%, hsl(${piece.hue} 78% 55%) 100%);
    animation-duration: ${piece.duration}s;
    animation-delay: ${piece.delay}s;
    --confetti-drift: ${piece.drift}vw;
    --confetti-spin: ${piece.spin}deg;
  `;
}
