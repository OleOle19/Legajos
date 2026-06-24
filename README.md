# Legajo RH

Aplicacion de escritorio local para administrar legajos activos y pasivos en una sola PC de Recursos Humanos.

## Alcance actual

- Registro y edicion de legajos.
- Busqueda y filtros por estado, unidad y tipo de contrato.
- Historial de movimientos.
- Adjuntos PDF e imagen copiados al almacenamiento interno de la app.
- Importacion desde plantilla Excel o libro multipestana de RR.HH.
- Exportacion a Excel y PDF.
- Respaldo local de base de datos y adjuntos.

## Stack

- `Tauri 2 + Rust` para shell desktop liviano en Windows.
- `rusqlite` para base de datos local SQLite.
- `calamine` y `rust_xlsxwriter` para importacion y exportacion Excel.
- `printpdf` para exportacion PDF.
- `HTML/CSS/JS` con interfaz moderna y frontend estatico.

## Puesta en marcha

```bash
npm.cmd install
npm.cmd start
```

## Verificacion rapida

```bash
npm.cmd run check
```

## Flujo de uso

1. Crear legajos manualmente o descargar la plantilla Excel nueva.
2. Importar la plantilla completada o el libro de RR.HH. con varias hojas y columnas comunes entre hojas.
3. Consultar el padron y abrir la ficha detallada.
4. Adjuntar PDFs o imagenes escaneadas.
5. Exportar la relacion digital a Excel o PDF.
6. Crear respaldos locales desde la propia app.

## Almacenamiento local

La app crea una carpeta de trabajo local con:

- `legajos.sqlite`
- carpeta `adjuntos`
- carpeta `respaldos`

Esto evita depender de rutas manuales para los documentos digitalizados.
