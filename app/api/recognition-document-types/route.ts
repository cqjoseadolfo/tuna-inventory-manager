import { NextResponse } from "next/server";
import { getDbBinding } from "@/app/lib/db";
import { getRecognitionDocumentTypesFromDb } from "@/app/lib/recognitionDocumentType";

export const runtime = "edge";

export async function GET() {
  try {
    const db = getDbBinding();
    const items = await getRecognitionDocumentTypesFromDb(db);
    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error interno" }, { status: 500 });
  }
}
