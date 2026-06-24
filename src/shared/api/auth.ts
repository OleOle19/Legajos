import { authBridge } from "@/shared/api/bridge";
import type {
  AuthChangePasswordPayload,
  AuthLoginPayload,
  AuthResetPayload,
  AuthSetupPayload,
  AuthStatusResponse
} from "@/shared/types/auth";

export const authApi = {
  changePassword: (payload: AuthChangePasswordPayload) => authBridge.changePassword(payload),
  login: (payload: AuthLoginPayload) => authBridge.login(payload),
  logout: () => authBridge.logout(),
  resetPassword: (payload: AuthResetPayload) => authBridge.resetPassword(payload),
  setup: (payload: AuthSetupPayload) => authBridge.setup(payload),
  status: () => authBridge.status()
} satisfies {
  changePassword: (payload: AuthChangePasswordPayload) => Promise<AuthStatusResponse>;
  login: (payload: AuthLoginPayload) => Promise<AuthStatusResponse>;
  logout: () => Promise<AuthStatusResponse>;
  resetPassword: (payload: AuthResetPayload) => Promise<AuthStatusResponse>;
  setup: (payload: AuthSetupPayload) => Promise<AuthStatusResponse>;
  status: () => Promise<AuthStatusResponse>;
};
