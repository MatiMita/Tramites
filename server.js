const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { pool, initializeDatabase, schema } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

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
        
        // Filtro de búsqueda EXACTA (por ID o cite_tramite)
        if (search) {
            const searchTrimmed = search.trim();
            const searchAsNumber = parseInt(searchTrimmed);
            
            // Buscar en ambas tablas y combinar resultados
            let tramitesResults = [];
            let detallesResults = [];
            
            if (!isNaN(searchAsNumber)) {
                // Buscar por ID o cite en tabla tramites
                tramitesResults = await pool.query(
                    `SELECT * FROM public.tramites 
                     WHERE id_tramite = $1 OR cite_tramite = $2
                     ORDER BY id_tramite DESC`,
                    [searchAsNumber, searchTrimmed]
                );
                
                // Buscar por ID o cite en tabla tramites_detalle
                detallesResults = await pool.query(
                    `SELECT * FROM public.tramites_detalle 
                     WHERE id_tramite = $1 OR cite_tramite = $2`,
                    [searchAsNumber, searchTrimmed]
                );
            } else {
                // Buscar solo por cite en ambas tablas
                tramitesResults = await pool.query(
                    `SELECT * FROM public.tramites 
                     WHERE cite_tramite = $1
                     ORDER BY id_tramite DESC`,
                    [searchTrimmed]
                );
                
                detallesResults = await pool.query(
                    `SELECT * FROM public.tramites_detalle 
                     WHERE cite_tramite = $1`,
                    [searchTrimmed]
                );
            }
            
            // Combinar los datos de ambas tablas en un solo objeto por trámite
            const tramitesMap = new Map();
            
            // Agregar datos de tramites (principal)
            tramitesResults.rows.forEach(t => {
                const key = t.id_tramite || t.cite_tramite;
                tramitesMap.set(key, { 
                    ...t, 
                    tiene_principal: true, 
                    tiene_detalle: false 
                });
            });
            
            // Combinar con datos de tramites_detalle
            detallesResults.rows.forEach(d => {
                const key = d.id_tramite || d.cite_tramite;
                if (tramitesMap.has(key)) {
                    // Combinar datos existentes
                    const existing = tramitesMap.get(key);
                    tramitesMap.set(key, {
                        ...existing,
                        // Agregar campos de detalle sin sobrescribir los principales
                        cargo: d.cargo,
                        email_empresa: d.email_empresa,
                        descripcion: d.descripcion,
                        tiene_detalle: true
                    });
                } else {
                    // Solo existe en detalle
                    tramitesMap.set(key, { 
                        ...d, 
                        tiene_principal: false, 
                        tiene_detalle: true 
                    });
                }
            });
            
            const combinedResults = Array.from(tramitesMap.values());
            res.json(combinedResults);
        } else {
            // Sin búsqueda, devolver array vacío
            res.json([]);
        }
    } catch (error) {
        console.error('Error al obtener trámites:', error);
        res.status(500).json({ error: 'Error al obtener trámites' });
    }
});

// GET - Obtener un trámite por ID con sus detalles
app.get('/api/tramites/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener el trámite principal
        const tramiteResult = await pool.query(
            `SELECT * FROM public.tramites WHERE id_tramite = $1`,
            [id]
        );

        if (tramiteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Trámite no encontrado' });
        }

        // Obtener los detalles del trámite
        const detallesResult = await pool.query(
            `SELECT * FROM public.tramites_detalle WHERE id_tramite = $1 ORDER BY id_tramite DESC`,
            [id]
        );

        res.json({
            tramite: tramiteResult.rows[0],
            detalles: detallesResult.rows
        });
    } catch (error) {
        console.error('Error al obtener trámite:', error);
        res.status(500).json({ error: 'Error al obtener trámite' });
    }
});

