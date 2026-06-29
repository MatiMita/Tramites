const { Pool } = require('pg');
require('dotenv').config();


const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'tramites_db',
});


const schema = process.env.DB_SCHEMA || 'public';


pool.on('connect', (client) => {
    console.log('✅ Conectado a la base de datos PostgreSQL');
   
    client.query(`SET search_path TO public`);
});

pool.on('error', (err) => {
    console.error('❌ Error en la conexión a PostgreSQL:', err);
});

// Función para inicializar la base de datos (crear tablas si no existen)
async function initializeDatabase() {
    const client = await pool.connect();
    try {
        await client.query(`SET search_path TO ${schema}`);

        const tablesResult = await client.query(
            `SELECT table_name
             FROM information_schema.tables
             WHERE table_schema = $1
               AND table_name IN ('tramites', 'tramites_detalle')
             ORDER BY table_name`,
            [schema]
        );

        const tables = tablesResult.rows.map((row) => row.table_name);

        if (tables.length !== 2) {
            throw new Error(`No se encontraron las tablas tramites y tramites_detalle en el schema ${schema}`);
        }

        console.log(`✅ Conectado al schema ${schema} - Tablas ${tables.join(' y ')} listas`);
    } catch (error) {
        console.error('❌ Error al verificar la base de datos:', error);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    pool,
    initializeDatabase,
    schema
};
