use anyhow::{anyhow, Context, Result};
use calamine::{open_workbook_auto, Reader};
use chrono::{Duration, NaiveDate, SecondsFormat, Utc};
use printpdf::{GeneratePdfOptions, PdfDocument, PdfSaveOptions};
use rfd::FileDialog;
use rusqlite::{params, params_from_iter, Connection, OptionalExtension, Row};
use rust_xlsxwriter::Workbook;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

const REQUIRED_FIELDS: [&str; 9] = [
    "numero_legajo",
    "apellidos_nombres",
    "dni",
    "organo_unidad",
    "cargo_puesto",
    "regimen_laboral",
    "fecha_vinculacion",
    "estado_legajo",
    "ubicacion_legajo",
];

const TEMPLATE_COLUMNS: [(&str, &str); 19] = [
    ("numero_legajo", "Número de legajo"),
    ("apellidos_nombres", "Apellidos y nombres"),
    ("dni", "Número de Documento de Identidad"),
    ("organo_unidad", "Órgano o unidad orgánica"),
    ("cargo_puesto", "Nombre del cargo estructural y/o puesto"),
    ("regimen_laboral", "Tipo de contrato"),
    ("fecha_nacimiento", "Fecha de nacimiento"),
    ("fecha_vinculacion", "Fecha de vinculación"),
    ("remuneracion", "Remuneración"),
    ("celular", "Celular"),
    ("direccion", "Dirección"),
    ("categoria_estudios", "Categoría de estudios"),
    ("correo_electronico", "Correo electrónico"),
    ("perfil_mof", "Perfil solicitado según el MOF"),
    ("hijos_menores_de_edad", "Hijos menores de edad"),
    ("condicion", "Condición"),
    ("estado_legajo", "Estado del legajo"),
    ("ubicacion_legajo", "Ubicación del legajo"),
    ("observaciones", "Observaciones"),
];

#[derive(Clone)]
struct AppState {
    root_dir: PathBuf,
    database_path: PathBuf,
    attachments_dir: PathBuf,
    backups_dir: PathBuf,
}

impl AppState {
    fn new(root_dir: PathBuf) -> Result<Self> {
        let attachments_dir = root_dir.join("adjuntos");
        let backups_dir = root_dir.join("respaldos");
        fs::create_dir_all(&attachments_dir)?;
        fs::create_dir_all(&backups_dir)?;

        Ok(Self {
            database_path: root_dir.join("legajos.sqlite"),
            root_dir,
            attachments_dir,
            backups_dir,
        })
    }

