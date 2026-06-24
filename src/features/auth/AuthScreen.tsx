import { Match, Show, Switch, createEffect, createSignal, type JSX } from "solid-js";
import ActionButton from "@/shared/ui/ActionButton";
import { authApi } from "@/shared/api/auth";

interface AuthScreenProps {
  configured: boolean;
  onAuthenticated: () => void;
}

type Mode = "login" | "setup" | "recover" | "code";

export default function AuthScreen(props: AuthScreenProps) {
  const [mode, setMode] = createSignal<Mode>(props.configured ? "login" : "setup");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [recoveryCode, setRecoveryCode] = createSignal<string | null>(null);

  const [loginPassword, setLoginPassword] = createSignal("");
  const [setupPassword, setSetupPassword] = createSignal("");
  const [setupConfirm, setSetupConfirm] = createSignal("");
  const [recoverCodeInput, setRecoverCodeInput] = createSignal("");
  const [recoverPassword, setRecoverPassword] = createSignal("");
  const [recoverConfirm, setRecoverConfirm] = createSignal("");

  createEffect(() => {
    if (!props.configured && mode() === "login") {
      setMode("setup");
    }
  });

  const copyRecoveryCode = async () => {
    const code = recoveryCode();
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setError("Código copiado al portapapeles.");
  };

  const submitLogin = async (event: SubmitEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await authApi.login({ password: loginPassword() });
      setLoginPassword("");
      props.onAuthenticated();
    } catch (caught) {
      setError(messageFromError(caught, "No se pudo iniciar sesión."));
    } finally {
      setBusy(false);
    }
  };

  const submitSetup = async (event: SubmitEvent) => {
    event.preventDefault();
    setError(null);
    if (setupPassword() !== setupConfirm()) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    try {
      const response = await authApi.setup({ password: setupPassword() });
      setRecoveryCode(response.recovery_code ?? null);
      setMode("code");
      setSetupPassword("");
      setSetupConfirm("");
    } catch (caught) {
      setError(messageFromError(caught, "No se pudo crear el acceso."));
    } finally {
      setBusy(false);
    }
  };

  const submitRecovery = async (event: SubmitEvent) => {
    event.preventDefault();
    setError(null);
    if (recoverPassword() !== recoverConfirm()) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    try {
      const response = await authApi.resetPassword({
        recovery_code: recoverCodeInput(),
        new_password: recoverPassword()
      });
      setRecoveryCode(response.recovery_code ?? null);
      setMode("code");
      setRecoverCodeInput("");
      setRecoverPassword("");
      setRecoverConfirm("");
    } catch (caught) {
      setError(messageFromError(caught, "No se pudo recuperar el acceso."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="grid min-h-screen place-items-center bg-shell-gradient px-4 py-8 font-body text-ink">
      <div class="grid w-full max-w-5xl overflow-hidden rounded-[36px] border border-white/80 bg-[radial-gradient(circle_at_top_right,rgba(86,193,207,0.14),transparent_24%),linear-gradient(135deg,rgba(255,252,247,0.99)_0%,rgba(245,237,226,0.985)_100%)] shadow-shell lg:grid-cols-[1fr_minmax(340px,0.92fr)]">
        <section class="relative overflow-hidden bg-[linear-gradient(160deg,#173054_0%,#163a67_58%,#0d2444_100%)] px-7 py-8 text-white sm:px-10 sm:py-10">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(97,195,143,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(86,193,207,0.14),transparent_22%)]" />
          <div class="relative z-10 flex h-full flex-col justify-between gap-10">
            <div>
              <p class="text-[11px] uppercase tracking-[0.28em] text-white/72">Archivo de rr. hh.</p>
              <h1 class="mt-4 font-display text-5xl font-semibold tracking-[-0.05em]">Legajo RH</h1>
              <p class="mt-5 max-w-xl text-lg leading-8 text-white/88">
                Acceso local para una sola persona. La información queda en esta PC y se protege con contraseña.
              </p>
            </div>

            <div class="grid gap-3">
              <InfoCard title="Acceso seguro" description="Solo entra quien conozca la contraseña." />
              <InfoCard title="Recuperación local" description="Si olvidas la clave, usa tu código de recuperación." />
              <InfoCard title="Cambio rápido" description="Luego de entrar, puedes cambiar la contraseña." />
            </div>
          </div>
        </section>

        <section class="flex min-h-0 flex-col justify-center px-6 py-8 sm:px-8">
          <div class="mx-auto w-full max-w-md">
            <p class="text-[11px] uppercase tracking-[0.24em] text-ink-soft">Acceso protegido</p>
            <h2 class="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
              {props.configured ? "Iniciar sesión" : "Crear contraseña inicial"}
            </h2>
            <p class="mt-3 text-sm leading-6 text-ink-soft">
              {props.configured
                ? "Ingresa la contraseña maestra para abrir el sistema."
                : "La primera vez, crea una contraseña maestra y guarda el código de recuperación."}
            </p>

            <Show when={error()}>
              <div class="mt-5 rounded-3xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-brand-deep">
                {error()}
              </div>
            </Show>

            <div class="mt-6 rounded-[28px] border border-shell-border bg-white/88 p-5 shadow-card">
              <Switch>
                <Match when={mode() === "login"}>
                  <form class="grid gap-4" onSubmit={submitLogin}>
                    <Field label="Contraseña maestra">
                      <input
                        type="password"
                        value={loginPassword()}
                        onInput={(event) => setLoginPassword(event.currentTarget.value)}
                        placeholder="Escribe tu contraseña"
                        class="w-full rounded-2xl border border-shell-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand-accent"
                        autocomplete="current-password"
                        required
                      />
                    </Field>

                    <ActionButton variant="primary" type="submit" disabled={busy()}>
                      Entrar al sistema
                    </ActionButton>

                    <button
                      type="button"
                      class="text-left text-sm font-semibold text-brand-deep hover:underline"
                      onClick={() => setMode("recover")}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </form>
                </Match>

                <Match when={mode() === "setup"}>
                  <form class="grid gap-4" onSubmit={submitSetup}>
                    <Field label="Nueva contraseña">
                      <input
                        type="password"
                        value={setupPassword()}
                        onInput={(event) => setSetupPassword(event.currentTarget.value)}
                        placeholder="Crea una contraseña"
                        class="w-full rounded-2xl border border-shell-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand-accent"
                        autocomplete="new-password"
                        required
                      />
                    </Field>

                    <Field label="Confirmar contraseña">
                      <input
                        type="password"
                        value={setupConfirm()}
                        onInput={(event) => setSetupConfirm(event.currentTarget.value)}
                        placeholder="Repite la contraseña"
                        class="w-full rounded-2xl border border-shell-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand-accent"
                        autocomplete="new-password"
                        required
                      />
                    </Field>

                    <ActionButton variant="primary" type="submit" disabled={busy()}>
                      Crear acceso
                    </ActionButton>
                  </form>
                </Match>

                <Match when={mode() === "recover"}>
                  <form class="grid gap-4" onSubmit={submitRecovery}>
                    <Field label="Código de recuperación">
                      <input
                        value={recoverCodeInput()}
                        onInput={(event) => setRecoverCodeInput(event.currentTarget.value.toUpperCase())}
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        class="w-full rounded-2xl border border-shell-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand-accent"
                        autocomplete="off"
                        required
                      />
                    </Field>

                    <Field label="Nueva contraseña">
                      <input
                        type="password"
                        value={recoverPassword()}
                        onInput={(event) => setRecoverPassword(event.currentTarget.value)}
                        placeholder="Crea una nueva contraseña"
                        class="w-full rounded-2xl border border-shell-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand-accent"
                        autocomplete="new-password"
                        required
                      />
                    </Field>

                    <Field label="Confirmar nueva contraseña">
                      <input
                        type="password"
                        value={recoverConfirm()}
                        onInput={(event) => setRecoverConfirm(event.currentTarget.value)}
                        placeholder="Repite la nueva contraseña"
                        class="w-full rounded-2xl border border-shell-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand-accent"
                        autocomplete="new-password"
                        required
                      />
                    </Field>

                    <div class="flex flex-wrap gap-3">
                      <ActionButton variant="primary" type="submit" disabled={busy()}>
                        Recuperar acceso
                      </ActionButton>
                      <ActionButton variant="ghost" type="button" onClick={() => setMode("login")}>
                        Volver
                      </ActionButton>
                    </div>
                  </form>
                </Match>

                <Match when={mode() === "code"}>
                  <div class="grid gap-4">
                    <div class="rounded-3xl border border-brand/20 bg-brand/5 p-4">
                      <p class="text-[11px] uppercase tracking-[0.2em] text-brand-deep">Guarda esto</p>
                      <strong class="mt-2 block text-lg text-ink">Código de recuperación</strong>
                      <code class="mt-3 block rounded-2xl border border-shell-border bg-white px-4 py-3 text-center text-base tracking-[0.18em] text-brand-deep">
                        {recoveryCode() || "No disponible"}
                      </code>
                      <p class="mt-3 text-sm leading-6 text-ink-soft">
                        Este código sirve para recuperar el acceso si olvidas la contraseña.
                      </p>
                    </div>

                    <div class="flex flex-wrap gap-3">
                      <ActionButton variant="secondary" type="button" onClick={copyRecoveryCode} disabled={!recoveryCode()}>
                        Copiar código
                      </ActionButton>
                      <ActionButton variant="primary" type="button" onClick={() => setMode("login")}>
                        Ir al inicio de sesión
                      </ActionButton>
                    </div>
                  </div>
                </Match>
              </Switch>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field(props: { label: string; children: JSX.Element }) {
  return (
    <label class="grid gap-2">
      <span class="text-sm font-medium text-ink">{props.label}</span>
      {props.children}
    </label>
  );
}

function InfoCard(props: { title: string; description: string }) {
  return (
    <div class="rounded-3xl border border-white/14 bg-white/10 px-4 py-4 backdrop-blur-sm">
      <strong class="block text-sm text-white">{props.title}</strong>
      <p class="mt-1 text-sm leading-6 text-white/78">{props.description}</p>
    </div>
  );
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
