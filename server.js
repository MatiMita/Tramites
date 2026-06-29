const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { pool, initializeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const TRAMITE_SEARCHABLE_COLUMNS = [
    't.id_tramite::text',
    't.cite_tramite',
    't.nombre_tramite',
    't.nombre_completo2',
    't.tipo_persona',
    't.estado_tramite',
    't.estado_reg',
    't.observacion'
];

const DETALLE_SEARCHABLE_COLUMNS = [
    'd.cite_tramite',
    'd.descripcion',
    'd.estado_tramite',
    'd.estado_reg',
    'd.cargo',
    'd.email_empresa'
];

function normalizeSearchQuery(search) {
    return search.trim();
}

function buildSearchWhereClause() {
    const tramiteMatches = TRAMITE_SEARCHABLE_COLUMNS.map((column) => `COALESCE(${column}, '') ILIKE $1`).join(' OR ');
    const detalleMatches = DETALLE_SEARCHABLE_COLUMNS.map((column) => `COALESCE(${column}, '') ILIKE $1`).join(' OR ');

    return `(
        ${tramiteMatches}
        OR EXISTS (
            SELECT 1
            FROM public.tramites_detalle d
            WHERE d.id_tramite = t.id_tramite
              AND (${detalleMatches})
        )
    )`;
}

async function fetchTramiteConDetalles(id) {
    const tramiteResult = await pool.query(
        `SELECT
            t.id_tramite,
            t.cite_tramite,
            t.nombre_tramite,
            t.nombre_completo2,
            t.tipo_persona,
            t.estado_tramite,
            t.estado_reg,
            t.observacion,
            t.num_resolucion
         FROM public.tramites t
         WHERE t.id_tramite = $1`,
        [id]
    );

    if (tramiteResult.rows.length === 0) {
        return null;
    }

    const detallesResult = await pool.query(
        `SELECT
            d.id_tramite,
            d.cite_tramite,
            d.descripcion,
            d.estado_reg,
            d.estado_tramite,
            d.cargo,
            d.email_empresa
         FROM public.tramites_detalle d
         WHERE d.id_tramite = $1
         ORDER BY d.id_tramite DESC, d.cite_tramite ASC, d.descripcion ASC`,
        [id]
    );

    return {
        tramite: tramiteResult.rows[0],
        detalles: detallesResult.rows
    };
}

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // Servir archivos estáticos (HTML, CSS, JS)

// ===================================
// RUTAS DE LA API
// ===================================

// GET - Obtener todos los trámites (con filtros opcionales)
app.get('/api/tramites', async (req, res) => {
    try {
        const { estado, funcionario, search } = req.query;

        const conditions = [];
        const values = [];

        if (search && normalizeSearchQuery(search)) {
            values.push(`%${normalizeSearchQuery(search)}%`);
            conditions.push(`(${buildSearchWhereClause()})`);
        }

        if (estado && estado !== 'all') {
            values.push(estado);
            conditions.push(`t.estado_tramite = $${values.length}`);
        }

        if (funcionario && funcionario !== 'all') {
            values.push(funcionario);
            conditions.push(`EXISTS (
                SELECT 1
                FROM public.tramites_detalle fd
                WHERE fd.id_tramite = t.id_tramite
                  AND (fd.cargo = $${values.length} OR fd.email_empresa = $${values.length})
            )`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const tramitesResult = await pool.query(
            `SELECT
                t.id_tramite,
                t.cite_tramite,
                t.nombre_tramite,
                t.nombre_completo2,
                t.tipo_persona,
                t.estado_tramite,
                t.estado_reg,
                t.observacion,
                t.num_resolucion
             FROM public.tramites t
             ${whereClause}
             ORDER BY t.id_tramite DESC`,
            values
        );

        if (tramitesResult.rows.length === 0) {
            return res.json([]);
        }

        const ids = tramitesResult.rows.map((row) => row.id_tramite);
        const detallesResult = await pool.query(
            `SELECT
                d.id_tramite,
                d.cite_tramite,
                d.descripcion,
                d.estado_reg,
                d.estado_tramite,
                d.cargo,
                d.email_empresa
             FROM public.tramites_detalle d
             WHERE d.id_tramite = ANY($1::int[])
             ORDER BY d.id_tramite DESC, d.cite_tramite ASC, d.descripcion ASC`,
            [ids]
        );

        const detallesPorTramite = new Map();

        detallesResult.rows.forEach((detalle) => {
            if (!detallesPorTramite.has(detalle.id_tramite)) {
                detallesPorTramite.set(detalle.id_tramite, []);
            }

            detallesPorTramite.get(detalle.id_tramite).push(detalle);
        });

        const tramites = tramitesResult.rows.map((row) => ({
            ...row,
            detalles: detallesPorTramite.get(row.id_tramite) || []
        }));

        res.json(tramites);
    } catch (error) {
        console.error('Error al obtener trámites:', error);
        res.status(500).json({ error: 'Error al obtener trámites' });
    }
});

// GET - Obtener un trámite por ID con sus detalles
app.get('/api/tramites/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const data = await fetchTramiteConDetalles(id);

        if (!data) {
            return res.status(404).json({ error: 'Trámite no encontrado' });
        }

        res.json(data);
    } catch (error) {
        console.error('Error al obtener trámite:', error);
        res.status(500).json({ error: 'Error al obtener trámite' });
    }
});

// DELETE - Eliminar un trámite (y sus detalles en cascada)
app.delete('/api/tramites/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        await client.query('BEGIN');

        const detalleDeleteResult = await client.query(
            `DELETE FROM public.tramites_detalle WHERE id_tramite = $1 RETURNING id_tramite`,
            [id]
        );

        const result = await client.query(
            `DELETE FROM public.tramites WHERE id_tramite = $1 RETURNING id_tramite, cite_tramite, nombre_tramite, nombre_completo2, tipo_persona, estado_tramite, estado_reg, observacion, num_resolucion`,
            [id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Trámite no encontrado' });
        }

        await client.query('COMMIT');

        res.json({
            message: 'Trámite eliminado correctamente',
            tramite: result.rows[0],
            detalles_eliminados: detalleDeleteResult.rowCount
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al eliminar trámite:', error);
        res.status(500).json({ error: 'Error al eliminar trámite' });
    } finally {
        client.release();
    }
});

// GET - Obtener estadísticas
app.get('/api/estadisticas', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(estado_tramite, '')) IN ('por asignar', 'inicio')) as inicio,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(estado_tramite, '')) IN ('en proceso', 'proceso')) as proceso,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(estado_tramite, '')) IN ('finalizado', 'final')) as finalizado
            FROM public.tramites
        `);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

// GET - Obtener lista de funcionarios únicos
app.get('/api/funcionarios', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT DISTINCT value
             FROM (
                 SELECT cargo AS value FROM public.tramites_detalle WHERE cargo IS NOT NULL AND cargo <> ''
                 UNION
                 SELECT email_empresa AS value FROM public.tramites_detalle WHERE email_empresa IS NOT NULL AND email_empresa <> ''
             ) values_list
             ORDER BY value`
        );
        res.json(result.rows.map((row) => row.value));
    } catch (error) {
        console.error('Error al obtener funcionarios:', error);
        res.status(500).json({ error: 'Error al obtener funcionarios' });
    }
});

// ===================================
// INICIALIZAR SERVIDOR
// ===================================
async function startServer() {
    try {
        // Inicializar la base de datos
        await initializeDatabase();

        // Iniciar el servidor
        app.listen(PORT, () => {
            console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
            console.log(`📊 API disponible en http://localhost:${PORT}/api/tramites`);
            console.log(`📋 Schema: ${process.env.DB_SCHEMA || 'public'}`);
            console.log(`🔍 Búsqueda habilitada por campos actuales de tramites y tramites_detalle`);
            console.log(`\n💡 Presiona Ctrl+C para detener el servidor\n`);
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

startServer();
