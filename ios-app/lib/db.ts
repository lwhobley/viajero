import * as SQLite from 'expo-sqlite';

// Shared across every table (progress.ts, aiHistory.ts) so writes serialize
// through one connection instead of racing two separate connections against
// the same underlying file, which can throw "database is locked".
let database: Promise<SQLite.SQLiteDatabase> | undefined;
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  database ??= SQLite.openDatabaseAsync('viajero.db');
  return database;
}
