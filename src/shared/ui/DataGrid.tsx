import { For, Show } from "solid-js";
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
            <For each={table.getRowModel().rows}>
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
