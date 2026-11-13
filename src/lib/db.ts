import { neon } from '@neondatabase/serverless';
import path from 'path';
import fs from 'fs';

// Helper to resolve DATABASE_URL from process.env or .env.local
function getDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.POSTGRES_URL) return process.env.POSTGRES_URL;
  if (process.env.DATABASE_URL_UNPOOLED) return process.env.DATABASE_URL_UNPOOLED;

  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('DATABASE_URL=')) {
          return trimmed.substring('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  } catch {}
  return undefined;
}

// Convert SQLite SQL syntax to PostgreSQL SQL syntax
export function convertSqlToPostgres(sqlText: string): string | null {
  let s = sqlText.trim();
  if (/^PRAGMA\s+/i.test(s)) return null;

  s = s.replace(/strftime\s*\(\s*['"]%Y-%m['"]\s*,\s*([^)]+)\)/gi, 'SUBSTR($1, 1, 7)');
  s = s.replace(/strftime\s*\(\s*['"]%Y['"]\s*,\s*([^)]+)\)/gi, 'SUBSTR($1, 1, 4)');

  if (/^INSERT\s+OR\s+IGNORE\s+INTO\s+/i.test(s)) {
    s = s.replace(/^INSERT\s+OR\s+IGNORE\s+INTO\s+/i, 'INSERT INTO ');
    if (!/ON\s+CONFLICT/i.test(s)) {
      s += ' ON CONFLICT DO NOTHING';
    }
  }

  let pIdx = 1;
  s = s.replace(/\?/g, () => `$${pIdx++}`);
  return s;
}

// Lazy Neon client
let neonClient: any = null;
function getNeon() {
  if (!neonClient) {
    const url = getDatabaseUrl();
    if (url) {
      neonClient = neon(url);
    }
  }
  return neonClient;
}

// Lazy SQLite client (local fallback if no DATABASE_URL)
let sqliteInstance: any = null;
function getSqlite() {
  if (!sqliteInstance) {
    const { DatabaseSync } = require('node:sqlite');
    const dbDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    const dbPath = path.join(dbDir, 'absensi.db');
    sqliteInstance = new DatabaseSync(dbPath);
    sqliteInstance.exec('PRAGMA foreign_keys = ON;');
  }
  return sqliteInstance;
}

export async function query<T = any>(sqlText: string, params: any[] = []): Promise<T[]> {
  const client = getNeon();
  const flatParams = params.flat();
  if (client) {
    const converted = convertSqlToPostgres(sqlText);
    if (!converted) return [];
    return (await client.query(converted, flatParams)) as T[];
  }
  const sqlite = getSqlite();
  return sqlite.prepare(sqlText).all(...flatParams) as T[];
}

export async function queryOne<T = any>(sqlText: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sqlText, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sqlText: string, params: any[] = []): Promise<any> {
  const client = getNeon();
  const flatParams = params.flat();
  if (client) {
    const converted = convertSqlToPostgres(sqlText);
    if (!converted) return { changes: 0 };
    await client.query(converted, flatParams);
    return { changes: 1 };
  }
  const sqlite = getSqlite();
  return sqlite.prepare(sqlText).run(...flatParams);
}

export function getDb(): any {
  return {
    prepare(sqlText: string) {
      return {
        all: async (...params: any[]) => query(sqlText, params),
        get: async (...params: any[]) => queryOne(sqlText, params),
        run: async (...params: any[]) => execute(sqlText, params),
      };
    },
    exec: async (sqlText: string) => {
      const client = getNeon();
      if (client) {
        const converted = convertSqlToPostgres(sqlText);
        if (converted) await client.query(converted);
      } else {
        getSqlite().exec(sqlText);
      }
    },
  };
}

export function seedInitialData(db: any) {
  // Database is already pre-seeded and migrated to Neon PostgreSQL and SQLite with real IMBS data
}
