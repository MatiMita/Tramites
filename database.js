const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

const schema = process.env.DB_SCHEMA || 'public';

pool.on('connect', async (client) => {
    console.log('✅ Conectado a PostgreSQL');

    try {
        await client.query(`SET search_path TO ${schema}`);
    } catch (err) {
        console.error(err);
    }
});

pool.on('error', (err) => {
    console.error('❌ Error PostgreSQL:', err.message);
});

async function initializeDatabase() {

    const client = await pool.connect();

    try {

        await client.query(`SET search_path TO ${schema}`);

        // Verificar conexión
        const db = await client.query(`
            SELECT
                current_database() AS database,
                current_user AS usuario,
                current_schema() AS schema
        `);

        console.log('===============================');
        console.log('Base de datos:', db.rows[0].database);
        console.log('Usuario:', db.rows[0].usuario);
        console.log('Schema:', db.rows[0].schema);

        // Mostrar tablas existentes
        const tablas = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema='public'
            ORDER BY table_name
        `);

        console.log('Tablas encontradas:');

        tablas.rows.forEach((t) => {
            console.log(' -', t.table_name);
        });

        console.log('===============================');

        console.log('✅ Base de datos inicializada correctamente');

    } catch (err) {

        console.error(err);

        throw err;

    } finally {

        client.release();

    }

}

module.exports = {
    pool,
    initializeDatabase,
    schema
};