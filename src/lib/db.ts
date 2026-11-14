import { neon } from '@neondatabase/serverless';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const req = typeof require !== 'undefined' ? require : createRequire(import.meta.url);

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

// Lazy SQLite client (local fallback if no DATABASE_URL or during local dev)
let sqliteInstance: any = null;
function getSqlite() {
  if (!sqliteInstance) {
    try {
      const { DatabaseSync } = req('node:sqlite');
      const isVercel = !!process.env.VERCEL;
      const dbDir = isVercel ? '/tmp' : path.join(process.cwd(), 'data');
      if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
      const dbPath = path.join(dbDir, 'absensi.db');
      sqliteInstance = new DatabaseSync(dbPath);
      sqliteInstance.exec('PRAGMA foreign_keys = ON;');
    } catch (e) {
      console.warn('SQLite init warning (normal in serverless if Neon is connected):', e);
      return null;
    }
  }
  return sqliteInstance;
}

// Resilient query timeout wrapper (4000ms max)
async function withTimeout<T>(promise: Promise<T>, ms: number = 4000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Database operation timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function query<T = any>(sqlText: string, params: any[] = []): Promise<T[]> {
  const client = getNeon();
  const flatParams = params.flat();
  if (client) {
    try {
      const converted = convertSqlToPostgres(sqlText);
      if (!converted) return [];
      return (await withTimeout(client.query(converted, flatParams), 4000)) as T[];
    } catch (err: any) {
      console.warn('Neon query error/timeout, falling back to local SQLite:', err?.message || err);
    }
  }
  try {
    const sqlite = getSqlite();
    if (!sqlite) return [];
    return sqlite.prepare(sqlText).all(...flatParams) as T[];
  } catch (err: any) {
    console.error('SQLite query error:', err?.message || err);
    return [];
  }
}

export async function queryOne<T = any>(sqlText: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sqlText, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sqlText: string, params: any[] = []): Promise<any> {
  const client = getNeon();
  const flatParams = params.flat();
  let neonSuccess = false;

  if (client) {
    try {
      const converted = convertSqlToPostgres(sqlText);
      if (converted) {
        await withTimeout(client.query(converted, flatParams), 5000);
        neonSuccess = true;
      }
    } catch (err: any) {
      console.warn('Neon execute error/timeout, falling back to local SQLite:', err?.message || err);
    }
  }

  // On Vercel, Neon PostgreSQL is the primary persistent store
  if (process.env.VERCEL && neonSuccess) {
    return { changes: 1 };
  }

  // Dual-write or fallback execution in local SQLite for localhost
  try {
    const sqlite = getSqlite();
    if (sqlite) {
      const result = sqlite.prepare(sqlText).run(...flatParams);
      return result;
    }
    return { changes: neonSuccess ? 1 : 0 };
  } catch (err: any) {
    if (!neonSuccess) {
      console.error('All database executions failed:', err?.message || err);
      throw err;
    }
    return { changes: 1 };
  }
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
        try {
          const converted = convertSqlToPostgres(sqlText);
          if (converted) await withTimeout(client.query(converted), 5000);
        } catch (err: any) {
          console.warn('Neon exec error/timeout:', err?.message || err);
        }
      }
      try {
        getSqlite().exec(sqlText);
      } catch (err: any) {
        console.error('SQLite exec error:', err?.message || err);
      }
    },
  };
}

export function seedInitialData(db: any) {
  // Database is already pre-seeded and migrated to Neon PostgreSQL and SQLite with real IMBS data
}
