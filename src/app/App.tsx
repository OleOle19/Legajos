import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";

import { Suspense, createEffect, createMemo, createSignal, lazy, Match, Switch, onCleanup, onMount } from "solid-js";
import { createMutation, createQuery, useQueryClient } from "@tanstack/solid-query";
import AppShell from "@/app/layout/AppShell";
import SidebarRail from "@/app/layout/SidebarRail";
import TopCommandBar from "@/app/layout/TopCommandBar";
import { routeLegajoId, routeSection, useHashRoute } from "@/app/router";
import { authApi } from "@/shared/api/auth";
import { legajoApi } from "@/shared/api/legajo";
import AuthScreen from "@/features/auth/AuthScreen";
import SecurityDialog from "@/features/auth/SecurityDialog";
import type { AuthStatusResponse } from "@/shared/types/auth";
import { DEFAULT_FILTERS, type Filters, type LegajoDetail, type SaveLegajoPayload } from "@/shared/types/legajo";
import BirthdayNotice from "@/shared/ui/BirthdayNotice";
import ToastRegion, { type ToastState } from "@/shared/ui/ToastRegion";
import LegajoFormDialog from "@/features/legajos/LegajoFormDialog";
import { getBirthdayReminders } from "@/shared/lib/legajo";

const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage"));
const OperationsPage = lazy(() => import("@/features/operaciones/OperationsPage"));
const LegajosPage = lazy(() => import("@/features/legajos/LegajosPage"));

