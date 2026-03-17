import { NextResponse } from "next/server";
import { getDbBinding } from "@/app/lib/db";
import { getAssetStatusesFromDb, getDefaultAssetStatusCode } from "@/app/lib/assetStatus";

export const runtime = "edge";

export async function GET() {
  try {
    const db = getDbBinding();
    const items = await getAssetStatusesFromDb(db);
    const defaultCode = getDefaultAssetStatusCode(items);
    return NextResponse.json({ items, defaultCode });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error interno" }, { status: 500 });
  }
}