    fn storage_summary(&self) -> StorageSummary {
        StorageSummary {
            database_path: self.database_path.to_string_lossy().into_owned(),
            attachments_dir: self.attachments_dir.to_string_lossy().into_owned(),
            backups_dir: self.backups_dir.to_string_lossy().into_owned(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(default)]
struct Filters {
    search: String,
    estado: String,
    organo_unidad: String,
    regimen_laboral: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(default)]
struct SaveLegajoPayload {
    id: Option<i64>,
    numero_legajo: String,
    apellidos_nombres: String,
    dni: String,
    organo_unidad: String,
    cargo_puesto: String,
    regimen_laboral: String,
    fecha_nacimiento: String,
    fecha_vinculacion: String,
    remuneracion: String,
    celular: String,
    direccion: String,
    categoria_estudios: String,
    correo_electronico: String,
    perfil_mof: String,
    hijos_menores_de_edad: String,
    condicion: String,
    estado_legajo: String,
    ubicacion_legajo: String,
    observaciones: String,
    origen_registro: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct LegajoRecord {
    id: i64,
    numero_legajo: String,
    apellidos_nombres: String,
    dni: String,
    organo_unidad: String,
    cargo_puesto: String,
    regimen_laboral: String,
    fecha_nacimiento: String,
    fecha_vinculacion: String,
    remuneracion: String,
    celular: String,
    direccion: String,
    categoria_estudios: String,
    correo_electronico: String,
    perfil_mof: String,
    hijos_menores_de_edad: String,
    condicion: String,
    estado_legajo: String,
    ubicacion_legajo: String,
    observaciones: String,
    origen_registro: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct LegajoSummary {
    id: i64,
    numero_legajo: String,
    apellidos_nombres: String,
    dni: String,
    organo_unidad: String,
    cargo_puesto: String,
    regimen_laboral: String,
    fecha_nacimiento: String,
    fecha_vinculacion: String,
    remuneracion: String,
    celular: String,
    direccion: String,
    categoria_estudios: String,
    correo_electronico: String,
    perfil_mof: String,
    hijos_menores_de_edad: String,
    condicion: String,
    estado_legajo: String,
    ubicacion_legajo: String,
    observaciones: String,
    origen_registro: String,
    created_at: String,
    updated_at: String,
    total_adjuntos: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Movimiento {
    id: i64,
    legajo_id: i64,
    tipo_movimiento: String,
    detalle: String,
    fecha: String,
    numero_legajo: Option<String>,
    apellidos_nombres: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Adjunto {
    id: i64,
    legajo_id: i64,
    nombre_archivo: String,
    tipo_archivo: String,
    ruta_interna: String,
    fecha_carga: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct LegajoDetail {
    id: i64,
    numero_legajo: String,
    apellidos_nombres: String,
    dni: String,
    organo_unidad: String,
    cargo_puesto: String,
    regimen_laboral: String,
    fecha_nacimiento: String,
    fecha_vinculacion: String,
    remuneracion: String,
    celular: String,
    direccion: String,
    categoria_estudios: String,
    correo_electronico: String,
    perfil_mof: String,
    hijos_menores_de_edad: String,
    condicion: String,
    estado_legajo: String,
    ubicacion_legajo: String,
    observaciones: String,
    origen_registro: String,
    created_at: String,
    updated_at: String,
    movimientos: Vec<Movimiento>,
    adjuntos: Vec<Adjunto>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct DashboardStats {
    total: i64,
    activos: i64,
    pasivos: i64,
    #[serde(rename = "sinUbicacion")]
    sin_ubicacion: i64,
    adjuntos: i64,
    recientes: Vec<Movimiento>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct StorageSummary {
    #[serde(rename = "databasePath")]
    database_path: String,
    #[serde(rename = "attachmentsDir")]
    attachments_dir: String,
    #[serde(rename = "backupsDir")]
    backups_dir: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct BootstrapResponse {
    stats: DashboardStats,
    legajos: Vec<LegajoSummary>,
    areas: Vec<String>,
    storage: StorageSummary,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct CollectionResponse {
    stats: DashboardStats,
    legajos: Vec<LegajoSummary>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct MutationResponse {
    detail: LegajoDetail,
    stats: DashboardStats,
    legajos: Vec<LegajoSummary>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct AttachmentResponse {
    canceled: bool,
    detail: Option<LegajoDetail>,
    stats: Option<DashboardStats>,
    legajos: Option<Vec<LegajoSummary>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct SaveTemplateResponse {
    canceled: bool,
    file_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ExportResponse {
    canceled: bool,
    file_path: Option<String>,
    total: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct BackupResponse {
    ok: bool,
    backup_dir: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct OpenResponse {
    ok: bool,
    file_path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ImportSummary {
    created: usize,
    updated: usize,
    skipped: usize,
    errors: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ImportResponse {
    canceled: bool,
    summary: Option<ImportSummary>,
    stats: Option<DashboardStats>,
    legajos: Option<Vec<LegajoSummary>>,
}

#[derive(Debug, Clone)]
struct ImportedLegajoRow {
    payload: SaveLegajoPayload,
    source_sheet: String,
    source_row: usize,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .map_err(|error| anyhow!(error.to_string()))?;
            let state = AppState::new(app_data_dir.join("legajo-rh-data"))?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            bootstrap,
            list_legajos,
            get_legajo_detail,
            save_legajo,
            list_areas,
            create_area,
            add_attachment,
            open_attachment,
            create_backup,
            save_template,
            import_legajos,
            export_legajos
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn bootstrap(state: tauri::State<'_, AppState>) -> Result<BootstrapResponse, String> {
    let connection = open_connection(&state)?;
    Ok(BootstrapResponse {
        stats: get_dashboard_stats(&connection)?,
        legajos: list_legajos_internal(&connection, &Filters::default())?,
        areas: list_areas_internal(&connection)?,
        storage: state.storage_summary(),
    })
}

#[tauri::command]
fn list_legajos(
    filters: Option<Filters>,
    state: tauri::State<'_, AppState>,
) -> Result<CollectionResponse, String> {
    let connection = open_connection(&state)?;
    let applied = filters.unwrap_or_default();
    Ok(CollectionResponse {
        stats: get_dashboard_stats(&connection)?,
        legajos: list_legajos_internal(&connection, &applied)?,
    })
}

#[tauri::command]
fn get_legajo_detail(
    legajo_id: i64,
    state: tauri::State<'_, AppState>,
) -> Result<LegajoDetail, String> {
    let connection = open_connection(&state)?;
    get_legajo_detail_internal(&connection, legajo_id).map_err(error_message)
}

#[tauri::command]
fn list_areas(state: tauri::State<'_, AppState>) -> Result<Vec<String>, String> {
    let connection = open_connection(&state)?;
    list_areas_internal(&connection)
}

#[tauri::command]
fn create_area(area_name: String, state: tauri::State<'_, AppState>) -> Result<String, String> {
    let connection = open_connection(&state)?;
    create_area_internal(&connection, &area_name).map_err(error_message)
}

#[tauri::command]
fn save_legajo(
    payload: SaveLegajoPayload,
    state: tauri::State<'_, AppState>,
) -> Result<MutationResponse, String> {
    let mut connection = open_connection(&state)?;
    let detail = save_legajo_internal(&mut connection, payload).map_err(error_message)?;
    Ok(MutationResponse {
        detail,
        stats: get_dashboard_stats(&connection)?,
        legajos: list_legajos_internal(&connection, &Filters::default())?,
    })
}

#[tauri::command]
fn add_attachment(
    legajo_id: i64,
    state: tauri::State<'_, AppState>,
) -> Result<AttachmentResponse, String> {
    let Some(source_path) = FileDialog::new()
        .add_filter(
            "Documentos",
            &["pdf", "png", "jpg", "jpeg", "webp", "tif", "tiff"],
        )
        .pick_file()
    else {
        return Ok(AttachmentResponse {
            canceled: true,
            detail: None,
            stats: None,
            legajos: None,
        });
    };

    let mut connection = open_connection(&state)?;
    let detail = add_attachment_internal(&mut connection, &state, legajo_id, &source_path)
        .map_err(error_message)?;
    Ok(AttachmentResponse {
        canceled: false,
        detail: Some(detail),
        stats: Some(get_dashboard_stats(&connection)?),
        legajos: Some(list_legajos_internal(&connection, &Filters::default())?),
    })
}

#[tauri::command]
fn open_attachment(
    attachment_id: i64,
    state: tauri::State<'_, AppState>,
) -> Result<OpenResponse, String> {
    let connection = open_connection(&state)?;
    let file_path = open_attachment_internal(&connection, attachment_id).map_err(error_message)?;
    open::that_detached(&file_path).map_err(error_message)?;
    Ok(OpenResponse {
        ok: true,
        file_path: file_path.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
fn create_backup(state: tauri::State<'_, AppState>) -> Result<BackupResponse, String> {
    let connection = open_connection(&state)?;
    let backup_dir = create_backup_internal(&connection, &state).map_err(error_message)?;
    open::that_detached(&backup_dir).map_err(error_message)?;
    Ok(BackupResponse {
        ok: true,
        backup_dir: backup_dir.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
fn save_template() -> Result<SaveTemplateResponse, String> {
    let Some(file_path) = FileDialog::new()
        .set_file_name("plantilla-legajos.xlsx")
        .add_filter("Excel", &["xlsx"])
        .save_file()
    else {
        return Ok(SaveTemplateResponse {
            canceled: true,
            file_path: None,
        });
    };

    write_template(&file_path).map_err(error_message)?;
    Ok(SaveTemplateResponse {
        canceled: false,
        file_path: Some(file_path.to_string_lossy().into_owned()),
    })
}

#[tauri::command]
fn import_legajos(state: tauri::State<'_, AppState>) -> Result<ImportResponse, String> {
    let Some(file_path) = FileDialog::new()
        .add_filter("Excel", &["xlsx", "xls"])
        .pick_file()
    else {
        return Ok(ImportResponse {
            canceled: true,
            summary: None,
            stats: None,
            legajos: None,
        });
    };

    let rows = import_legajos_workbook(&file_path).map_err(error_message)?;
    let mut connection = open_connection(&state)?;
    let summary = import_legajos_internal(&mut connection, rows).map_err(error_message)?;
    Ok(ImportResponse {
        canceled: false,
        summary: Some(summary),
        stats: Some(get_dashboard_stats(&connection)?),
        legajos: Some(list_legajos_internal(&connection, &Filters::default())?),
    })
}

#[tauri::command]
fn export_legajos(
    format: String,
    filters: Option<Filters>,
    state: tauri::State<'_, AppState>,
) -> Result<ExportResponse, String> {
    let connection = open_connection(&state)?;
    let applied = filters.unwrap_or_default();
    let rows = list_legajos_internal(&connection, &applied)?;
    let normalized_format = if format.eq_ignore_ascii_case("pdf") {
        "pdf"
    } else {
        "xlsx"
    };

    let dialog = FileDialog::new();
    let file_path = if normalized_format == "pdf" {
        dialog
            .set_file_name("relacion-digital-legajos.pdf")
            .add_filter("PDF", &["pdf"])
            .save_file()
    } else {
        dialog
            .set_file_name("relacion-digital-legajos.xlsx")
            .add_filter("Excel", &["xlsx"])
            .save_file()
    };

    let Some(file_path) = file_path else {
        return Ok(ExportResponse {
            canceled: true,
            file_path: None,
            total: None,
        });
    };

    if normalized_format == "pdf" {
        export_legajos_pdf(&file_path, &rows, &applied).map_err(error_message)?;
    } else {
        export_legajos_workbook(&file_path, &rows).map_err(error_message)?;
    }

    open::that_detached(file_path.parent().unwrap_or(&file_path)).map_err(error_message)?;
    Ok(ExportResponse {
        canceled: false,
        file_path: Some(file_path.to_string_lossy().into_owned()),
        total: Some(rows.len()),
    })
}

fn open_connection(state: &AppState) -> Result<Connection, String> {
    fs::create_dir_all(&state.root_dir).map_err(error_message)?;
    let connection = Connection::open(&state.database_path).map_err(error_message)?;
    connection
        .pragma_update(None, "foreign_keys", 1_i64)
        .map_err(error_message)?;
    initialize_schema(&connection).map_err(error_message)?;
    Ok(connection)
}

fn initialize_schema(connection: &Connection) -> Result<()> {
    connection.execute_batch(
        r#"
    CREATE TABLE IF NOT EXISTS legajos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_legajo TEXT NOT NULL UNIQUE,
      apellidos_nombres TEXT NOT NULL,
      dni TEXT NOT NULL,
      organo_unidad TEXT NOT NULL,
      cargo_puesto TEXT NOT NULL,
      regimen_laboral TEXT NOT NULL,
      fecha_nacimiento TEXT NOT NULL DEFAULT '',
      fecha_vinculacion TEXT NOT NULL,
      remuneracion TEXT NOT NULL DEFAULT '',
      celular TEXT NOT NULL DEFAULT '',
      direccion TEXT NOT NULL DEFAULT '',
      categoria_estudios TEXT NOT NULL DEFAULT '',
      correo_electronico TEXT NOT NULL DEFAULT '',
      perfil_mof TEXT NOT NULL DEFAULT '',
      hijos_menores_de_edad TEXT NOT NULL DEFAULT '',
      condicion TEXT NOT NULL DEFAULT '',
      estado_legajo TEXT NOT NULL CHECK (estado_legajo IN ('activo', 'pasivo')),
      ubicacion_legajo TEXT NOT NULL,
      observaciones TEXT NOT NULL DEFAULT '',
      origen_registro TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS movimientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      legajo_id INTEGER NOT NULL REFERENCES legajos(id) ON DELETE CASCADE,
      tipo_movimiento TEXT NOT NULL,
      detalle TEXT NOT NULL,
      fecha TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS adjuntos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      legajo_id INTEGER NOT NULL REFERENCES legajos(id) ON DELETE CASCADE,
      nombre_archivo TEXT NOT NULL,
      tipo_archivo TEXT NOT NULL,
      ruta_interna TEXT NOT NULL,
      fecha_carga TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    "#,
    )?;
    ensure_legajo_columns(connection)?;
    seed_area_catalog(connection)?;
    Ok(())
}

fn seed_area_catalog(connection: &Connection) -> Result<()> {
    let stamp = now_iso();
    connection.execute(
        r#"
        INSERT OR IGNORE INTO areas (nombre, created_at, updated_at)
        SELECT DISTINCT TRIM(organo_unidad), ?, ?
        FROM legajos
        WHERE TRIM(organo_unidad) <> ''
        "#,
        params![&stamp, &stamp],
    )?;
    Ok(())
}

fn list_areas_internal(connection: &Connection) -> Result<Vec<String>, String> {
    let mut statement = connection
        .prepare("SELECT nombre FROM areas ORDER BY nombre COLLATE NOCASE ASC")
        .map_err(error_message)?;
    let items = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(error_message)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(error_message)?;
    Ok(items)
}

fn create_area_internal(connection: &Connection, raw_name: &str) -> Result<String> {
    let name = raw_name.trim();
    if name.is_empty() {
        return Err(anyhow!("El nombre del area no puede estar vacio."));
    }

    let stamp = now_iso();
    connection.execute(
        r#"
        INSERT INTO areas (nombre, created_at, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(nombre) DO UPDATE SET updated_at = excluded.updated_at
        "#,
        params![name, &stamp, &stamp],
    )?;
    Ok(name.to_string())
}

fn ensure_legajo_columns(connection: &Connection) -> Result<()> {
    let existing = connection
        .prepare("PRAGMA table_info(legajos)")?
        .query_map([], |row| row.get::<_, String>("name"))?
        .collect::<Result<HashSet<_>, _>>()?;

    let columns = [
        ("fecha_nacimiento", "TEXT NOT NULL DEFAULT ''"),
        ("remuneracion", "TEXT NOT NULL DEFAULT ''"),
        ("celular", "TEXT NOT NULL DEFAULT ''"),
        ("direccion", "TEXT NOT NULL DEFAULT ''"),
        ("categoria_estudios", "TEXT NOT NULL DEFAULT ''"),
        ("correo_electronico", "TEXT NOT NULL DEFAULT ''"),
        ("perfil_mof", "TEXT NOT NULL DEFAULT ''"),
        ("hijos_menores_de_edad", "TEXT NOT NULL DEFAULT ''"),
        ("condicion", "TEXT NOT NULL DEFAULT ''"),
    ];

    for (column, definition) in columns {
        if !existing.contains(column) {
            connection.execute(
                &format!("ALTER TABLE legajos ADD COLUMN {} {}", column, definition),
                [],
            )?;
        }
    }

    Ok(())
}

fn list_legajos_internal(
    connection: &Connection,
    filters: &Filters,
) -> Result<Vec<LegajoSummary>, String> {
    let mut clauses = Vec::new();
    let mut values = Vec::new();

    if !filters.search.trim().is_empty() {
        let needle = format!("%{}%", filters.search.trim());
        clauses.push(
            "(numero_legajo LIKE ? OR apellidos_nombres LIKE ? OR dni LIKE ? OR organo_unidad LIKE ? OR cargo_puesto LIKE ? OR regimen_laboral LIKE ? OR fecha_nacimiento LIKE ? OR fecha_vinculacion LIKE ? OR remuneracion LIKE ? OR celular LIKE ? OR direccion LIKE ? OR categoria_estudios LIKE ? OR correo_electronico LIKE ? OR perfil_mof LIKE ? OR hijos_menores_de_edad LIKE ? OR condicion LIKE ? OR ubicacion_legajo LIKE ?)".to_string(),
        );
        for _ in 0..17 {
            values.push(needle.clone());
        }
    }

    if !filters.estado.trim().is_empty() && filters.estado.trim() != "todos" {
        clauses.push("estado_legajo = ?".to_string());
        values.push(filters.estado.trim().to_string());
    }

    if !filters.organo_unidad.trim().is_empty() {
        clauses.push("organo_unidad LIKE ?".to_string());
        values.push(format!("%{}%", filters.organo_unidad.trim()));
    }

    if !filters.regimen_laboral.trim().is_empty() {
        clauses.push("regimen_laboral LIKE ?".to_string());
        values.push(format!("%{}%", filters.regimen_laboral.trim()));
    }

    let where_clause = if clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", clauses.join(" AND "))
    };

    let sql = format!(
        r#"
      SELECT
        legajos.*,
        (SELECT COUNT(*) FROM adjuntos WHERE adjuntos.legajo_id = legajos.id) AS total_adjuntos
      FROM legajos
      {}
      ORDER BY updated_at DESC, apellidos_nombres ASC
    "#,
        where_clause
    );

    let mut statement = connection.prepare(&sql).map_err(error_message)?;
    let mapped = statement
        .query_map(params_from_iter(values.iter()), legajo_summary_from_row)
        .map_err(error_message)?;

    let mut items = Vec::new();
    for item in mapped {
        items.push(item.map_err(error_message)?);
    }
    Ok(items)
}

fn legajo_summary_from_row(row: &Row<'_>) -> rusqlite::Result<LegajoSummary> {
    Ok(LegajoSummary {
        id: row.get("id")?,
        numero_legajo: row.get("numero_legajo")?,
        apellidos_nombres: row.get("apellidos_nombres")?,
        dni: row.get("dni")?,
        organo_unidad: row.get("organo_unidad")?,
        cargo_puesto: row.get("cargo_puesto")?,
        regimen_laboral: row.get("regimen_laboral")?,
        fecha_nacimiento: row.get("fecha_nacimiento")?,
        fecha_vinculacion: row.get("fecha_vinculacion")?,
        remuneracion: row.get("remuneracion")?,
        celular: row.get("celular")?,
        direccion: row.get("direccion")?,
        categoria_estudios: row.get("categoria_estudios")?,
        correo_electronico: row.get("correo_electronico")?,
        perfil_mof: row.get("perfil_mof")?,
        hijos_menores_de_edad: row.get("hijos_menores_de_edad")?,
        condicion: row.get("condicion")?,
        estado_legajo: row.get("estado_legajo")?,
        ubicacion_legajo: row.get("ubicacion_legajo")?,
        observaciones: row.get("observaciones")?,
        origen_registro: row.get("origen_registro")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        total_adjuntos: row.get("total_adjuntos")?,
    })
}

fn legajo_record_from_row(row: &Row<'_>) -> rusqlite::Result<LegajoRecord> {
    Ok(LegajoRecord {
        id: row.get("id")?,
        numero_legajo: row.get("numero_legajo")?,
        apellidos_nombres: row.get("apellidos_nombres")?,
        dni: row.get("dni")?,
        organo_unidad: row.get("organo_unidad")?,
        cargo_puesto: row.get("cargo_puesto")?,
        regimen_laboral: row.get("regimen_laboral")?,
        fecha_nacimiento: row.get("fecha_nacimiento")?,
        fecha_vinculacion: row.get("fecha_vinculacion")?,
        remuneracion: row.get("remuneracion")?,
        celular: row.get("celular")?,
        direccion: row.get("direccion")?,
        categoria_estudios: row.get("categoria_estudios")?,
        correo_electronico: row.get("correo_electronico")?,
        perfil_mof: row.get("perfil_mof")?,
        hijos_menores_de_edad: row.get("hijos_menores_de_edad")?,
        condicion: row.get("condicion")?,
        estado_legajo: row.get("estado_legajo")?,
        ubicacion_legajo: row.get("ubicacion_legajo")?,
        observaciones: row.get("observaciones")?,
        origen_registro: row.get("origen_registro")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

fn get_legajo_detail_internal(connection: &Connection, legajo_id: i64) -> Result<LegajoDetail> {
    let record = connection
        .prepare("SELECT * FROM legajos WHERE id = ?")?
        .query_row(params![legajo_id], legajo_record_from_row)
        .optional()?
        .ok_or_else(|| anyhow!("No se encontro el legajo solicitado."))?;

    let mut movement_statement =
        connection.prepare("SELECT * FROM movimientos WHERE legajo_id = ? ORDER BY fecha DESC")?;
    let movimientos = movement_statement
        .query_map(params![legajo_id], |row| {
            Ok(Movimiento {
                id: row.get("id")?,
                legajo_id: row.get("legajo_id")?,
                tipo_movimiento: row.get("tipo_movimiento")?,
                detalle: row.get("detalle")?,
                fecha: row.get("fecha")?,
                numero_legajo: None,
                apellidos_nombres: None,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let mut attachment_statement = connection
        .prepare("SELECT * FROM adjuntos WHERE legajo_id = ? ORDER BY fecha_carga DESC")?;
    let adjuntos = attachment_statement
        .query_map(params![legajo_id], |row| {
            Ok(Adjunto {
                id: row.get("id")?,
                legajo_id: row.get("legajo_id")?,
                nombre_archivo: row.get("nombre_archivo")?,
                tipo_archivo: row.get("tipo_archivo")?,
                ruta_interna: row.get("ruta_interna")?,
                fecha_carga: row.get("fecha_carga")?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(LegajoDetail {
        id: record.id,
        numero_legajo: record.numero_legajo,
        apellidos_nombres: record.apellidos_nombres,
        dni: record.dni,
        organo_unidad: record.organo_unidad,
        cargo_puesto: record.cargo_puesto,
        regimen_laboral: record.regimen_laboral,
        fecha_nacimiento: record.fecha_nacimiento,
        fecha_vinculacion: record.fecha_vinculacion,
        remuneracion: record.remuneracion,
        celular: record.celular,
        direccion: record.direccion,
        categoria_estudios: record.categoria_estudios,
        correo_electronico: record.correo_electronico,
        perfil_mof: record.perfil_mof,
        hijos_menores_de_edad: record.hijos_menores_de_edad,
        condicion: record.condicion,
        estado_legajo: record.estado_legajo,
        ubicacion_legajo: record.ubicacion_legajo,
        observaciones: record.observaciones,
        origen_registro: record.origen_registro,
        created_at: record.created_at,
        updated_at: record.updated_at,
        movimientos,
        adjuntos,
    })
}

fn save_legajo_internal(
    connection: &mut Connection,
    payload: SaveLegajoPayload,
) -> Result<LegajoDetail> {
    let mut sanitized = sanitize_legajo_payload(payload)?;
    if sanitized.id.is_none() {
        sanitized.numero_legajo =
            build_legajo_number(connection, &sanitized.regimen_laboral, &sanitized.numero_legajo)?;
    }
    let transaction = connection.transaction()?;
    let current = if let Some(id) = sanitized.id {
        transaction
            .prepare("SELECT * FROM legajos WHERE id = ?")?
            .query_row(params![id], legajo_record_from_row)
            .optional()?
    } else {
        None
    };

    let duplicate = transaction
        .prepare("SELECT * FROM legajos WHERE numero_legajo = ?")?
        .query_row(params![&sanitized.numero_legajo], legajo_record_from_row)
        .optional()?;

    if let Some(existing) = duplicate {
        if Some(existing.id) != sanitized.id {
            return Err(anyhow!("Ya existe un legajo con ese numero."));
        }
    }

    let now = now_iso();
    let legajo_id = if let Some(current_record) = current {
        transaction.execute(
            r#"
        UPDATE legajos SET
          numero_legajo = ?,
          apellidos_nombres = ?,
          dni = ?,
          organo_unidad = ?,
          cargo_puesto = ?,
          regimen_laboral = ?,
          fecha_nacimiento = ?,
          fecha_vinculacion = ?,
          remuneracion = ?,
          celular = ?,
          direccion = ?,
          categoria_estudios = ?,
          correo_electronico = ?,
          perfil_mof = ?,
          hijos_menores_de_edad = ?,
          condicion = ?,
          estado_legajo = ?,
          ubicacion_legajo = ?,
          observaciones = ?,
          origen_registro = ?,
          updated_at = ?
        WHERE id = ?
      "#,
            params![
                &sanitized.numero_legajo,
                &sanitized.apellidos_nombres,
                &sanitized.dni,
                &sanitized.organo_unidad,
                &sanitized.cargo_puesto,
                &sanitized.regimen_laboral,
                &sanitized.fecha_nacimiento,
                &sanitized.fecha_vinculacion,
                &sanitized.remuneracion,
                &sanitized.celular,
                &sanitized.direccion,
                &sanitized.categoria_estudios,
                &sanitized.correo_electronico,
                &sanitized.perfil_mof,
                &sanitized.hijos_menores_de_edad,
                &sanitized.condicion,
                &sanitized.estado_legajo,
                &sanitized.ubicacion_legajo,
                &sanitized.observaciones,
                sanitized.origen_registro.as_deref(),
                &now,
                current_record.id
            ],
        )?;

        let detail = build_change_detail(&current_record, &sanitized);
        let movement_type = if current_record.estado_legajo != sanitized.estado_legajo {
            "cambio_estado"
        } else if current_record.ubicacion_legajo != sanitized.ubicacion_legajo {
            "cambio_ubicacion"
        } else {
            "edicion"
        };
        record_movement(&transaction, current_record.id, movement_type, &detail)?;
        current_record.id
    } else {
        transaction.execute(
            r#"
        INSERT INTO legajos (
          numero_legajo, apellidos_nombres, dni, organo_unidad, cargo_puesto,
          regimen_laboral, fecha_nacimiento, fecha_vinculacion, remuneracion, celular,
          direccion, categoria_estudios, correo_electronico, perfil_mof,
          hijos_menores_de_edad, condicion, estado_legajo, ubicacion_legajo,
          observaciones, origen_registro, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      "#,
            params![
                &sanitized.numero_legajo,
                &sanitized.apellidos_nombres,
                &sanitized.dni,
                &sanitized.organo_unidad,
                &sanitized.cargo_puesto,
                &sanitized.regimen_laboral,
                &sanitized.fecha_nacimiento,
                &sanitized.fecha_vinculacion,
                &sanitized.remuneracion,
                &sanitized.celular,
                &sanitized.direccion,
                &sanitized.categoria_estudios,
                &sanitized.correo_electronico,
                &sanitized.perfil_mof,
                &sanitized.hijos_menores_de_edad,
                &sanitized.condicion,
                &sanitized.estado_legajo,
                &sanitized.ubicacion_legajo,
                &sanitized.observaciones,
                sanitized.origen_registro.as_deref(),
                &now,
                &now
            ],
        )?;
        let inserted_id = transaction.last_insert_rowid();
        record_movement(
            &transaction,
            inserted_id,
            "creacion",
            "Creacion inicial del legajo.",
        )?;
        inserted_id
    };

    transaction.commit()?;
    get_legajo_detail_internal(connection, legajo_id)
}

fn add_attachment_internal(
    connection: &mut Connection,
    state: &AppState,
    legajo_id: i64,
    source_path: &Path,
) -> Result<LegajoDetail> {
    let legajo = connection
        .prepare("SELECT * FROM legajos WHERE id = ?")?
        .query_row(params![legajo_id], legajo_record_from_row)
        .optional()?
        .ok_or_else(|| anyhow!("No se encontro el legajo para adjuntar el archivo."))?;

    if !source_path.is_file() {
        return Err(anyhow!("Solo se pueden adjuntar archivos."));
    }

    let original_name = source_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("archivo");
    let extension = source_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("bin")
        .to_ascii_lowercase();
    let stored_name = format!(
        "{}-{}.{}",
        sanitize_file_component(&legajo.numero_legajo),
        Utc::now().timestamp_millis(),
        extension
    );
    let destination = state.attachments_dir.join(stored_name);
    fs::copy(source_path, &destination)?;

    let transaction = connection.transaction()?;
    transaction.execute(
        r#"
      INSERT INTO adjuntos (legajo_id, nombre_archivo, tipo_archivo, ruta_interna, fecha_carga)
      VALUES (?, ?, ?, ?, ?)
    "#,
        params![
            legajo_id,
            original_name,
            extension,
            destination.to_string_lossy().into_owned(),
            now_iso()
        ],
    )?;
    record_movement(
        &transaction,
        legajo_id,
        "adjunto",
        &format!("Se adjunto el archivo {}.", original_name),
    )?;
    transaction.commit()?;
    get_legajo_detail_internal(connection, legajo_id)
}

fn open_attachment_internal(connection: &Connection, attachment_id: i64) -> Result<PathBuf> {
    let path: Option<String> = connection
        .prepare("SELECT ruta_interna FROM adjuntos WHERE id = ?")?
        .query_row(params![attachment_id], |row| row.get(0))
        .optional()?;
    let Some(path) = path else {
        return Err(anyhow!("No se encontro el adjunto solicitado."));
    };
    Ok(PathBuf::from(path))
}

fn import_legajos_internal(
    connection: &mut Connection,
    rows: Vec<ImportedLegajoRow>,
) -> Result<ImportSummary> {
    let mut created = 0;
    let mut updated = 0;
    let mut skipped = 0;
    let mut errors = Vec::new();

    for row in rows {
        if row.payload.numero_legajo.trim().is_empty() {
            skipped += 1;
            continue;
        }

        let existing_id: Option<i64> = connection
            .prepare("SELECT id FROM legajos WHERE numero_legajo = ?")?
            .query_row(params![row.payload.numero_legajo.trim()], |r| r.get(0))
            .optional()?;

        let payload = SaveLegajoPayload {
            id: existing_id,
            origen_registro: Some("importado".to_string()),
            ..row.payload
        };

        match save_legajo_internal(connection, payload) {
            Ok(_) => {
                if existing_id.is_some() {
                    updated += 1;
                } else {
                    created += 1;
                }
            }
            Err(error) => errors.push(format!(
                "Hoja '{}' fila {}: {}",
                row.source_sheet,
                row.source_row,
                error_message(error)
            )),
        }
    }

    Ok(ImportSummary {
        created,
        updated,
        skipped,
        errors,
    })
}

fn import_legajos_workbook(file_path: &Path) -> Result<Vec<ImportedLegajoRow>> {
    let mut workbook = open_workbook_auto(file_path)?;
    let mut result = Vec::new();

    let sheet_names = workbook.sheet_names().to_owned();
    for sheet_name in sheet_names {
        let range = match workbook.worksheet_range(&sheet_name) {
            Ok(range) => range,
            Err(_) => continue,
        };

        let rows = range
            .rows()
            .map(|row| {
                row.iter()
                    .map(|cell| cell.to_string().trim().to_string())
                    .collect::<Vec<_>>()
            })
            .collect::<Vec<_>>();
        let Some((header_row_index, headers)) = find_import_header_row(&rows) else {
            continue;
        };

        let sheet_key = sheet_import_key(&sheet_name);
        let header_row = rows.get(header_row_index).cloned().unwrap_or_default();
        for (index, row) in rows.iter().enumerate().skip(header_row_index + 1) {
            if is_blank_row(row) {
                continue;
            }

            let excel_row = index + 1;
            let import_sequence = index.saturating_sub(header_row_index);
            let payload = build_import_payload(
                &sheet_name,
                &sheet_key,
                excel_row,
                import_sequence,
                &headers,
                &header_row,
                row,
            );
            result.push(ImportedLegajoRow {
                payload,
                source_sheet: sheet_name.clone(),
                source_row: excel_row,
            });
        }
    }

    if result.is_empty() {
        return Err(anyhow!("El libro no contiene hojas importables."));
    }

    Ok(result)
}

fn build_import_payload(
    sheet_name: &str,
    sheet_key: &str,
    excel_row: usize,
    import_sequence: usize,
    headers: &HashMap<String, usize>,
    header_row: &[String],
    row: &[String],
) -> SaveLegajoPayload {
    let mut used_columns = HashSet::new();
    let numero_origen = take_import_value(row, headers, &mut used_columns, &["numerodelegajo", "n"])
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or_else(|| import_sequence.max(1));
    let area = take_import_value(row, headers, &mut used_columns, &["area"]);
    let organo_unidad = take_import_value(
        row,
        headers,
        &mut used_columns,
        &["organoounidadorganica", "organoounidad"],
    )
    .or_else(|| area.clone())
    .unwrap_or_else(|| sheet_name.trim().to_string());
    let cargo_puesto = take_import_value(
        row,
        headers,
        &mut used_columns,
        &[
            "nombredelcargo",
            "nombredelcargoestructuralyopuesto",
            "cargoestructuralyopuesto",
            "cargoestructuralypuesto",
        ],
    )
    .or_else(|| area.clone())
    .unwrap_or_else(|| organo_unidad.clone());
    let regimen_laboral = sheet_regimen_label(sheet_name);
    let fecha_nacimiento = take_import_value(row, headers, &mut used_columns, &["fechadenacimiento"])
        .map(|value| normalize_date_input(&value))
        .unwrap_or_default();
    let fecha_vinculacion = take_import_value(
        row,
        headers,
        &mut used_columns,
        &["fechadeingreso", "fechadevinculacion"],
    )
    .map(|value| normalize_date_input(&value))
    .unwrap_or_default();
    let remuneracion = take_import_value(row, headers, &mut used_columns, &["remuneracion"]).unwrap_or_default();
    let celular = take_import_value(row, headers, &mut used_columns, &["celular"]).unwrap_or_default();
    let direccion = take_import_value(row, headers, &mut used_columns, &["direccion"]).unwrap_or_default();
    let categoria_estudios =
        take_import_value(row, headers, &mut used_columns, &["categoriadeestudios"]).unwrap_or_default();
    let correo_electronico =
        take_import_value(row, headers, &mut used_columns, &["correoelectronico"]).unwrap_or_default();
    let perfil_mof = take_import_value(
        row,
        headers,
        &mut used_columns,
        &[
            "perfilmof",
            "perfilesolicitadossegunelmof",
            "perfilesolicitadosegunelmof",
            "perfilesolicitadosegunelmof",
            "perfilsolicitadosegunelmof",
            "perfilsolicitadosegunelmof",
            "mof",
        ],
    )
    .unwrap_or_default();
    let hijos_menores_de_edad =
        take_import_value(row, headers, &mut used_columns, &["hijosmenoresdeedad"]).unwrap_or_default();
    let condicion = take_import_value(row, headers, &mut used_columns, &["condicion"]).unwrap_or_default();
    let estado_legajo = take_import_value(row, headers, &mut used_columns, &["estadodellegajo"])
        .map(|value| normalize_estado(&value))
        .unwrap_or_else(|| "activo".to_string());
    let ubicacion_legajo =
        take_import_value(row, headers, &mut used_columns, &["ubicaciondellegajo"]).unwrap_or_default();

    let mut payload = SaveLegajoPayload {
        numero_legajo: format!("{}-{:04}", sheet_key, numero_origen),
        apellidos_nombres: take_import_value(row, headers, &mut used_columns, &["apellidosynombres"])
            .unwrap_or_default(),
        dni: take_import_value(row, headers, &mut used_columns, &["dni"]).unwrap_or_default(),
        organo_unidad,
        cargo_puesto,
        regimen_laboral,
        fecha_nacimiento,
        fecha_vinculacion,
        remuneracion,
        celular,
        direccion,
        categoria_estudios,
        correo_electronico,
        perfil_mof,
        hijos_menores_de_edad,
        condicion,
        estado_legajo,
        ubicacion_legajo,
        observaciones: build_import_observaciones(sheet_name, excel_row, header_row, row, &used_columns),
        origen_registro: Some("importado".to_string()),
        ..SaveLegajoPayload::default()
    };

    if payload.numero_legajo.trim().is_empty() {
        payload.numero_legajo = format!("{}-{:04}", sheet_key, excel_row.saturating_sub(1));
    }

    payload
}

fn build_import_observaciones(
    sheet_name: &str,
    excel_row: usize,
    header_row: &[String],
    row: &[String],
    used_columns: &HashSet<usize>,
) -> String {
    let mut notes = vec![
        format!("Fuente Excel: {}", sheet_name),
        format!("Fila original: {}", excel_row),
    ];

    for (index, label) in header_row.iter().enumerate() {
        if used_columns.contains(&index) {
            continue;
        }

        let value = row.get(index).map(|cell| cell.trim()).unwrap_or("");
        if value.is_empty() || label.trim().is_empty() {
            continue;
        }

        notes.push(format!("{}: {}", label.trim(), value));
    }

    notes.join(" | ")
}

fn take_import_value(
    row: &[String],
    headers: &HashMap<String, usize>,
    used_columns: &mut HashSet<usize>,
    keys: &[&str],
) -> Option<String> {
    first_non_empty_with_index(row, headers, keys).map(|(index, value)| {
        used_columns.insert(index);
        value
    })
}

fn first_non_empty_with_index(
    row: &[String],
    headers: &HashMap<String, usize>,
    keys: &[&str],
) -> Option<(usize, String)> {
    for key in keys {
        let normalized = normalize_header(key);
        if let Some(index) = headers.get(&normalized) {
            if let Some(value) = row.get(*index) {
                let text = value.trim();
                if !text.is_empty() {
                    return Some((*index, text.to_string()));
                }
            }
        }
    }
    None
}

fn find_import_header_row(rows: &[Vec<String>]) -> Option<(usize, HashMap<String, usize>)> {
    for (index, row) in rows.iter().enumerate().take(12) {
        let headers = build_header_index(row);
        if looks_like_import_headers(&headers) {
            return Some((index, headers));
        }
    }
    None
}

fn build_header_index(row: &[String]) -> HashMap<String, usize> {
    let mut headers = HashMap::new();
    for (index, value) in row.iter().enumerate() {
        let key = normalize_header(value);
        if !key.is_empty() {
            headers.entry(key).or_insert(index);
        }
    }
    headers
}

fn looks_like_import_headers(headers: &HashMap<String, usize>) -> bool {
    let mut hits = 0;
    for key in [
        "apellidosynombres",
        "dni",
        "area",
        "fechadenacimiento",
        "fechadeingreso",
        "numerodelegajo",
        "correoelectronico",
        "categoriadeestudios",
        "perfilmof",
        "perfilesolicitadossegunelmof",
        "perfilesolicitadosegunelmof",
        "perfilesolicitadosegunelmof",
        "perfilsolicitadosegunelmof",
        "perfilsolicitadosegunelmof",
        "mof",
        "estadodellegajo",
        "ubicaciondellegajo",
        "condicion",
    ] {
        if headers.contains_key(key) {
            hits += 1;
        }
    }
    headers.contains_key("apellidosynombres") && hits >= 2
}

fn is_blank_row(row: &[String]) -> bool {
    row.iter().all(|cell| cell.trim().is_empty())
}

fn sheet_import_key(sheet_name: &str) -> String {
  let key = normalize_header(sheet_name);
  if key.is_empty() {
    "sheet".to_string()
  } else {
    key
  }
}

fn sheet_regimen_label(sheet_name: &str) -> String {
  let normalized = normalize_header(sheet_name);
  match normalized.as_str() {
    "276" | "dl276" => "DL 276".to_string(),
    "728serenos" | "dl728serenos" => "DL 728 - Serenos".to_string(),
    "728obreros" | "dl728obreros" => "DL 728 - Obreros".to_string(),
    "cas" => "CAS".to_string(),
    "casconfianza" | "dlcasconfianza" => "CAS - Confianza".to_string(),
    "casnecesidad" | "dlcasnecesidad" => "CAS - Necesidad".to_string(),
    _ => sheet_name.trim().to_string(),
  }
}

fn write_template(file_path: &Path) -> Result<()> {
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    for (index, (_, label)) in TEMPLATE_COLUMNS.iter().enumerate() {
        worksheet.write_string(0, index as u16, *label)?;
    }

    let sample = [
        "L-0001",
        "Ejemplo Perez Ana Lucia",
        "12345678",
        "Oficina de Recursos Humanos",
        "Especialista administrativo",
        "CAS",
        "1990-05-18",
        "2023-01-15",
        "2500",
        "987654321",
        "Jr. Ejemplo 123",
        "Universitaria completa",
        "ana.perez@municipio.gob.pe",
        "Perfil de ejemplo segun MOF",
        "2",
        "Contratado",
        "activo",
        "Archivo central - Anaquel 2",
        "Fila de ejemplo",
    ];

    for (index, value) in sample.iter().enumerate() {
        worksheet.write_string(1, index as u16, *value)?;
    }

    for column in 0..TEMPLATE_COLUMNS.len() {
        worksheet.set_column_width(column as u16, 24)?;
    }

    workbook.save(file_path)?;
    Ok(())
}

fn export_legajos_workbook(file_path: &Path, rows: &[LegajoSummary]) -> Result<()> {
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    for (index, (_, label)) in TEMPLATE_COLUMNS.iter().enumerate() {
        worksheet.write_string(0, index as u16, *label)?;
    }

    for (row_index, row) in rows.iter().enumerate() {
        let target = (row_index + 1) as u32;
        write_export_row(worksheet, target, row)?;
    }

    for column in 0..TEMPLATE_COLUMNS.len() {
        worksheet.set_column_width(column as u16, 24)?;
    }

    workbook.save(file_path)?;
    Ok(())
}

fn write_export_row(worksheet: &mut rust_xlsxwriter::Worksheet, target: u32, row: &LegajoSummary) -> Result<()> {
    let values = [
        row.numero_legajo.as_str(),
        row.apellidos_nombres.as_str(),
        row.dni.as_str(),
        row.organo_unidad.as_str(),
        row.cargo_puesto.as_str(),
        row.regimen_laboral.as_str(),
        row.fecha_nacimiento.as_str(),
        row.fecha_vinculacion.as_str(),
        row.remuneracion.as_str(),
        row.celular.as_str(),
        row.direccion.as_str(),
        row.categoria_estudios.as_str(),
        row.correo_electronico.as_str(),
        row.perfil_mof.as_str(),
        row.hijos_menores_de_edad.as_str(),
        row.condicion.as_str(),
        row.estado_legajo.as_str(),
        row.ubicacion_legajo.as_str(),
        row.observaciones.as_str(),
    ];

    for (column, value) in values.iter().enumerate() {
        worksheet.write_string(target, column as u16, *value)?;
    }

    Ok(())
}

fn export_legajos_pdf(file_path: &Path, rows: &[LegajoSummary], filters: &Filters) -> Result<()> {
    let html = build_report_html(rows, filters);
    let images = BTreeMap::new();
    let fonts = BTreeMap::new();
    let options = GeneratePdfOptions::default();
    let mut warnings = Vec::new();
    let document = PdfDocument::from_html(&html, &images, &fonts, &options, &mut warnings)
        .map_err(|e| anyhow!(e))?;
    let bytes = document.save(&PdfSaveOptions::default(), &mut warnings);
    fs::write(file_path, bytes)?;
    Ok(())
}

fn build_report_html(rows: &[LegajoSummary], filters: &Filters) -> String {
    let generated_at = Utc::now().format("%d/%m/%Y %H:%M").to_string();
    let filters_text = build_filters_label(filters);
    let table_headers = TEMPLATE_COLUMNS
        .iter()
        .map(|(_, label)| format!("<th>{}</th>", escape_html(label)))
        .collect::<Vec<_>>()
        .join("");
    let table_rows = rows
        .iter()
        .map(|row| {
            format!(
                "<tr>{}</tr>",
                [
                    escape_html(&row.numero_legajo),
                    escape_html(&row.apellidos_nombres),
                    escape_html(&row.dni),
                    escape_html(&row.organo_unidad),
                    escape_html(&row.cargo_puesto),
                    escape_html(&row.regimen_laboral),
                    escape_html(&row.fecha_nacimiento),
                    escape_html(&row.fecha_vinculacion),
                    escape_html(&row.remuneracion),
                    escape_html(&row.celular),
                    escape_html(&row.direccion),
                    escape_html(&row.categoria_estudios),
                    escape_html(&row.correo_electronico),
                    escape_html(&row.perfil_mof),
                    escape_html(&row.hijos_menores_de_edad),
                    escape_html(&row.condicion),
                    escape_html(&row.estado_legajo),
                    escape_html(&row.ubicacion_legajo),
                    escape_html(&row.observaciones),
                ]
                .into_iter()
                .map(|value| format!("<td>{}</td>", value))
                .collect::<Vec<_>>()
                .join("")
            )
        })
        .collect::<Vec<_>>()
        .join("");

    format!(
        r#"<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <style>
      body {{ font-family: Arial, sans-serif; color: #152033; margin: 28px; }}
      h1 {{ margin: 0 0 8px; font-size: 22px; }}
      .subhead {{ margin-bottom: 18px; color: #4f5d75; }}
      .meta {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }}
      .meta-card {{ border: 1px solid #d4dde8; border-radius: 12px; padding: 12px 14px; background: #f8fbff; }}
      table {{ width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8px; }}
      th, td {{ border: 1px solid #d9e2ec; padding: 5px; text-align: left; vertical-align: top; word-break: break-word; }}
      th {{ background: #173a63; color: #ffffff; font-weight: 600; }}
      tr:nth-child(even) td {{ background: #f7fafc; }}
    </style>
  </head>
  <body>
    <h1>Relacion digital de legajos</h1>
    <div class="subhead">Control local de legajos activos y pasivos</div>
    <div class="meta">
      <div class="meta-card"><strong>Generado:</strong><br />{}</div>
      <div class="meta-card"><strong>Filtros:</strong><br />{}</div>
      <div class="meta-card"><strong>Total:</strong><br />{} registros</div>
    </div>
    <table>
      <thead><tr>{}</tr></thead>
      <tbody>{}</tbody>
    </table>
  </body>
</html>"#,
        escape_html(&generated_at),
        escape_html(&filters_text),
        rows.len(),
        table_headers,
        table_rows
    )
}

fn build_filters_label(filters: &Filters) -> String {
    let mut parts = Vec::new();
    if !filters.search.trim().is_empty() {
        parts.push(format!("Busqueda: {}", filters.search.trim()));
    }
    if !filters.estado.trim().is_empty() && filters.estado.trim() != "todos" {
        parts.push(format!("Estado: {}", filters.estado.trim()));
    }
    if !filters.organo_unidad.trim().is_empty() {
        parts.push(format!("Unidad: {}", filters.organo_unidad.trim()));
    }
    if !filters.regimen_laboral.trim().is_empty() {
        parts.push(format!("Tipo de contrato: {}", filters.regimen_laboral.trim()));
    }
    if parts.is_empty() {
        "Todos los registros".to_string()
    } else {
        parts.join(" | ")
    }
}

fn create_backup_internal(connection: &Connection, state: &AppState) -> Result<PathBuf> {
    let _ = connection;
    let stamp = Utc::now()
        .to_rfc3339_opts(SecondsFormat::Secs, true)
        .replace(':', "-");
    let target_dir = state.backups_dir.join(format!("respaldo-{}", stamp));
    let attachments_target = target_dir.join("adjuntos");
    fs::create_dir_all(&attachments_target)?;
    fs::copy(&state.database_path, target_dir.join("legajos.sqlite"))
        .with_context(|| "No se pudo copiar la base de datos al respaldo.")?;

    if state.attachments_dir.exists() {
        for entry in fs::read_dir(&state.attachments_dir)? {
            let entry = entry?;
            let source = entry.path();
            if source.is_file() {
                let destination = attachments_target.join(entry.file_name());
                fs::copy(source, destination)?;
            }
        }
    }

    Ok(target_dir)
}

fn get_dashboard_stats(connection: &Connection) -> Result<DashboardStats, String> {
    let total = query_count(connection, "SELECT COUNT(*) FROM legajos")?;
    let activos = query_count(
        connection,
        "SELECT COUNT(*) FROM legajos WHERE estado_legajo = 'activo'",
    )?;
    let pasivos = query_count(
        connection,
        "SELECT COUNT(*) FROM legajos WHERE estado_legajo = 'pasivo'",
    )?;
    let sin_ubicacion = query_count(
        connection,
        "SELECT COUNT(*) FROM legajos WHERE TRIM(ubicacion_legajo) = ''",
    )?;
    let adjuntos = query_count(connection, "SELECT COUNT(*) FROM adjuntos")?;

    let mut statement = connection
        .prepare(
            r#"
        SELECT movimientos.*, legajos.numero_legajo, legajos.apellidos_nombres
        FROM movimientos
        INNER JOIN legajos ON legajos.id = movimientos.legajo_id
        ORDER BY movimientos.fecha DESC
        LIMIT 8
      "#,
        )
        .map_err(error_message)?;
    let recientes = statement
        .query_map([], |row| {
            Ok(Movimiento {
                id: row.get("id")?,
                legajo_id: row.get("legajo_id")?,
                tipo_movimiento: row.get("tipo_movimiento")?,
                detalle: row.get("detalle")?,
                fecha: row.get("fecha")?,
                numero_legajo: Some(row.get("numero_legajo")?),
                apellidos_nombres: Some(row.get("apellidos_nombres")?),
            })
        })
        .map_err(error_message)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(error_message)?;

    Ok(DashboardStats {
        total,
        activos,
        pasivos,
        sin_ubicacion,
        adjuntos,
        recientes,
    })
}

fn query_count(connection: &Connection, sql: &str) -> Result<i64, String> {
    connection
        .query_row(sql, [], |row| row.get(0))
        .map_err(error_message)
}

fn sanitize_legajo_payload(mut payload: SaveLegajoPayload) -> Result<SaveLegajoPayload> {
    let imported = matches!(payload.origen_registro.as_deref(), Some("importado"));
    payload.numero_legajo = payload.numero_legajo.trim().to_string();
    payload.apellidos_nombres = payload.apellidos_nombres.trim().to_string();
    payload.dni = payload.dni.trim().to_string();
    payload.organo_unidad = payload.organo_unidad.trim().to_string();
    payload.cargo_puesto = payload.cargo_puesto.trim().to_string();
    if payload.cargo_puesto.is_empty() {
        payload.cargo_puesto = payload.organo_unidad.clone();
    }
    payload.regimen_laboral = normalize_contract_type(&payload.regimen_laboral);
    payload.fecha_nacimiento = normalize_date_input(&payload.fecha_nacimiento);
    payload.fecha_vinculacion = normalize_date_input(&payload.fecha_vinculacion);
    payload.remuneracion = payload.remuneracion.trim().to_string();
    payload.celular = payload.celular.trim().to_string();
    payload.direccion = payload.direccion.trim().to_string();
    payload.categoria_estudios = payload.categoria_estudios.trim().to_string();
    payload.correo_electronico = payload.correo_electronico.trim().to_string();
    payload.perfil_mof = payload.perfil_mof.trim().to_string();
    payload.hijos_menores_de_edad = payload.hijos_menores_de_edad.trim().to_string();
    payload.condicion = payload.condicion.trim().to_string();
    payload.estado_legajo = normalize_estado(&payload.estado_legajo);
    payload.ubicacion_legajo = payload.ubicacion_legajo.trim().to_string();
    payload.observaciones = payload.observaciones.trim().to_string();
    payload.origen_registro = Some(
        match payload
            .origen_registro
            .unwrap_or_else(|| "manual".to_string())
            .as_str()
        {
            "importado" => "importado".to_string(),
            _ => "manual".to_string(),
        },
    );

    for field in REQUIRED_FIELDS {
        let value = match field {
            "numero_legajo" => &payload.numero_legajo,
            "apellidos_nombres" => &payload.apellidos_nombres,
            "dni" => &payload.dni,
            "organo_unidad" => &payload.organo_unidad,
            "cargo_puesto" => &payload.cargo_puesto,
            "regimen_laboral" => &payload.regimen_laboral,
            "fecha_vinculacion" => &payload.fecha_vinculacion,
            "estado_legajo" => &payload.estado_legajo,
            _ => &payload.ubicacion_legajo,
        };
        if value.trim().is_empty() {
            if imported && matches!(field, "fecha_vinculacion" | "ubicacion_legajo") {
                continue;
            }
            return Err(anyhow!("El campo {} es obligatorio.", field));
        }
    }

    let dni_digits = payload
        .dni
        .chars()
        .filter(|char| !char.is_whitespace())
        .collect::<String>();
    if dni_digits.len() < 8
        || dni_digits.len() > 15
        || !dni_digits.chars().all(|char| char.is_ascii_digit())
    {
        return Err(anyhow!("El DNI debe contener entre 8 y 15 digitos."));
    }
    payload.dni = dni_digits;

    Ok(payload)
}

fn normalize_date_input(value: &str) -> String {
    let text = value.trim();
    if text.is_empty() {
        return String::new();
    }

    if let Ok(serial) = text.parse::<i64>() {
        if let Some(date) = excel_serial_to_date(serial) {
            return date;
        }
    }

    if let Ok(serial) = text.parse::<f64>() {
        if let Some(date) = excel_serial_to_date(serial.trunc() as i64) {
            return date;
        }
    }

    if text.len() == 10 && text.chars().nth(4) == Some('-') && text.chars().nth(7) == Some('-') {
        return text.to_string();
    }

    if text.len() == 10 && text.chars().nth(2) == Some('/') && text.chars().nth(5) == Some('/') {
        let day = &text[0..2];
        let month = &text[3..5];
        let year = &text[6..10];
        return format!("{}-{}-{}", year, month, day);
    }

    text.to_string()
}

fn excel_serial_to_date(serial: i64) -> Option<String> {
    if serial < 1 {
        return None;
    }

    let base = NaiveDate::from_ymd_opt(1899, 12, 31)?;
    let adjusted = if serial >= 60 { serial - 1 } else { serial };
    let date = base.checked_add_signed(Duration::days(adjusted))?;
    Some(date.format("%Y-%m-%d").to_string())
}

fn normalize_estado(value: &str) -> String {
    if normalize_header(value).contains("pasivo") {
        "pasivo".to_string()
    } else {
        "activo".to_string()
    }
}

fn normalize_contract_type(value: &str) -> String {
    let text = value.trim();
    if text.is_empty() {
        return String::new();
    }

    let normalized = normalize_header(text);
    match normalized.as_str() {
        "276" | "dl276" => "DL 276".to_string(),
        "728serenos" | "dl728serenos" | "serenos" => "DL 728 - Serenos".to_string(),
        "728obreros" | "dl728obreros" | "obreros" => "DL 728 - Obreros".to_string(),
        "cas" => "CAS".to_string(),
        "casconfianza" | "dlcasconfianza" | "confianza" => "CAS - Confianza".to_string(),
        "casnecesidad" | "dlcasnecesidad" | "necesidad" => "CAS - Necesidad".to_string(),
        _ => text.to_string(),
    }
}

fn build_legajo_number(
    connection: &Connection,
    contract_type: &str,
    current_value: &str,
) -> Result<String> {
    let normalized_contract = normalize_contract_type(contract_type);
    let prefix = contract_prefix(&normalized_contract);
    let current = current_value.trim();

    if !current.is_empty() && current.starts_with(&prefix) {
        return Ok(current.to_string());
    }

    let mut statement = connection.prepare("SELECT numero_legajo FROM legajos WHERE regimen_laboral = ?")?;
    let numbers = statement.query_map(params![&normalized_contract], |row| row.get::<_, String>(0))?;

    let mut max_sequence = 0_i64;
    for item in numbers {
        let value = item?;
        if let Some(sequence) = parse_legajo_sequence(&value) {
            max_sequence = max_sequence.max(sequence);
        }
    }

    Ok(format!("{}-{:04}", prefix, max_sequence + 1))
}

fn contract_prefix(contract_type: &str) -> String {
    match normalize_contract_type(contract_type).as_str() {
        "DL 276" => "DL276".to_string(),
        "DL 728 - Serenos" => "DL728S".to_string(),
        "DL 728 - Obreros" => "DL728O".to_string(),
        "CAS" => "CAS".to_string(),
        "CAS - Confianza" => "CASC".to_string(),
        "CAS - Necesidad" => "CASN".to_string(),
        other => normalize_header(other).to_uppercase(),
    }
}

fn parse_legajo_sequence(value: &str) -> Option<i64> {
    let digits = value
        .chars()
        .rev()
        .take_while(|char| char.is_ascii_digit())
        .collect::<String>()
        .chars()
        .rev()
        .collect::<String>();

    if digits.is_empty() {
        value.parse::<i64>().ok()
    } else {
        digits.parse::<i64>().ok()
    }
}

fn normalize_header(value: &str) -> String {
    value
        .trim()
        .chars()
        .flat_map(replace_accented_char)
        .collect::<String>()
        .to_lowercase()
        .chars()
        .filter(|char| char.is_ascii_alphanumeric())
        .collect()
}

fn replace_accented_char(input: char) -> Vec<char> {
    match input {
        'a' | 'A' | 'á' | 'Á' | 'à' | 'À' | 'ä' | 'Ä' => vec!['a'],
        'e' | 'E' | 'é' | 'É' | 'è' | 'È' | 'ë' | 'Ë' => vec!['e'],
        'i' | 'I' | 'í' | 'Í' | 'ì' | 'Ì' | 'ï' | 'Ï' => vec!['i'],
        'o' | 'O' | 'ó' | 'Ó' | 'ò' | 'Ò' | 'ö' | 'Ö' => vec!['o'],
        'u' | 'U' | 'ú' | 'Ú' | 'ù' | 'Ù' | 'ü' | 'Ü' => vec!['u'],
        'ñ' | 'Ñ' => vec!['n'],
        other => vec![other],
    }
}

fn build_change_detail(previous: &LegajoRecord, next: &SaveLegajoPayload) -> String {
    let pairs = [
        (
            "Numero de legajo",
            previous.numero_legajo.as_str(),
            next.numero_legajo.as_str(),
        ),
        (
            "Apellidos y nombres",
            previous.apellidos_nombres.as_str(),
            next.apellidos_nombres.as_str(),
        ),
        (
            "Documento de identidad",
            previous.dni.as_str(),
            next.dni.as_str(),
        ),
        (
            "Organo o unidad organica",
            previous.organo_unidad.as_str(),
            next.organo_unidad.as_str(),
        ),
        (
            "Cargo o puesto",
            previous.cargo_puesto.as_str(),
            next.cargo_puesto.as_str(),
        ),
        (
            "Tipo de contrato",
            previous.regimen_laboral.as_str(),
            next.regimen_laboral.as_str(),
        ),
        (
            "Fecha de nacimiento",
            previous.fecha_nacimiento.as_str(),
            next.fecha_nacimiento.as_str(),
        ),
        (
            "Fecha de vinculacion",
            previous.fecha_vinculacion.as_str(),
            next.fecha_vinculacion.as_str(),
        ),
        (
            "Remuneracion",
            previous.remuneracion.as_str(),
            next.remuneracion.as_str(),
        ),
        ("Celular", previous.celular.as_str(), next.celular.as_str()),
        ("Direccion", previous.direccion.as_str(), next.direccion.as_str()),
        (
            "Categoria de estudios",
            previous.categoria_estudios.as_str(),
            next.categoria_estudios.as_str(),
        ),
        (
            "Correo electronico",
            previous.correo_electronico.as_str(),
            next.correo_electronico.as_str(),
        ),
        ("Perfil MOF", previous.perfil_mof.as_str(), next.perfil_mof.as_str()),
        (
            "Hijos menores de edad",
            previous.hijos_menores_de_edad.as_str(),
            next.hijos_menores_de_edad.as_str(),
        ),
        ("Condicion", previous.condicion.as_str(), next.condicion.as_str()),
        (
            "Estado del legajo",
            previous.estado_legajo.as_str(),
            next.estado_legajo.as_str(),
        ),
        (
            "Ubicacion del legajo",
            previous.ubicacion_legajo.as_str(),
            next.ubicacion_legajo.as_str(),
        ),
        (
            "Observaciones",
            previous.observaciones.as_str(),
            next.observaciones.as_str(),
        ),
    ];

    let changes = pairs
        .iter()
        .filter_map(|(label, previous_value, next_value)| {
            if previous_value != next_value {
                Some(format!(
                    r#"{}: "{}" -> "{}""#,
                    label, previous_value, next_value
                ))
            } else {
                None
            }
        })
        .collect::<Vec<_>>();

    if changes.is_empty() {
        "Actualizacion general del legajo.".to_string()
    } else {
        changes.join(" | ")
    }
}

fn record_movement(
    connection: &Connection,
    legajo_id: i64,
    kind: &str,
    detail: &str,
) -> Result<()> {
    connection.execute(
        "INSERT INTO movimientos (legajo_id, tipo_movimiento, detalle, fecha) VALUES (?, ?, ?, ?)",
        params![legajo_id, kind, detail, now_iso()],
    )?;
    Ok(())
}

fn now_iso() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true)
}

fn sanitize_file_component(value: &str) -> String {
    let filtered = value
        .chars()
        .map(|char| {
            if char.is_ascii_alphanumeric() || char == '-' || char == '_' {
                char
            } else {
                '_'
            }
        })
        .collect::<String>();
    filtered.trim_matches('_').to_string()
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn error_message<E: std::fmt::Display>(error: E) -> String {
    error.to_string()
}