export default function App() {
  const { route, navigate } = useHashRoute();
  const queryClient = useQueryClient();
  const [authStatus, setAuthStatus] = createSignal<AuthStatusResponse | null>(null);
  const [isAuthLoading, setAuthLoading] = createSignal(true);
  const [authError, setAuthError] = createSignal<string | null>(null);
  const isAuthenticated = () => Boolean(authStatus()?.authenticated);
  const isConfigured = () => Boolean(authStatus()?.configured);
  const [filters, setFilters] = createSignal<Filters>(DEFAULT_FILTERS);
  const [queryFilters, setQueryFilters] = createSignal<Filters>(DEFAULT_FILTERS);
  const [toast, setToast] = createSignal<ToastState | null>(null);
  const [isDialogOpen, setDialogOpen] = createSignal(false);
  const [isSecurityOpen, setSecurityOpen] = createSignal(false);
  const [editingLegajo, setEditingLegajo] = createSignal<LegajoDetail | null>(null);
  const [selectedAttachmentId, setSelectedAttachmentId] = createSignal<number | null>(null);
  const [importSummaryText, setImportSummaryText] = createSignal<string | null>(null);
  const [isScrolled, setScrolled] = createSignal(false);

  const bootstrapQuery = createQuery(() => ({
    enabled: isAuthenticated(),
    queryKey: ["bootstrap"],
    queryFn: () => legajoApi.bootstrap()
  }));

  createEffect(() => {
    const nextFilters = filters();
    const timer = window.setTimeout(() => setQueryFilters(nextFilters), 180);
    onCleanup(() => window.clearTimeout(timer));
  });

  createEffect(() => {
    if (isAuthenticated()) return;
    setDialogOpen(false);
    setSecurityOpen(false);
    setEditingLegajo(null);
    setSelectedAttachmentId(null);
    setImportSummaryText(null);
  });

  const collectionQuery = createQuery(() => ({
    enabled: isAuthenticated(),
    queryKey: ["legajos", queryFilters()],
    queryFn: () => legajoApi.listLegajos(queryFilters())
  }));

  const selectedLegajoId = createMemo(() => routeLegajoId(route()));

  const detailQuery = createQuery(() => ({
    enabled: isAuthenticated() && selectedLegajoId() !== null,
    queryKey: ["legajo", selectedLegajoId()],
    queryFn: () => legajoApi.getLegajoDetail(selectedLegajoId()!)
  }));

  createEffect(() => {
    const detail = detailQuery.data;
    if (!detail) return;
    const current = selectedAttachmentId();
    const exists = detail.adjuntos.some((item) => item.id === current);
    if (!detail.adjuntos.length) {
      setSelectedAttachmentId(null);
    } else if (!exists) {
      setSelectedAttachmentId(detail.adjuntos[0].id);
    }
  });

  createEffect(() => {
    const container = document.getElementById("app-scroll-area");
    const onScroll = () => setScrolled((container?.scrollTop ?? 0) > 10);
    onScroll();
    container?.addEventListener("scroll", onScroll, { passive: true });
    onCleanup(() => container?.removeEventListener("scroll", onScroll));
  });

  onMount(() => {
    void refreshAuthStatus();
  });

  const saveLegajoMutation = createMutation(() => ({
    mutationFn: (payload: SaveLegajoPayload) => legajoApi.saveLegajo(payload),
    onSuccess: async (response) => {
      await invalidateData();
      navigate(`/legajos/${response.detail.id}`);
      setEditingLegajo(null);
      showToast("Legajo guardado correctamente.", "success");
    },
    onError: (error) => showToast(getErrorMessage(error, "No se pudo guardar el legajo."), "danger")
  }));

  const addAttachmentMutation = createMutation(() => ({
    mutationFn: (legajoId: number) => legajoApi.addAttachment(legajoId),
    onSuccess: async (response) => {
      if (response.canceled) return;
      await invalidateData();
      showToast("Archivo adjuntado correctamente.", "success");
    },
    onError: (error) => showToast(getErrorMessage(error, "No se pudo adjuntar el archivo."), "danger")
  }));

  const deleteLegajoMutation = createMutation(() => ({
    mutationFn: (legajoId: number) => legajoApi.deleteLegajo(legajoId),
    onSuccess: async () => {
      await invalidateData();
      setEditingLegajo(null);
      setDialogOpen(false);
      setSelectedAttachmentId(null);
      navigate("/legajos");
      showToast("Legajo eliminado correctamente.", "success");
    },
    onError: (error) => showToast(getErrorMessage(error, "No se pudo eliminar el legajo."), "danger")
  }));

  const createAreaMutation = createMutation(() => ({
    mutationFn: (areaName: string) => legajoApi.createArea(areaName),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      showToast("Área agregada correctamente.", "success");
    },
    onError: (error) => showToast(getErrorMessage(error, "No se pudo crear el área."), "danger")
  }));

  const importMutation = createMutation(() => ({
    mutationFn: () => legajoApi.importLegajos(),
    onSuccess: async (response) => {
      if (response.canceled) return;
      await invalidateData();
      const summary = response.summary;
      setImportSummaryText(
        summary
          ? `Creados: ${summary.created} - Actualizados: ${summary.updated} - Omitidos: ${summary.skipped}${
              summary.errors.length ? ` - Errores: ${summary.errors.join(" | ")}` : ""
            }`
          : "Importación completada."
      );
      showToast("Importación completada.", "success");
    },
    onError: (error) => showToast(getErrorMessage(error, "No se pudo importar el archivo."), "danger")
  }));

  const logoutMutation = createMutation(() => ({
    mutationFn: () => authApi.logout(),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ["bootstrap"] });
      queryClient.removeQueries({ queryKey: ["legajos"] });
      queryClient.removeQueries({ queryKey: ["legajo"] });
      await refreshAuthStatus();
      navigate("/dashboard");
      showToast("Sesión cerrada.", "success");
    },
    onError: (error) => showToast(getErrorMessage(error, "No se pudo cerrar la sesión."), "danger")
  }));

  const currentStats = createMemo(() => collectionQuery.data?.stats ?? bootstrapQuery.data?.stats);
  const allLegajos = createMemo(() => bootstrapQuery.data?.legajos ?? []);
  const visibleLegajos = createMemo(() => collectionQuery.data?.legajos ?? bootstrapQuery.data?.legajos ?? []);
  const currentAreas = createMemo(() => bootstrapQuery.data?.areas ?? []);
  const birthdayReminders = createMemo(() => getBirthdayReminders(allLegajos(), 7));
  const birthdayReminderIds = createMemo(() => birthdayReminders().map((item) => item.id));

  const openNewLegajo = () => {
    setEditingLegajo(null);
    setDialogOpen(true);
  };

  const openEditLegajo = (detail: LegajoDetail) => {
    setEditingLegajo(detail);
    setDialogOpen(true);
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const sidebar = (
    <SidebarRail
      route={routeSection(route())}
      onNavigate={navigate}
      search={filters().search}
      onSearch={(search) => setFilters((current) => ({ ...current, search }))}
    />
  );

  const topbar = (
    <TopCommandBar
      search={filters().search}
      onSearch={(search) => setFilters((current) => ({ ...current, search }))}
      onBackup={() => runAction(() => legajoApi.createBackup(), "Respaldo creado y abierto en el explorador.")}
      onNewLegajo={openNewLegajo}
      onSecurity={() => setSecurityOpen(true)}
      onLogout={() => logoutMutation.mutate()}
      scrolled={isScrolled()}
    />
  );

  if (isAuthLoading()) {
    return <AuthLoading />;
  }

  if (authError()) {
    return <AuthError message={authError()!} onRetry={() => void refreshAuthStatus()} />;
  }

  if (!isAuthenticated()) {
    return <AuthScreen configured={isConfigured()} onAuthenticated={() => void refreshAuthStatus()} />;
  }

  return (
    <>
      <AppShell sidebar={sidebar} topbar={topbar} scrolled={isScrolled()}>
        <Suspense fallback={<RouteLoading />}>
          <Switch>
          <Match when={routeSection(route()) === "dashboard" && currentStats()}>
            {(stats) => (
              <DashboardPage
                stats={stats()}
                visibleLegajos={visibleLegajos()}
                onNavigateLegajos={() => navigate("/legajos")}
                onNavigateOperaciones={() => navigate("/operaciones")}
                onNewLegajo={openNewLegajo}
              />
            )}
          </Match>

          <Match when={routeSection(route()) === "legajos" && currentStats()}>
            {(stats) => (
              <LegajosPage
                filters={filters()}
                legajos={visibleLegajos()}
                stats={{
                  total: stats().total,
                  activos: stats().activos,
                  pasivos: stats().pasivos
                }}
                selectedLegajoId={selectedLegajoId()}
                detail={detailQuery.data}
                selectedAttachmentId={selectedAttachmentId()}
                birthdayReminderIds={birthdayReminderIds()}
                onFiltersChange={setFilters}
                onSelectLegajo={(id) => navigate(`/legajos/${id}`)}
                onSelectAttachment={setSelectedAttachmentId}
                onOpenAttachment={(attachmentId) =>
                  runAction(() => legajoApi.openAttachment(attachmentId), "Adjunto abierto.")
                }
                onAttach={(detail) => addAttachmentMutation.mutate(detail.id)}
                onEdit={openEditLegajo}
                onDelete={(detail) => {
                  if (!window.confirm(`¿Eliminar el legajo ${detail.numero_legajo} de ${detail.apellidos_nombres}?`)) {
                    return;
                  }
                  deleteLegajoMutation.mutate(detail.id);
                }}
                onCreate={openNewLegajo}
                onExport={(format) =>
                  runAction(
                    () => legajoApi.exportLegajos(format, filters()),
                    `Exportación ${format.toUpperCase()} generada correctamente.`
                  )
                }
                onResetFilters={resetFilters}
              />
            )}
          </Match>

          <Match when={routeSection(route()) === "operaciones"}>
            <OperationsPage
              filters={filters()}
              areas={currentAreas()}
              onImport={() => importMutation.mutate()}
              onBackup={() => runAction(() => legajoApi.createBackup(), "Respaldo creado y abierto en el explorador.")}
              onExport={(format, exportFilters) =>
                runAction(
                  () => legajoApi.exportLegajos(format, exportFilters),
                  `Exportación ${format.toUpperCase()} generada correctamente.`
                )
              }
              onSaveTemplate={() => runAction(() => legajoApi.saveTemplate(), "Plantilla guardada correctamente.")}
              importSummary={importSummaryText()}
            />
          </Match>
          </Switch>
        </Suspense>
      </AppShell>

      <LegajoFormDialog
        open={isDialogOpen()}
        current={editingLegajo()}
        legajos={allLegajos()}
        areas={currentAreas()}
        onCreateArea={async (areaName) => createAreaMutation.mutateAsync(areaName)}
        onOpenChange={setDialogOpen}
        onSubmit={async (payload) => {
          await saveLegajoMutation.mutateAsync(payload);
        }}
      />

      <SecurityDialog
        open={isSecurityOpen()}
        onOpenChange={setSecurityOpen}
        onSuccess={(message) => showToast(message, "success")}
      />

      <BirthdayNotice reminders={birthdayReminders()} />
      <ToastRegion toast={toast()} />
    </>
  );

  async function invalidateData() {
    await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
    await queryClient.invalidateQueries({ queryKey: ["legajos"] });
    await queryClient.invalidateQueries({ queryKey: ["legajo"] });
  }

  async function runAction<T>(
    action: () => Promise<T>,
    successMessage: string,
    canceledMessage?: string
  ) {
    try {
      const result = await action();
      if (typeof result === "object" && result !== null && "canceled" in result && result.canceled) {
        if (canceledMessage) showToast(canceledMessage);
        return;
      }
      showToast(successMessage, "success");
    } catch (error) {
      showToast(getErrorMessage(error, "No se pudo completar la acción."), "danger");
    }
  }

  function showToast(message: string, tone: ToastState["tone"] = "neutral") {
    setToast({ message, tone });
    window.clearTimeout(showToastTimeout);
    showToastTimeout = window.setTimeout(() => setToast(null), 2800);
  }

  async function refreshAuthStatus() {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const response = await authApi.status();
      setAuthStatus(response);
    } catch (error) {
      setAuthStatus(null);
      setAuthError(getErrorMessage(error, "No se pudo verificar el acceso."));
    } finally {
      setAuthLoading(false);
    }
  }
}

