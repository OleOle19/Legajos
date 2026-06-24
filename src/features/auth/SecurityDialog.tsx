import { createSignal, type JSX } from "solid-js";
import * as Dialog from "@kobalte/core/dialog";
import { authApi } from "@/shared/api/auth";
import ActionButton from "@/shared/ui/ActionButton";

interface SecurityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (message: string) => void;
}

export default function SecurityDialog(props: SecurityDialogProps) {
  const [currentPassword, setCurrentPassword] = createSignal("");
  const [newPassword, setNewPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [busy, setBusy] = createSignal(false);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  };

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    setError(null);
    if (newPassword() !== confirmPassword()) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword(),
        new_password: newPassword()
      });
      resetForm();
      props.onOpenChange(false);
      props.onSuccess?.("Contraseña actualizada correctamente.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cambiar la contraseña.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root
      open={props.open}
      onOpenChange={(open) => {
        props.onOpenChange(open);
        if (!open) resetForm();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-[70] bg-[#111b2e]/52 backdrop-blur-sm" />
        <div class="fixed inset-0 z-[71] overflow-hidden p-3 sm:p-4 lg:p-6">
          <div class="flex h-full items-center justify-center">
            <Dialog.Content class="w-full max-w-xl rounded-shell border border-white/75 bg-[radial-gradient(circle_at_top_right,rgba(86,193,207,0.12),transparent_22%),linear-gradient(180deg,rgba(255,252,248,0.995)_0%,rgba(245,237,226,0.98)_100%)] p-6 shadow-shell outline-none sm:p-7">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-[11px] uppercase tracking-[0.22em] text-ink-soft">Seguridad</p>
                  <Dialog.Title class="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                    Cambiar contraseña
                  </Dialog.Title>
                  <p class="mt-3 text-sm leading-6 text-ink-soft">
                    Ingresa tu contraseña actual y define una nueva. Si la olvidas, puedes volver a entrar con el
                    código de recuperación desde la pantalla inicial.
                  </p>
                </div>
                <ActionButton variant="ghost" onClick={() => props.onOpenChange(false)}>
                  Cerrar
                </ActionButton>
              </div>

              <ShowError error={error()} />

              <form class="mt-5 grid gap-4" onSubmit={submit}>
                <SecurityField label="Contraseña actual">
                  <input
                    type="password"
                    value={currentPassword()}
                    onInput={(event) => setCurrentPassword(event.currentTarget.value)}
                    placeholder="Escribe tu contraseña actual"
                    class="w-full rounded-2xl border border-shell-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand-accent"
                    autocomplete="current-password"
                    required
                  />
                </SecurityField>

                <SecurityField label="Nueva contraseña">
                  <input
                    type="password"
                    value={newPassword()}
                    onInput={(event) => setNewPassword(event.currentTarget.value)}
                    placeholder="Escribe la nueva contraseña"
                    class="w-full rounded-2xl border border-shell-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand-accent"
                    autocomplete="new-password"
                    required
                  />
                </SecurityField>

                <SecurityField label="Confirmar nueva contraseña">
                  <input
                    type="password"
                    value={confirmPassword()}
                    onInput={(event) => setConfirmPassword(event.currentTarget.value)}
                    placeholder="Repite la nueva contraseña"
                    class="w-full rounded-2xl border border-shell-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand-accent"
                    autocomplete="new-password"
                    required
                  />
                </SecurityField>

                <div class="flex flex-wrap gap-3 pt-1">
                  <ActionButton variant="primary" type="submit" disabled={busy()}>
                    Guardar cambio
                  </ActionButton>
                  <ActionButton variant="secondary" type="button" onClick={() => props.onOpenChange(false)}>
                    Cancelar
                  </ActionButton>
                </div>
              </form>
            </Dialog.Content>
          </div>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SecurityField(props: { label: string; children: JSX.Element }) {
  return (
    <label class="grid gap-2">
      <span class="text-sm font-medium text-ink">{props.label}</span>
      {props.children}
    </label>
  );
}

function ShowError(props: { error: string | null }) {
  if (!props.error) return null;
  return <div class="mt-5 rounded-3xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-brand-deep">{props.error}</div>;
}
