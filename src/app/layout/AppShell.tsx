import type { JSX } from "solid-js";
import { cn } from "@/shared/lib/cn";

interface AppShellProps {
  sidebar: JSX.Element;
  topbar: JSX.Element;
  children: JSX.Element;
  scrolled: boolean;
}

export default function AppShell(props: AppShellProps) {
  return (
    <div class="h-screen overflow-hidden bg-shell-gradient px-3 py-3 font-body text-ink sm:px-4 sm:py-4 lg:px-5">
      <div
        id="app-scroll-area"
        class="grid h-[calc(100vh-1.5rem)] grid-cols-1 gap-4 overflow-auto pr-1 xl:grid-cols-[280px_minmax(0,1fr)] xl:gap-5 sm:h-[calc(100vh-2rem)]"
      >
        {props.sidebar}
        <div class="flex min-h-0 min-w-0 flex-col gap-4 pb-5 xl:gap-5">
          <div class={cn("sticky top-0 z-40 transition duration-200", props.scrolled && "pt-2")}>{props.topbar}</div>
          <main class="min-h-0 min-w-0">{props.children}</main>
        </div>
      </div>
    </div>
  );
}
