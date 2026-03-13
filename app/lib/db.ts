export function getDbBinding() {
  const db = ((globalThis as any).DB || (process.env as any).DB) as any;

  if (!db) {
    throw new Error("Database binding (DB) not found in runtime environment");
  }

  return db;
}
