import { createSignal, onCleanup, onMount } from "solid-js";

export type AppRoute = "/dashboard" | "/legajos" | "/operaciones" | `/legajos/${number}`;

function normalizeRoute(hash: string): AppRoute {
  const path = hash.replace(/^#/, "") || "/dashboard";
  if (path === "/dashboard" || path === "/legajos" || path === "/operaciones") return path;
  if (/^\/legajos\/\d+$/.test(path)) return path as AppRoute;
  return "/dashboard";
}

export function useHashRoute() {
  const [route, setRoute] = createSignal<AppRoute>(normalizeRoute(window.location.hash));

  const sync = () => setRoute(normalizeRoute(window.location.hash));

  onMount(() => {
    if (!window.location.hash) {
      window.location.hash = "/dashboard";
    }
    window.addEventListener("hashchange", sync);
  });

  onCleanup(() => window.removeEventListener("hashchange", sync));

  const navigate = (next: AppRoute | "/dashboard" | "/legajos" | "/operaciones") => {
    window.location.hash = next;
  };

  return { route, navigate };
}

export function routeSection(route: AppRoute) {
  if (route.startsWith("/legajos")) return "legajos";
  if (route === "/operaciones") return "operaciones";
  return "dashboard";
}

export function routeLegajoId(route: AppRoute) {
  if (!route.startsWith("/legajos/")) return null;
  const value = Number(route.replace("/legajos/", ""));
  return Number.isFinite(value) ? value : null;
}

