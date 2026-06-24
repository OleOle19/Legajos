interface IdentityCellProps {
  name: string;
  subtitle: string;
}

export default function IdentityCell(props: IdentityCellProps) {
  return (
    <div class="min-w-0">
      <div class="truncate font-semibold text-ink">{props.name}</div>
      <div class="truncate text-xs text-ink-soft">{props.subtitle}</div>
    </div>
  );
}
