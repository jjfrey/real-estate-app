import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazy initialization to support build-time when DATABASE_URL might not be set
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return connectionString;
}

export function getDb() {
  if (!_db) {
    const connectionString = getConnectionString();
    _client = postgres(connectionString);
    _db = drizzle(_client, { schema });
  }
  return _db;
}

// For backwards compatibility - use getDb() for new code
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle<typeof schema>>];
  },
});

// For migrations (uses a separate connection)
export function getMigrationClient() {
  const connectionString = getConnectionString();
  return postgres(connectionString, { max: 1 });
}
