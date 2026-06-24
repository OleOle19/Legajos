import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import {
  createSolidTable,
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  type Row
} from "@tanstack/solid-table";
import { cn } from "@/shared/lib/cn";

interface DataGridProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  selectedRowId?: number | null;
  highlightedRowIds?: number[];
  getRowId: (row: TData) => string;
  onRowClick?: (row: TData) => void;
  emptyTitle: string;
  emptyDescription: string;
}

export default function DataGrid<TData>(props: DataGridProps<TData>) {
  const table = createSolidTable({
    get data() {
      return props.data;
    },
    get columns() {
      return props.columns;
    },
    getCoreRowModel: getCoreRowModel(),
    getRowId: props.getRowId
  });
  const highlightedRowIds = new Set(props.highlightedRowIds ?? []);
  const [pageSize, setPageSize] = createSignal(25);
  const [pageIndex, setPageIndex] = createSignal(0);
  const rows = createMemo(() => table.getRowModel().rows);
  const totalRows = createMemo(() => rows().length);
  const totalPages = createMemo(() => Math.max(1, Math.ceil(totalRows() / pageSize())));
  const visibleRows = createMemo(() => {
    const start = pageIndex() * pageSize();
    return rows().slice(start, start + pageSize());
  });

  createEffect(() => {
    const maxPageIndex = Math.max(0, totalPages() - 1);
    if (pageIndex() > maxPageIndex) {
      setPageIndex(maxPageIndex);
    }
  });

  createEffect(() => {
    if (props.selectedRowId == null) return;
    const selectedIndex = rows().findIndex((row) => String(props.selectedRowId) === row.id);
    if (selectedIndex >= 0) {
      const nextPage = Math.floor(selectedIndex / pageSize());
      if (nextPage !== pageIndex()) {
        setPageIndex(nextPage);
      }
    }
  });

  return (
    <div class="overflow-auto rounded-card border border-shell-border bg-white/84 shadow-card">
      <table class="min-w-[1100px] w-full border-collapse">
        <thead>
          <For each={table.getHeaderGroups()}>
            {(headerGroup) => (
              <tr class="border-b border-shell-border/80 bg-[#f7f1e8]">
                <For each={headerGroup.headers}>
                  {(header) => (
                    <th class="sticky top-0 z-[1] bg-[#f7f1e8] px-4 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-ink-soft">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  )}
                </For>
              </tr>
            )}
          </For>
        </thead>
        <tbody>
          <Show
            when={table.getRowModel().rows.length}
            fallback={
              <tr>
                <td colspan={props.columns.length} class="px-6 py-16">
                  <div class="grid place-items-center text-center">
                    <strong class="text-lg text-ink">{props.emptyTitle}</strong>
                    <span class="mt-2 text-sm text-ink-soft">{props.emptyDescription}</span>
                  </div>
                </td>
              </tr>
            }
          >
            <For each={visibleRows()}>
              {(row) => (
                <DataGridRow
                  row={row}
                  selectedRowId={props.selectedRowId}
                  highlightedRowIds={highlightedRowIds}
                  onClick={() => props.onRowClick?.(row.original)}
                />
              )}
            </For>
          </Show>
        </tbody>
      </table>
      <Show when={totalRows() > pageSize()}>
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-shell-border/70 bg-[#fbf7f0] px-4 py-3 text-sm text-ink-soft">
          <div>
            Mostrando {pageIndex() * pageSize() + 1}-
            {Math.min((pageIndex() + 1) * pageSize(), totalRows())} de {totalRows()} legajos
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs uppercase tracking-[0.16em] text-ink-faint">Por página</span>
            <For each={[25, 50, 100]}>
              {(size) => (
                <button
                  type="button"
                  class={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition duration-150",
                    pageSize() === size
                      ? "border-brand/30 bg-brand/10 text-brand-deep"
                      : "border-shell-border bg-white/90 text-ink-soft hover:bg-white"
                  )}
                  onClick={() => {
                    setPageSize(size);
                    setPageIndex(0);
                  }}
                >
                  {size}
                </button>
              )}
            </For>
            <button
              type="button"
              class="rounded-full border border-shell-border bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink-soft transition duration-150 hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
              disabled={pageIndex() === 0}
              onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
            >
              Anterior
            </button>
            <button
              type="button"
              class="rounded-full border border-shell-border bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink-soft transition duration-150 hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
              disabled={pageIndex() >= totalPages() - 1}
              onClick={() => setPageIndex((current) => Math.min(totalPages() - 1, current + 1))}
            >
              Siguiente
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}

function DataGridRow<TData>(props: {
  row: Row<TData>;
  selectedRowId?: number | null;
  highlightedRowIds: Set<number>;
  onClick?: () => void;
}) {
  const isSelected = () => String(props.selectedRowId ?? "") === props.row.id;
  const isHighlighted = () => props.highlightedRowIds.has(Number(props.row.id));

  return (
    <tr
      class={cn(
        "cursor-pointer border-b border-shell-border/70 transition duration-150 hover:bg-brand/5",
        isHighlighted() && !isSelected() && "bg-[#fff7db] shadow-[inset_4px_0_0_rgb(234_179_8)]",
        isSelected() && "bg-brand/5 shadow-[inset_4px_0_0_rgb(34_84_140)]"
      )}
      onClick={props.onClick}
    >
      <For each={props.row.getVisibleCells()}>
        {(cell) => (
          <td class="px-4 py-4 align-top text-sm leading-6 text-ink">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        )}
      </For>
    </tr>
  );
}
