import { NextResponse } from "next/server";
import { getDbBinding } from "@/app/lib/db";

export const runtime = "edge";

type AssetType = "instrumento" | "reconocimiento" | "uniforme";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      assetType,
      name,
      photoUrl,
      currentValue,
      status,
      notes,
      tags,
      createdByEmail,
      instrument,
      recognition,
      uniform,
    } = body as {
      assetType: AssetType;
      name: string;
      photoUrl: string;
      currentValue: number;
      status?: string;
      notes?: string | null;
      tags?: string[];
      createdByEmail?: string;
      instrument?: { instrumentType?: string; brand?: string; fabricationYear?: number | null } | null;
      recognition?: { issuer?: string; issueDate?: string | null; documentType?: string | null; referenceCode?: string | null } | null;
      uniform?: { size?: string | null; hasCinta?: boolean; hasJubon?: boolean; hasGreguesco?: boolean } | null;
    };

    if (!assetType || !name || !photoUrl || Number.isNaN(Number(currentValue))) {
      return NextResponse.json({ error: "assetType, name, photoUrl y currentValue son requeridos" }, { status: 400 });
    }

    const validTypes = ["instrumento", "reconocimiento", "uniforme"];
    if (!validTypes.includes(assetType)) {
      return NextResponse.json({ error: "assetType inválido" }, { status: 400 });
    }

    const db = getDbBinding();
    const assetId = crypto.randomUUID();

    let createdByUserId: string | null = null;
    if (createdByEmail) {
      const user = await db.prepare("SELECT id FROM users WHERE email = ?").bind(createdByEmail).first();
      createdByUserId = user?.id || null;
    }

    await db
      .prepare(
        `INSERT INTO assets (id, asset_type, name, photo_url, current_value, status, notes, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        assetId,
        assetType,
        name,
        photoUrl,
        Number(currentValue),
        status || "disponible",
        notes ?? null,
        createdByUserId
      )
      .run();

    if (assetType === "instrumento") {
      if (!instrument?.instrumentType || !instrument?.brand) {
        return NextResponse.json({ error: "instrumentType y brand son requeridos para instrumentos" }, { status: 400 });
      }

      await db
        .prepare(
          `INSERT INTO asset_instruments (asset_id, instrument_type, brand, fabrication_year)
           VALUES (?, ?, ?, ?)`
        )
        .bind(assetId, instrument.instrumentType, instrument.brand, instrument.fabricationYear ?? null)
        .run();
    }

    if (assetType === "reconocimiento") {
      if (!recognition?.issuer) {
        return NextResponse.json({ error: "issuer es requerido para reconocimientos" }, { status: 400 });
      }

      await db
        .prepare(
          `INSERT INTO asset_recognitions (asset_id, issuer, issue_date, document_type, reference_code)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(
          assetId,
          recognition.issuer,
          recognition.issueDate ?? null,
          recognition.documentType ?? null,
          recognition.referenceCode ?? null
        )
        .run();
    }

    if (assetType === "uniforme") {
      await db
        .prepare(
          `INSERT INTO asset_uniforms (asset_id, size, has_cinta, has_jubon, has_greguesco)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(
          assetId,
          uniform?.size ?? null,
          uniform?.hasCinta ? 1 : 0,
          uniform?.hasJubon ? 1 : 0,
          uniform?.hasGreguesco ? 1 : 0
        )
        .run();
    }

    if (Array.isArray(tags) && tags.length > 0) {
      for (const rawTag of tags) {
        const tag = String(rawTag || "").trim().toLowerCase();
        if (!tag) continue;

        await db
          .prepare("INSERT OR IGNORE INTO asset_tags (id, asset_id, tag) VALUES (?, ?, ?)")
          .bind(crypto.randomUUID(), assetId, tag)
          .run();
      }
    }

    return NextResponse.json({ success: true, assetId });
  } catch (error: any) {
    console.error("Error creating asset:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
