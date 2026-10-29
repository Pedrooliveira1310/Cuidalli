import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA foreign_keys=ON;
    PRAGMA journal_mode=WAL;
    PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('caregiver','senior')),
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS seniors (
      id TEXT PRIMARY KEY, caregiver_id TEXT NOT NULL REFERENCES users(id),
      user_id TEXT UNIQUE REFERENCES users(id), name TEXT NOT NULL, birth_date TEXT NOT NULL,
      phone TEXT NOT NULL, address TEXT NOT NULL DEFAULT '', timezone TEXT NOT NULL,
      inactivity_hours INTEGER NOT NULL DEFAULT 24 CHECK(inactivity_hours BETWEEN 1 AND 168),
      last_active TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS medications (
      id TEXT PRIMARY KEY, senior_id TEXT NOT NULL REFERENCES seniors(id) ON DELETE CASCADE,
      name TEXT NOT NULL, dosage TEXT NOT NULL, time TEXT NOT NULL, notes TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS confirmations (
      id TEXT PRIMARY KEY, medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
      day TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('tomei','nao_tomei')), created_at TEXT NOT NULL,
      UNIQUE(medication_id, day)
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY, senior_id TEXT NOT NULL REFERENCES seniors(id) ON DELETE CASCADE,
      specialty TEXT NOT NULL, starts_at TEXT NOT NULL, location TEXT NOT NULL, doctor TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY, senior_id TEXT NOT NULL REFERENCES seniors(id) ON DELETE CASCADE,
      name TEXT NOT NULL, phone TEXT NOT NULL, relationship TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY, senior_id TEXT NOT NULL REFERENCES seniors(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK(kind IN ('sos','inactivity')), status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
      created_at TEXT NOT NULL, resolved_at TEXT, contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_open_inactivity ON alerts(senior_id) WHERE kind='inactivity' AND status='open';
    CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY, senior_id TEXT NOT NULL REFERENCES seniors(id) ON DELETE CASCADE,
      content TEXT NOT NULL, reply TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS seniors_caregiver ON seniors(caregiver_id);
    CREATE INDEX IF NOT EXISTS alerts_senior ON alerts(senior_id, created_at);
  `);
  return db;
}
