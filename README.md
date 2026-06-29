# Sistema de Gestión de Trámites

Aplicación Node.js con PostgreSQL 15 para consultar trámites desde `public.tramites` y `public.tramites_detalle`.

## Esquema Actual

### `public.tramites`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_tramite | integer | Identificador del trámite |
| cite_tramite | varchar | CITE del trámite |
| estado_tramite | varchar | Estado operativo del trámite |
| estado_reg | varchar | Estado de registro |
| observacion | varchar | Observaciones |
| num_resolucion | integer | Número de resolución |
| nombre_tramite | varchar | Nombre del trámite |
| nombre_completo2 | text | Nombre completo |
| tipo_persona | varchar | Tipo de persona |

### `public.tramites_detalle`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| cite_tramite | varchar | CITE relacionado |
| descripcion | varchar | Descripción del movimiento |
| estado_reg | varchar | Estado del registro |
| estado_tramite | varchar | Estado del trámite |
| id_tramite | integer | FK hacia `public.tramites` |
| cargo | varchar | Cargo asociado |
| email_empresa | varchar | Correo asociado |

## Configuración

Instala dependencias con `npm install`, configura `.env` y ejecuta `npm start`.

Variables soportadas:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_password
DB_NAME=tramites_db
DB_SCHEMA=public
PORT=3000
```

## API

Rutas disponibles:

- `GET /api/tramites`
- `GET /api/tramites/:id`
- `DELETE /api/tramites/:id`
- `GET /api/estadisticas`
- `GET /api/funcionarios`

`GET /api/tramites` acepta `search`, `estado` y `funcionario` como query params. La búsqueda trabaja contra los campos actuales de ambas tablas.

## Notas

- El frontend sigue consumiendo las mismas rutas.
- El backend ya no contiene referencias a tablas antiguas ni a columnas obsoletas.