// ===================================
// RUTAS DE ESCRITURA (DESHABILITADAS - Solo lectura)
// ===================================
// Las siguientes rutas están comentadas porque el sistema es solo de consulta
/*
// POST - Crear un nuevo trámite
app.post('/api/tramites', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            id_tipo_tramite,
            cite_tramite,
            id_documento,
            estado_tramite,
            id_funcionario,
            ubicacion,
            fojas,
            num_resolucion,
            fecha_resolucion,
            observacion,
            // Datos del detalle inicial
            detalle
        } = req.body;

        // Validación básica
        if (!id_tipo_tramite || !cite_tramite || !estado_tramite) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Faltan campos requeridos: id_tipo_tramite, cite_tramite, estado_tramite'
            });
        }

        // Insertar el trámite principal
        const tramiteResult = await client.query(
            `INSERT INTO ${schema}.ttramite (
                id_tipo_tramite, cite_tramite, id_documento, estado_tramite, 
                id_funcionario, ubicacion, fojas, num_resolucion, 
                fecha_resolucion, observacion
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
            RETURNING *`,
            [
                id_tipo_tramite, cite_tramite, id_documento, estado_tramite,
                id_funcionario, ubicacion, fojas, num_resolucion,
                fecha_resolucion, observacion
            ]
        );

        const tramite = tramiteResult.rows[0];

        // Si se proporciona un detalle inicial, insertarlo
        if (detalle) {
            await client.query(
                `INSERT INTO ${schema}.ttramite_detalle (
                    id_tramite, id_funcionario, num_informe, id_documento,
                    estado_tramite, referencia_informe, descripcion,
                    id_funcionario_deriv, id_tipo_tramite
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    tramite.id_tramite,
                    detalle.id_funcionario,
                    detalle.num_informe,
                    detalle.id_documento,
                    estado_tramite,
                    detalle.referencia_informe,
                    detalle.descripcion,
                    detalle.id_funcionario_deriv,
                    id_tipo_tramite
                ]
            );
        }

        await client.query('COMMIT');
        res.status(201).json(tramite);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al crear trámite:', error);
        res.status(500).json({ error: 'Error al crear trámite' });
    } finally {
        client.release();
    }
});

// PUT - Actualizar un trámite
app.put('/api/tramites/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            id_tipo_tramite,
            cite_tramite,
            id_documento,
            estado_tramite,
            id_funcionario,
            ubicacion,
            fojas,
            num_resolucion,
            fecha_resolucion,
            observacion
        } = req.body;

        // Validación básica
        if (!id_tipo_tramite || !cite_tramite || !estado_tramite) {
            return res.status(400).json({
                error: 'Faltan campos requeridos: id_tipo_tramite, cite_tramite, estado_tramite'
            });
        }

        const result = await pool.query(
            `UPDATE ${schema}.ttramite 
             SET id_tipo_tramite = $1, cite_tramite = $2, id_documento = $3, 
                 estado_tramite = $4, id_funcionario = $5, ubicacion = $6,
                 fojas = $7, num_resolucion = $8, fecha_resolucion = $9,
                 observacion = $10, updated_at = CURRENT_TIMESTAMP
             WHERE id_tramite = $11 
             RETURNING *`,
            [
                id_tipo_tramite, cite_tramite, id_documento, estado_tramite,
                id_funcionario, ubicacion, fojas, num_resolucion,
                fecha_resolucion, observacion, id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Trámite no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al actualizar trámite:', error);
        res.status(500).json({ error: 'Error al actualizar trámite' });
    }
});

// POST - Agregar un detalle a un trámite existente
app.post('/api/tramites/:id/detalles', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            id_funcionario,
            num_informe,
            id_documento,
            estado_tramite,
            referencia_informe,
            descripcion,
            id_funcionario_deriv,
            id_tipo_tramite
        } = req.body;

        // Validar que el trámite existe
        const tramiteExists = await pool.query(
            `SELECT id_tramite FROM ${schema}.ttramite WHERE id_tramite = $1`,
            [id]
        );

        if (tramiteExists.rows.length === 0) {
            return res.status(404).json({ error: 'Trámite no encontrado' });
        }

        // Insertar el detalle
        const result = await pool.query(
            `INSERT INTO ${schema}.ttramite_detalle (
                id_tramite, id_funcionario, num_informe, id_documento,
                estado_tramite, referencia_informe, descripcion,
                id_funcionario_deriv, id_tipo_tramite
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                id, id_funcionario, num_informe, id_documento,
                estado_tramite, referencia_informe, descripcion,
                id_funcionario_deriv, id_tipo_tramite
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al agregar detalle:', error);
        res.status(500).json({ error: 'Error al agregar detalle' });
    }
});
*/

// DELETE - Eliminar un trámite (y sus detalles en cascada)
app.delete('/api/tramites/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `DELETE FROM public.tramites WHERE id_tramite = $1 RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Trámite no encontrado' });
        }

        res.json({ message: 'Trámite eliminado correctamente', tramite: result.rows[0] });
    } catch (error) {
        console.error('Error al eliminar trámite:', error);
        res.status(500).json({ error: 'Error al eliminar trámite' });
    }
});

// GET - Obtener estadísticas
app.get('/api/estadisticas', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE estado_tramite = 'Por Asignar') as inicio,
                COUNT(*) FILTER (WHERE estado_tramite = 'EN PROCESO') as proceso,
                COUNT(*) FILTER (WHERE estado_tramite = 'FINALIZADO') as finalizado
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
            `SELECT DISTINCT id_funcionario FROM ${schema}.ttramite WHERE id_funcionario IS NOT NULL ORDER BY id_funcionario`
        );
        res.json(result.rows.map(row => row.id_funcionario));
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
            console.log(`📋 Schema: public`);
            console.log(`🔍 Búsqueda habilitada por: ID y CITE`);
            console.log(`\n💡 Presiona Ctrl+C para detener el servidor\n`);
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

startServer();
