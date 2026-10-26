import type { RulesModule } from "@/engine/rules";
import initSqlJs, { type Database } from "sql.js";

/**
 * The Gatekeeper's Ledger — SQL injection, with a REAL SQLite engine (sql.js / WASM).
 * Hidden law: when input is pasted into the text of a command, a quote ends the data and the rest
 * is executed as code. Parameterised queries ("sealed scrolls") keep input as data.
 *
 * The scribe copies the player's scroll into:  SELECT * FROM vault WHERE name = '<name>' AND pass = '<pass>'
 */
export type GatekeeperState = {
  query: string;
  rows: Record<string, unknown>[];
  error: string | null;
  attempts: number;
};

let dbPromise: Promise<Database> | null = null;
async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = initSqlJs(
      typeof window !== "undefined" ? { locateFile: (f: string) => `/${f}` } : undefined,
    ).then((SQL) => {
      const db = new SQL.Database();
      db.run(`CREATE TABLE vault (name TEXT, pass TEXT, treasure TEXT);
              INSERT INTO vault VALUES ('queen', 'crown-of-thorns-9', 'The Royal Seal'),
                                       ('steward', 'grain-ledger-42', 'Granary keys');`);
      return db;
    });
  }
  return dbPromise;
}

async function attempt(name: string, pass: string, sealed: boolean): Promise<Omit<GatekeeperState, "attempts">> {
  const db = await getDb();
  if (sealed) {
    const query = "SELECT * FROM vault WHERE name = ? AND pass = ?";
    try {
      const stmt = db.prepare(query);
      stmt.bind([name, pass]);
      const rows: Record<string, unknown>[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return { query: `${query}   -- sealed: [${JSON.stringify(name)}, ${JSON.stringify(pass)}]`, rows, error: null };
    } catch (e) {
      return { query, rows: [], error: (e as Error).message };
    }
  }
  const query = `SELECT * FROM vault WHERE name = '${name}' AND pass = '${pass}'`;
  try {
    const res = db.exec(query);
    const rows = res[0] ? res[0].values.map((v) => Object.fromEntries(res[0].columns.map((c, i) => [c, v[i]]))) : [];
    return { query, rows, error: null };
  } catch (e) {
    return { query, rows: [], error: (e as Error).message };
  }
}

export const gatekeeper: RulesModule<GatekeeperState> = {
  async init(params) {
    const r = await attempt(String(params.name ?? "traveller"), String(params.pass ?? ""), Boolean(params.sealed));
    return { ...r, attempts: 1 };
  },
  async step(state, params) {
    const r = await attempt(String(params.name ?? "traveller"), String(params.pass ?? ""), Boolean(params.sealed));
    return { ...r, attempts: state.attempts + 1 };
  },
  observe(state) {
    return {
      vaultOpen: state.rows.length > 0 ? "open" : "shut",
      rowsReturned: state.rows.length,
      scribeError: state.error ? "error" : "ok",
      query: state.query,
    };
  },
  view(state) {
    return { kind: "pipeline", stages: ["scroll", "scribe", "ledger", "vault"], query: state.query, rows: state.rows, error: state.error };
  },
};
