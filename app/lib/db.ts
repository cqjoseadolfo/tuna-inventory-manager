export function getDbBinding() {
  const db = ((globalThis as any).DB || (process.env as any).DB) as any;

  if (!db) {
    throw new Error("Database binding (DB) not found in runtime environment");
  }

  return db;
}

export function isMissingTableError(error: unknown, tableName?: string) {
  const message = String((error as any)?.message || "");
  if (!message.toLowerCase().includes("no such table")) {
    return false;
  }

  if (!tableName) {
    return true;
  }

  return message.includes(tableName);
}
