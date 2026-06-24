import { invoke } from "@tauri-apps/api/core";
import type {
  AuthChangePasswordPayload,
  AuthLoginPayload,
  AuthResetPayload,
  AuthSetupPayload,
  AuthStatusResponse
} from "@/shared/types/auth";
import type {
  AttachmentResponse,
  BackupResponse,
  BootstrapResponse,
  CollectionResponse,
  DeleteResponse,
  ExportResponse,
  Filters,
  ImportResponse,
  LegajoDetail,
  MutationResponse,
  OpenResponse,
  SaveLegajoPayload,
  SaveTemplateResponse
} from "@/shared/types/legajo";

export interface LegajoBridge {
  addAttachment: (legajoId: number) => Promise<AttachmentResponse>;
  bootstrap: () => Promise<BootstrapResponse>;
  createBackup: () => Promise<BackupResponse>;
  createArea: (areaName: string) => Promise<string>;
  exportLegajos: (format: "pdf" | "xlsx", filters?: Partial<Filters>) => Promise<ExportResponse>;
  getLegajoDetail: (legajoId: number) => Promise<LegajoDetail>;
  importLegajos: () => Promise<ImportResponse>;
  listLegajos: (filters?: Partial<Filters>) => Promise<CollectionResponse>;
  deleteLegajo: (legajoId: number) => Promise<DeleteResponse>;
  openAttachment: (attachmentId: number) => Promise<OpenResponse>;
  saveLegajo: (payload: SaveLegajoPayload) => Promise<MutationResponse>;
  saveTemplate: () => Promise<SaveTemplateResponse>;
}

export interface AuthBridge {
  status: () => Promise<AuthStatusResponse>;
  setup: (payload: AuthSetupPayload) => Promise<AuthStatusResponse>;
  login: (payload: AuthLoginPayload) => Promise<AuthStatusResponse>;
  logout: () => Promise<AuthStatusResponse>;
  changePassword: (payload: AuthChangePasswordPayload) => Promise<AuthStatusResponse>;
  resetPassword: (payload: AuthResetPayload) => Promise<AuthStatusResponse>;
}

declare global {
  interface Window {
    legajoAPI: LegajoBridge;
    authAPI: AuthBridge;
  }
}

const createBridge = (): LegajoBridge => ({
  addAttachment: (legajoId) => invoke("add_attachment", { legajoId }),
  bootstrap: () => invoke("bootstrap"),
  createArea: (areaName) => invoke("create_area", { areaName }),
  createBackup: () => invoke("create_backup"),
  deleteLegajo: (legajoId) => invoke("delete_legajo", { legajoId }),
  exportLegajos: (format, filters) => invoke("export_legajos", { format, filters }),
  getLegajoDetail: (legajoId) => invoke("get_legajo_detail", { legajoId }),
  importLegajos: () => invoke("import_legajos"),
  listLegajos: (filters) => invoke("list_legajos", { filters }),
  openAttachment: (attachmentId) => invoke("open_attachment", { attachmentId }),
  saveLegajo: (payload) => invoke("save_legajo", { payload }),
  saveTemplate: () => invoke("save_template")
});

const createAuthBridge = (): AuthBridge => ({
  status: () => invoke("auth_status"),
  setup: (payload) => invoke("auth_setup", { payload }),
  login: (payload) => invoke("auth_login", { payload }),
  logout: () => invoke("auth_logout"),
  changePassword: (payload) => invoke("auth_change_password", { payload }),
  resetPassword: (payload) => invoke("auth_reset_password", { payload })
});

export const legajoBridge = (() => {
  if (!window.legajoAPI) {
    window.legajoAPI = createBridge();
  }
  return window.legajoAPI;
})();

export const authBridge = (() => {
  if (!window.authAPI) {
    window.authAPI = createAuthBridge();
  }
  return window.authAPI;
})();
