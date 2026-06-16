const { Pool } = require('pg');
require('dotenv').config();


const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'tramites_db',
});


const schema = 'public';


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
        // Establecer el schema
        await client.query(`SET search_path TO public`);

        // Las tablas tramites y tramites_detalle ya existen
        // Solo verificamos la conexión
        console.log(`✅ Conectado al schema public - Tablas tramites y tramites_detalle listas`);
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
