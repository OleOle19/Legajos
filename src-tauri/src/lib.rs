use anyhow::{anyhow, Context, Result};
use calamine::{open_workbook_auto, Reader};
use chrono::{Duration, NaiveDate, SecondsFormat, Utc};
use printpdf::{GeneratePdfOptions, PdfDocument, PdfSaveOptions};
use rfd::FileDialog;
use rusqlite::{params, params_from_iter, Connection, OptionalExtension, Row};
use rust_xlsxwriter::Workbook;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap};
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

const TEMPLATE_COLUMNS: [(&str, &str); 10] = [
    ("numero_legajo", "Numero de legajo"),
    ("apellidos_nombres", "Apellidos y nombres"),
    ("dni", "Numero de Documento de Identidad"),
    ("organo_unidad", "Organo o unidad organica"),
    ("cargo_puesto", "Nombre del cargo estructural y/o puesto"),
    ("regimen_laboral", "Regimen laboral"),
    ("fecha_vinculacion", "Fecha de vinculacion"),
    ("estado_legajo", "Estado del legajo"),
    ("ubicacion_legajo", "Ubicacion del legajo"),
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
    fecha_vinculacion: String,
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
    fecha_vinculacion: String,
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
    fecha_vinculacion: String,
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
    fecha_vinculacion: String,
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
      fecha_vinculacion TEXT NOT NULL,
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
    "#,
    )?;
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
      "(numero_legajo LIKE ? OR apellidos_nombres LIKE ? OR dni LIKE ? OR organo_unidad LIKE ? OR cargo_puesto LIKE ? OR ubicacion_legajo LIKE ?)".to_string(),
    );
        for _ in 0..6 {
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
        fecha_vinculacion: row.get("fecha_vinculacion")?,
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
        fecha_vinculacion: row.get("fecha_vinculacion")?,
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
        fecha_vinculacion: record.fecha_vinculacion,
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
    let sanitized = sanitize_legajo_payload(payload)?;
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
          fecha_vinculacion = ?,
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
                &sanitized.fecha_vinculacion,
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
          regimen_laboral, fecha_vinculacion, estado_legajo, ubicacion_legajo,
          observaciones, origen_registro, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      "#,
            params![
                &sanitized.numero_legajo,
                &sanitized.apellidos_nombres,
                &sanitized.dni,
                &sanitized.organo_unidad,
                &sanitized.cargo_puesto,
                &sanitized.regimen_laboral,
                &sanitized.fecha_vinculacion,
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
    row: &[String],
) -> SaveLegajoPayload {
    let numero_origen = first_non_empty(row, headers, &["numerodelegajo", "n"])
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or_else(|| import_sequence.max(1));
    let area = first_non_empty(row, headers, &["area"]);
    let organo_unidad = first_non_empty(row, headers, &["organoounidadorganica", "organoounidad"])
        .or_else(|| area.clone())
        .unwrap_or_else(|| sheet_name.trim().to_string());
    let cargo_puesto = first_non_empty(
        row,
        headers,
        &[
            "nombredelcargo",
            "nombredelcargoestructuralyopuesto",
            "cargoestructuralyopuesto",
            "cargoestructuralypuesto",
        ],
    )
    .or_else(|| area.clone())
    .or_else(|| first_non_empty(row, headers, &["perfilesolicitadossegunelmof"]))
    .unwrap_or_else(|| organo_unidad.clone());
  let regimen_laboral = sheet_regimen_label(sheet_name);
    let fecha_vinculacion =
        first_non_empty(row, headers, &["fechadeingreso", "fechadevinculacion"]);
    let estado_legajo = first_non_empty(row, headers, &["estadodellegajo", "condicion"])
        .map(|value| normalize_estado(&value))
        .unwrap_or_else(|| "activo".to_string());
    let ubicacion_legajo =
        first_non_empty(row, headers, &["ubicaciondellegajo"]).unwrap_or_default();

    let mut payload = SaveLegajoPayload {
        numero_legajo: format!("{}-{:04}", sheet_key, numero_origen),
        apellidos_nombres: first_non_empty(row, headers, &["apellidosynombres"])
            .unwrap_or_default(),
        dni: first_non_empty(row, headers, &["dni"]).unwrap_or_default(),
        organo_unidad,
        cargo_puesto,
        regimen_laboral,
        fecha_vinculacion: fecha_vinculacion
            .as_deref()
            .map(normalize_date_input)
            .unwrap_or_default(),
        estado_legajo,
        ubicacion_legajo,
        observaciones: build_import_observaciones(sheet_name, excel_row, headers, row),
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
    headers: &HashMap<String, usize>,
    row: &[String],
) -> String {
    let mut notes = vec![
        format!("Fuente Excel: {}", sheet_name),
        format!("Fila original: {}", excel_row),
    ];

    push_import_note(
        &mut notes,
        "Fecha de nacimiento",
        first_non_empty(row, headers, &["fechadenacimiento"]),
        true,
    );
    push_import_note(
        &mut notes,
        "Fecha de ingreso",
        first_non_empty(row, headers, &["fechadeingreso"]),
        true,
    );
    push_import_note(
        &mut notes,
        "Celular",
        first_non_empty(row, headers, &["celular"]),
        false,
    );
    push_import_note(
        &mut notes,
        "Direccion",
        first_non_empty(row, headers, &["direccion"]),
        false,
    );
    push_import_note(
        &mut notes,
        "Categoria de estudios",
        first_non_empty(row, headers, &["categoriadeestudios"]),
        false,
    );
    push_import_note(
        &mut notes,
        "Correo electronico",
        first_non_empty(row, headers, &["correoelectronico"]),
        false,
    );
    push_import_note(
        &mut notes,
        "Perfil MOF",
        first_non_empty(row, headers, &["perfilesolicitadossegunelmof"]),
        false,
    );
    push_import_note(
        &mut notes,
        "Remuneracion",
        first_non_empty(row, headers, &["remuneracion"]),
        false,
    );
    push_import_note(
        &mut notes,
        "Hijos menores",
        first_non_empty(row, headers, &["hijosmenoresdeedad"]),
        false,
    );
    push_import_note(
        &mut notes,
        "Condicion",
        first_non_empty(row, headers, &["condicion"]),
        false,
    );

    notes.join(" | ")
}

fn push_import_note(notes: &mut Vec<String>, label: &str, value: Option<String>, date_like: bool) {
    if let Some(value) = value
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty())
    {
        let rendered = if date_like {
            normalize_date_input(&value)
        } else {
            value
        };
        notes.push(format!("{}: {}", label, rendered));
    }
}

fn first_non_empty(
    row: &[String],
    headers: &HashMap<String, usize>,
    keys: &[&str],
) -> Option<String> {
    for key in keys {
        let normalized = normalize_header(key);
        if let Some(index) = headers.get(&normalized) {
            if let Some(value) = row.get(*index) {
                let text = value.trim();
                if !text.is_empty() {
                    return Some(text.to_string());
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
        "perfilesolicitadossegunelmof",
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
        "2023-01-15",
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
        worksheet.write_string(target, 0, &row.numero_legajo)?;
        worksheet.write_string(target, 1, &row.apellidos_nombres)?;
        worksheet.write_string(target, 2, &row.dni)?;
        worksheet.write_string(target, 3, &row.organo_unidad)?;
        worksheet.write_string(target, 4, &row.cargo_puesto)?;
        worksheet.write_string(target, 5, &row.regimen_laboral)?;
        worksheet.write_string(target, 6, &row.fecha_vinculacion)?;
        worksheet.write_string(target, 7, &row.estado_legajo)?;
        worksheet.write_string(target, 8, &row.ubicacion_legajo)?;
        worksheet.write_string(target, 9, &row.observaciones)?;
    }

    for column in 0..TEMPLATE_COLUMNS.len() {
        worksheet.set_column_width(column as u16, 24)?;
    }

    workbook.save(file_path)?;
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
        "<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
        escape_html(&row.numero_legajo),
        escape_html(&row.apellidos_nombres),
        escape_html(&row.dni),
        escape_html(&row.organo_unidad),
        escape_html(&row.cargo_puesto),
        escape_html(&row.regimen_laboral),
        escape_html(&row.fecha_vinculacion),
        escape_html(&row.estado_legajo),
        escape_html(&row.ubicacion_legajo),
        escape_html(&row.observaciones),
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
      table {{ width: 100%; border-collapse: collapse; font-size: 9px; }}
      th, td {{ border: 1px solid #d9e2ec; padding: 6px; text-align: left; vertical-align: top; }}
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
        parts.push(format!("Regimen: {}", filters.regimen_laboral.trim()));
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
    payload.regimen_laboral = payload.regimen_laboral.trim().to_string();
    payload.fecha_vinculacion = normalize_date_input(&payload.fecha_vinculacion);
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
            "Regimen laboral",
            previous.regimen_laboral.as_str(),
            next.regimen_laboral.as_str(),
        ),
        (
            "Fecha de vinculacion",
            previous.fecha_vinculacion.as_str(),
            next.fecha_vinculacion.as_str(),
        ),
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
