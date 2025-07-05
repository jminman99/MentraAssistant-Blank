"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.createDatabaseConnection = createDatabaseConnection;
exports.getDatabase = getDatabase;
exports.resetDatabaseConnection = resetDatabaseConnection;
var neon_http_1 = require("drizzle-orm/neon-http");
var serverless_1 = require("@neondatabase/serverless");
var schema = require("../shared/schema.js");
// Lazy database connection for Vercel serverless compatibility
var dbInstance = null;
function createDatabaseConnection() {
    var databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is not set');
    }
    try {
        var sql = (0, serverless_1.neon)(databaseUrl);
        return (0, neon_http_1.drizzle)(sql, { schema: schema });
    }
    catch (error) {
        console.error('Failed to create database connection:', error);
        throw new Error('Database connection failed');
    }
}
function getDatabase() {
    if (!dbInstance) {
        dbInstance = createDatabaseConnection();
    }
    return dbInstance;
}
function resetDatabaseConnection() {
    dbInstance = null;
}
// Export db for backward compatibility
exports.db = new Proxy({}, {
    get: function (target, prop) {
        return getDatabase()[prop];
    }
});