let showToastTimeout = 0;

function RouteLoading() {
  return (
    <div class="grid min-h-[42vh] place-items-center rounded-card border border-shell-border bg-white/70 p-10 shadow-card">
      <div class="max-w-sm text-center">
        <p class="text-[11px] uppercase tracking-[0.2em] text-ink-soft">Cargando módulo</p>
        <strong class="mt-2 block text-2xl font-semibold tracking-[-0.03em] text-ink">Preparando vista</strong>
        <p class="mt-3 text-sm leading-7 text-ink-soft">
          Un momento, estamos levantando la sección seleccionada para que responda mejor.
        </p>
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function AuthLoading() {
  return (
    <div class="grid min-h-screen place-items-center bg-shell-gradient px-4 py-8 font-body text-ink">
      <div class="w-full max-w-md rounded-[32px] border border-shell-border bg-white/86 p-8 text-center shadow-shell">
        <p class="text-[11px] uppercase tracking-[0.24em] text-ink-soft">Seguridad</p>
        <strong class="mt-2 block text-2xl font-semibold tracking-[-0.03em] text-ink">Preparando acceso</strong>
        <p class="mt-3 text-sm leading-7 text-ink-soft">Estamos verificando si la sesión está abierta.</p>
      </div>
    </div>
  );
}

function AuthError(props: { message: string; onRetry: () => void }) {
  return (
    <div class="grid min-h-screen place-items-center bg-shell-gradient px-4 py-8 font-body text-ink">
      <div class="w-full max-w-md rounded-[32px] border border-shell-border bg-white/86 p-8 text-center shadow-shell">
        <p class="text-[11px] uppercase tracking-[0.24em] text-ink-soft">Seguridad</p>
        <strong class="mt-2 block text-2xl font-semibold tracking-[-0.03em] text-ink">No pudimos abrir el acceso</strong>
        <p class="mt-3 text-sm leading-7 text-ink-soft">{props.message}</p>
        <button
          type="button"
          class="mt-6 inline-flex items-center justify-center rounded-full border border-brand/25 bg-brand/8 px-5 py-3 text-sm font-semibold text-brand-deep transition hover:border-brand-accent hover:bg-brand/12"
          onClick={props.onRetry}
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
