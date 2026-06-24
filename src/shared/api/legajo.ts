import { legajoBridge } from "@/shared/api/bridge";
import type { Filters, SaveLegajoPayload } from "@/shared/types/legajo";

export const legajoApi = {
  addAttachment: (legajoId: number) => legajoBridge.addAttachment(legajoId),
  bootstrap: () => legajoBridge.bootstrap(),
  createArea: (areaName: string) => legajoBridge.createArea(areaName),
  createBackup: () => legajoBridge.createBackup(),
  deleteLegajo: (legajoId: number) => legajoBridge.deleteLegajo(legajoId),
  exportLegajos: (format: "pdf" | "xlsx", filters: Partial<Filters>) =>
    legajoBridge.exportLegajos(format, filters),
  getLegajoDetail: (legajoId: number) => legajoBridge.getLegajoDetail(legajoId),
  importLegajos: () => legajoBridge.importLegajos(),
  listLegajos: (filters: Partial<Filters>) => legajoBridge.listLegajos(filters),
  openAttachment: (attachmentId: number) => legajoBridge.openAttachment(attachmentId),
  saveLegajo: (payload: SaveLegajoPayload) => legajoBridge.saveLegajo(payload),
  saveTemplate: () => legajoBridge.saveTemplate()
};
