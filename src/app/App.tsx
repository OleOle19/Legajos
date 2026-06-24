import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";

import { createEffect, createMemo, createSignal, Match, Switch, onCleanup } from "solid-js";
import { createMutation, createQuery, useQueryClient } from "@tanstack/solid-query";
import AppShell from "@/app/layout/AppShell";
import SidebarRail from "@/app/layout/SidebarRail";
import TopCommandBar from "@/app/layout/TopCommandBar";
import { routeLegajoId, routeSection, useHashRoute } from "@/app/router";
import { legajoApi } from "@/shared/api/legajo";
import { DEFAULT_FILTERS, type Filters, type LegajoDetail, type SaveLegajoPayload } from "@/shared/types/legajo";
import BirthdayNotice from "@/shared/ui/BirthdayNotice";
import ToastRegion, { type ToastState } from "@/shared/ui/ToastRegion";
import DashboardPage from "@/features/dashboard/DashboardPage";
import OperationsPage from "@/features/operaciones/OperationsPage";
import LegajosPage from "@/features/legajos/LegajosPage";
import LegajoFormDialog from "@/features/legajos/LegajoFormDialog";
import { getBirthdayReminders } from "@/shared/lib/legajo";

export default function App() {
  const { route, navigate } = useHashRoute();
  const queryClient = useQueryClient();
  const [filters, setFilters] = createSignal<Filters>(DEFAULT_FILTERS);
  const [toast, setToast] = createSignal<ToastState | null>(null);
  const [isDialogOpen, setDialogOpen] = createSignal(false);
  const [editingLegajo, setEditingLegajo] = createSignal<LegajoDetail | null>(null);
  const [selectedAttachmentId, setSelectedAttachmentId] = createSignal<number | null>(null);
  const [importSummaryText, setImportSummaryText] = createSignal<string | null>(null);
  const [isScrolled, setScrolled] = createSignal(false);

  const bootstrapQuery = createQuery(() => ({
    queryKey: ["bootstrap"],
    queryFn: () => legajoApi.bootstrap()
  }));

  const collectionQuery = createQuery(() => ({
    queryKey: ["legajos", filters()],
    queryFn: () => legajoApi.listLegajos(filters())
  }));

  const selectedLegajoId = createMemo(() => routeLegajoId(route()));

  const detailQuery = createQuery(() => ({
    enabled: selectedLegajoId() !== null,
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

  const currentStats = createMemo(() => collectionQuery.data?.stats ?? bootstrapQuery.data?.stats);
  const allLegajos = createMemo(() => bootstrapQuery.data?.legajos ?? []);
  const visibleLegajos = createMemo(() => collectionQuery.data?.legajos ?? bootstrapQuery.data?.legajos ?? []);
  const currentAreas = createMemo(() => bootstrapQuery.data?.areas ?? []);
  const birthdayReminders = createMemo(() => getBirthdayReminders(allLegajos(), 7));

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
      scrolled={isScrolled()}
    />
  );

  return (
    <>
      <AppShell sidebar={sidebar} topbar={topbar} scrolled={isScrolled()}>
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
                    `Exportacion ${format.toUpperCase()} generada correctamente.`
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
                  `Exportacion ${format.toUpperCase()} generada correctamente.`
                )
              }
              onSaveTemplate={() => runAction(() => legajoApi.saveTemplate(), "Plantilla guardada correctamente.")}
              importSummary={importSummaryText()}
            />
          </Match>
        </Switch>
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
      showToast(getErrorMessage(error, "No se pudo completar la accion."), "danger");
    }
  }

  function showToast(message: string, tone: ToastState["tone"] = "neutral") {
    setToast({ message, tone });
    window.clearTimeout(showToastTimeout);
    showToastTimeout = window.setTimeout(() => setToast(null), 2800);
  }
}

let showToastTimeout = 0;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
