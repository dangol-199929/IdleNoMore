import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'deskclock.db';

/**
 * Ordered schema migrations. Each entry upgrades the database by one version;
 * the current version is tracked in SQLite's built-in `user_version` pragma.
 * Never edit a migration that has shipped; append a new one instead.
 */
const MIGRATIONS: string[] = [
  // 1: key/value settings
  `CREATE TABLE IF NOT EXISTS settings (
     key   TEXT PRIMARY KEY NOT NULL,
     value TEXT NOT NULL
   );`,
  // 2: personal reminders; times are stored as epoch milliseconds
  `CREATE TABLE IF NOT EXISTS reminders (
     id              INTEGER PRIMARY KEY AUTOINCREMENT,
     title           TEXT NOT NULL,
     notes           TEXT,
     due_at          INTEGER NOT NULL,
     completed_at    INTEGER,
     notification_id TEXT,
     created_at      INTEGER NOT NULL
   );
   CREATE INDEX IF NOT EXISTS reminders_by_due ON reminders (completed_at, due_at);`,
  // 3: photos copied into app storage for the slideshow
  `CREATE TABLE IF NOT EXISTS photos (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     uri        TEXT NOT NULL,
     width      INTEGER NOT NULL,
     height     INTEGER NOT NULL,
     added_at   INTEGER NOT NULL
   );`,
];

let database: SQLite.SQLiteDatabase | null = null;

/** Opens the database on first use and brings its schema up to date. */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (database) {
    return database;
  }

  const db = SQLite.openDatabaseSync(DATABASE_NAME);
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  for (let version = currentVersion; version < MIGRATIONS.length; version++) {
    db.withTransactionSync(() => {
      db.execSync(MIGRATIONS[version]);
      db.execSync(`PRAGMA user_version = ${version + 1}`);
    });
  }

  database = db;
  return db;
}
