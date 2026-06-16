# Sistema de Gestión de Trámites

Sistema web moderno para gestionar trámites usando las tablas `public.tramites` y `public.tramites_detalle` en PostgreSQL.

## Estructura de Base de Datos

### Tabla Principal: `public.tramites`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_tramite | SERIAL | ID único del trámite (PK) |
| id_tipo_tramite | INTEGER | ID del tipo de trámite |
| cite_tramite | VARCHAR | CITE del trámite |
| id_documento | INTEGER | ID del documento asociado |
| estado_tramite | VARCHAR | Estado: inicio, proceso, finalizado |
| id_funcionario | INTEGER | ID del funcionario asignado |
| ubicacion | VARCHAR | Ubicación del trámite |
| fojas | INTEGER | Número de fojas |
| num_resolucion | INTEGER | Número de resolución |
| fecha_resolucion | DATE | Fecha de resolución |
| observacion | VARCHAR(300) | Observaciones del trámite |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Fecha de actualización |

### Tabla Detalle: `public.tramites_detalle`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| cite_tramite | VARCHAR | CITE del trámite |
| descripcion | VARCHAR | Descripción del movimiento |
| estado_reg | VARCHAR | Estado del registro (activo/inactivo) |
| estado_tramite | VARCHAR | Estado del trámite |
| id_tramite | INTEGER | ID del trámite (FK) |
| cargo | VARCHAR | Cargo del funcionario |
| email_empresa | VARCHAR | Email de la empresa/funcionario |

## 🚀 Instalación y Configuración

### Paso 1: Instalar Dependencias

```bash
npm install
```

### Paso 2: Configurar PostgreSQL

Edita el archivo `.env` con tus credenciales:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_password
DB_NAME=tramites_db
DB_SCHEMA=public
PORT=3000
```

### Paso 3: Iniciar el Servidor

```bash
npm start
```

### Paso 4: Abrir la Aplicación

```
http://localhost:3000
```

## 📚 API Endpoints

### Trámites

- `GET /api/tramites` - Obtener todos los trámites
  - Query params: `?estado=inicio&funcionario=1&search=CITE-001`
- `GET /api/tramites/:id` - Obtener un trámite con sus detalles
- `POST /api/tramites` - Crear un nuevo trámite
- `PUT /api/tramites/:id` - Actualizar un trámite
- `DELETE /api/tramites/:id` - Eliminar un trámite

### Detalles

- `POST /api/tramites/:id/detalles` - Agregar un detalle a un trámite

### Estadísticas

- `GET /api/estadisticas` - Obtener contadores por estado
- `GET /api/funcionarios` - Obtener lista de funcionarios únicos

## 🔍 Búsqueda

El sistema permite buscar por:
- ✅ **ID del trámite** - Ej: "1", "25"
- ✅ **CITE** - Ej: "CITE-2025-001"
- ✅ **Observación** - Cualquier texto en observaciones
- ✅ **Ubicación** - Ubicación del trámite

## 📝 Ejemplo de Uso

### Crear un Trámite

```json
POST /api/tramites
{
  "id_tipo_tramite": 1,
  "cite_tramite": "CITE-2025-001",
  "estado_tramite": "inicio",
  "id_funcionario": 5,
  "ubicacion": "Oficina Central",
  "fojas": 10,
  "observacion": "Trámite urgente"
}
```

### Agregar un Detalle

```json
POST /api/tramites/1/detalles
{
  "id_funcionario": 5,
  "num_informe": "INF-001",
  "estado_tramite": "proceso",
  "descripcion": "Revisión inicial completada",
  "id_tipo_tramite": 1
}
```

## 🎨 Características

- ✅ Interfaz moderna con tema oscuro
- ✅ Búsqueda en tiempo real
- ✅ Filtros por estado
- ✅ Estadísticas en tiempo real
- ✅ CRUD completo de trámites
- ✅ Diseño responsive
- ✅ Persistencia en PostgreSQL (schema public)
- ✅ Sincronización automática con triggers entre tramites y tramites_detalle
- ✅ Búsqueda por ID y CITE
- ✅ API REST completa
- ✅ Relación entre trámites y detalles

## 🔒 Seguridad

- El archivo `.env` está en `.gitignore`
- Usa variables de entorno para credenciales
- Validación de datos en el backend
- Transacciones para operaciones críticas

## 📄 Licencia

ISC
