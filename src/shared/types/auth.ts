export interface AuthStatusResponse {
  configured: boolean;
  authenticated: boolean;
  recovery_code?: string | null;
}

export interface AuthSetupPayload {
  password: string;
}

export interface AuthLoginPayload {
  password: string;
}

export interface AuthResetPayload {
  recovery_code: string;
  new_password: string;
}

export interface AuthChangePasswordPayload {
  current_password: string;
  new_password: string;
}
