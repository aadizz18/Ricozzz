/**
 * RICOZ Admin — InsForge PostgreSQL Database Client
 *
 * Replaces SQLite with the real InsForge PostgreSQL backend.
 * Uses the official InsForge rawsql endpoint with parameterized queries.
 */

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || "https://2cbr24z5.us-east.insforge.app";
const adminApiKey = process.env.INSFORGE_API_KEY || "";

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

/**
 * Execute a parameterized SQL query against InsForge PostgreSQL.
 * Automatically converts SQLite-style `?` placeholders to PostgreSQL `$1, $2, ...` syntax.
 */
export async function query<T = any>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_INSFORGE_URL is not configured.");
  }
  if (!adminApiKey) {
    throw new Error("INSFORGE_API_KEY is not configured.");
  }

  // Convert ? placeholders to $1, $2, $3...
  let paramIndex = 1;
  const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);

  let lastError: any = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${baseUrl}/api/database/advance/rawsql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminApiKey}`,
        },
        body: JSON.stringify({ query: pgSql, params }),
        cache: "no-store",
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`PostgreSQL query error [${res.status}]:`, errorText, "\nSQL:", pgSql);
        throw new Error(`Database query failed (${res.status}): ${errorText}`);
      }

      const data = await res.json();
      const rows = (data.rows || data.data || []) as T[];
      const rowCount = data.rowCount ?? rows.length;

      return { rows, rowCount };
    } catch (err) {
      lastError = err;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

export async function queryAll<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await query<T>(sql, params);
  return result.rows;
}

export async function queryOne<T = any>(sql: string, params: unknown[] = []): Promise<T | null> {
  const result = await query<T>(sql, params);
  return result.rows[0] ?? null;
}

export async function execute(sql: string, params: unknown[] = []): Promise<number> {
  const result = await query(sql, params);
  return result.rowCount;
}

/**
 * Compatibility wrapper for SQLite-style `db.prepare(sql).all/get/run(...)`.
 * Returns Promises to allow async PostgreSQL execution while preserving call signatures.
 */
export function getDb() {
  return {
    prepare(sql: string) {
      return {
        async all(...params: unknown[]) {
          const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          const result = await query(sql, flatParams);
          return result.rows;
        },
        async get(...params: unknown[]) {
          const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          const result = await query(sql, flatParams);
          return result.rows[0] ?? null;
        },
        async run(...params: unknown[]) {
          const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          const result = await query(sql, flatParams);
          return {
            changes: result.rowCount,
            lastInsertRowid: undefined,
          };
        },
      };
    },
    query,
    queryAll,
    queryOne,
    execute,
  };
}

// Password hashing utility using Node.js crypto (timing-safe)
import crypto from "node:crypto";

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const userSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, userSalt, 64).toString("hex");
  return { hash, salt: userSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const testHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(testHash, "hex"));
  } catch {
    return false;
  }
}
