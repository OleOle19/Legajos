export type EstadoLegajo = "activo" | "pasivo";

export const CONTRACT_TYPE_OPTIONS = [
  "DL 276",
  "DL 728 - Serenos",
  "DL 728 - Obreros",
  "CAS",
  "CAS - Confianza",
  "CAS - Necesidad"
] as const;

export interface Filters {
  search: string;
  estado: "todos" | EstadoLegajo;
  organo_unidad: string;
  regimen_laboral: string;
}

export interface SaveLegajoPayload {
  id?: number;
  numero_legajo: string;
  apellidos_nombres: string;
  dni: string;
  organo_unidad: string;
  cargo_puesto: string;
  regimen_laboral: string;
  fecha_nacimiento: string;
  fecha_vinculacion: string;
  remuneracion: string;
  celular: string;
  direccion: string;
  categoria_estudios: string;
  correo_electronico: string;
  perfil_mof: string;
  hijos_menores_de_edad: string;
  condicion: string;
  estado_legajo: EstadoLegajo;
  ubicacion_legajo: string;
  observaciones: string;
  origen_registro?: string;
}

export interface LegajoSummary {
  id: number;
  numero_legajo: string;
  apellidos_nombres: string;
  dni: string;
  organo_unidad: string;
  cargo_puesto: string;
  regimen_laboral: string;
  fecha_nacimiento: string;
  fecha_vinculacion: string;
  remuneracion: string;
  celular: string;
  direccion: string;
  categoria_estudios: string;
  correo_electronico: string;
  perfil_mof: string;
  hijos_menores_de_edad: string;
  condicion: string;
  estado_legajo: EstadoLegajo;
  ubicacion_legajo: string;
  observaciones: string;
  origen_registro: string;
  created_at: string;
  updated_at: string;
  total_adjuntos: number;
}

export interface Movimiento {
  id: number;
  legajo_id: number;
  tipo_movimiento: string;
  detalle: string;
  fecha: string;
  numero_legajo?: string | null;
  apellidos_nombres?: string | null;
}

export interface Adjunto {
  id: number;
  legajo_id: number;
  nombre_archivo: string;
  tipo_archivo: string;
  ruta_interna: string;
  fecha_carga: string;
}

export interface LegajoDetail {
  id: number;
  numero_legajo: string;
  apellidos_nombres: string;
  dni: string;
  organo_unidad: string;
  cargo_puesto: string;
  regimen_laboral: string;
  fecha_nacimiento: string;
  fecha_vinculacion: string;
  remuneracion: string;
  celular: string;
  direccion: string;
  categoria_estudios: string;
  correo_electronico: string;
  perfil_mof: string;
  hijos_menores_de_edad: string;
  condicion: string;
  estado_legajo: EstadoLegajo;
  ubicacion_legajo: string;
  observaciones: string;
  origen_registro: string;
  created_at: string;
  updated_at: string;
  movimientos: Movimiento[];
  adjuntos: Adjunto[];
}

export interface DashboardStats {
  total: number;
  activos: number;
  pasivos: number;
  sinUbicacion: number;
  adjuntos: number;
  recientes: Movimiento[];
}

export interface StorageSummary {
  databasePath: string;
  attachmentsDir: string;
  backupsDir: string;
}

export interface BootstrapResponse {
  stats: DashboardStats;
  legajos: LegajoSummary[];
  areas: string[];
  storage: StorageSummary;
}

export interface CollectionResponse {
  stats: DashboardStats;
  legajos: LegajoSummary[];
}

export interface MutationResponse {
  detail: LegajoDetail;
  stats: DashboardStats;
  legajos: LegajoSummary[];
}

export interface AttachmentResponse {
  canceled: boolean;
  detail?: LegajoDetail | null;
  stats?: DashboardStats | null;
  legajos?: LegajoSummary[] | null;
}

export interface SaveTemplateResponse {
  canceled: boolean;
  file_path?: string | null;
}

export interface ExportResponse {
  canceled: boolean;
  file_path?: string | null;
  total?: number | null;
}

export interface BackupResponse {
  ok: boolean;
  backup_dir: string;
}

export interface OpenResponse {
  ok: boolean;
  file_path: string;
}

export interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface ImportResponse {
  canceled: boolean;
  summary?: ImportSummary | null;
  stats?: DashboardStats | null;
  legajos?: LegajoSummary[] | null;
}

export const DEFAULT_FILTERS: Filters = {
  search: "",
  estado: "todos",
  organo_unidad: "",
  regimen_laboral: ""
};
