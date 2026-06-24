import { invoke } from "@tauri-apps/api/core";
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

declare global {
  interface Window {
    legajoAPI: LegajoBridge;
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

export const legajoBridge = (() => {
  if (!window.legajoAPI) {
    window.legajoAPI = createBridge();
  }
  return window.legajoAPI;
})();
