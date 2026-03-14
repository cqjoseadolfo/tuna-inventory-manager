import { NextResponse } from "next/server";
import { getDbBinding } from "@/app/lib/db";

export const runtime = "edge";

type AssetType = "instrumento" | "reconocimiento" | "uniforme" | "otro";

const generateAssetCode = (assetType: AssetType) => {
  const prefixMap: Record<AssetType, string> = {
    instrumento: "INS",
    reconocimiento: "REC",
    uniforme: "UNI",
    otro: "OTR",
  };

  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `TUNA-${prefixMap[assetType]}-${yyyy}${mm}${dd}-${suffix}`;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const assetType = (searchParams.get("assetType") || "").trim().toLowerCase();
    const status = (searchParams.get("status") || "").trim().toLowerCase();
    const tag = (searchParams.get("tag") || "").trim().toLowerCase();
    const limitRaw = Number(searchParams.get("limit") || "50");
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 100)) : 50;

    const db = getDbBinding();

    const conditions: string[] = [];
    const params: any[] = [];

    if (q) {
      conditions.push("(LOWER(a.name) LIKE ? OR LOWER(COALESCE(a.notes, '')) LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }

    if (assetType) {
      conditions.push("LOWER(a.asset_type) = ?");
      params.push(assetType);
    }

    if (status) {
      conditions.push("LOWER(a.status) = ?");
      params.push(status);
    }

    if (tag) {
      conditions.push("EXISTS (SELECT 1 FROM asset_tags t2 WHERE t2.asset_id = a.id AND LOWER(t2.tag) = ?)");
      params.push(tag.startsWith("#") ? tag : `#${tag}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT
        a.id,
        a.asset_type,
        a.name,
        a.photo_url,
        a.fabrication_year AS asset_fabrication_year,
        a.current_value,
        a.status,
        a.notes,
        usr.nickname AS holder_nickname,
        usr.email AS holder_email,
        usr.full_name AS holder_name,
        usr.picture AS holder_picture,
        a.created_at,
        i.instrument_type,
        i.brand,
        r.issuer,
        r.issue_date,
        r.document_type,
        r.reference_code,
        u.size,
        u.has_cinta,
        u.has_jubon,
        u.has_greguesco,
        GROUP_CONCAT(DISTINCT t.tag) AS tags
      FROM assets a
      LEFT JOIN users usr ON usr.id = a.created_by_user_id
      LEFT JOIN asset_instruments i ON i.asset_id = a.id
      LEFT JOIN asset_recognitions r ON r.asset_id = a.id
      LEFT JOIN asset_uniforms u ON u.asset_id = a.id
      LEFT JOIN asset_tags t ON t.asset_id = a.id
      ${whereClause}
      GROUP BY
        a.id,
        a.asset_type,
        a.name,
        a.photo_url,
        a.fabrication_year,
        a.current_value,
        a.status,
        a.notes,
        usr.nickname,
        usr.email,
        usr.full_name,
        usr.picture,
        a.created_at,
        i.instrument_type,
        i.brand,
        r.issuer,
        r.issue_date,
        r.document_type,
        r.reference_code,
        u.size,
        u.has_cinta,
        u.has_jubon,
        u.has_greguesco
      ORDER BY a.created_at DESC
      LIMIT ?
    `;

    const rows = await db.prepare(sql).bind(...params, limit).all();
    const results = (rows?.results || []).map((row: any) => ({
      id: row.id,
      assetType: row.asset_type,
      name: row.name,
      photoUrl: row.photo_url,
      fabricationYear: row.asset_fabrication_year,
      currentValue: row.current_value,
      status: row.status,
      notes: row.notes,
      holderNickname: row.holder_nickname,
      holderEmail: row.holder_email,
      holderName: row.holder_name,
      holderPicture: row.holder_picture || null,
      holderDisplayName: row.holder_nickname || row.holder_name || row.holder_email,
      createdAt: row.created_at,
      tags: row.tags ? String(row.tags).split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      instrument:
        row.asset_type === "instrumento"
          ? {
              instrumentType: row.instrument_type,
              brand: row.brand,
              fabricationYear: row.asset_fabrication_year,
            }
          : null,
      recognition:
        row.asset_type === "reconocimiento"
          ? {
              issuer: row.issuer,
              issueDate: row.issue_date,
              documentType: row.document_type,
              referenceCode: row.reference_code,
            }
          : null,
      uniform:
        row.asset_type === "uniforme"
          ? {
              size: row.size,
              hasCinta: Boolean(row.has_cinta),
              hasJubon: Boolean(row.has_jubon),
              hasGreguesco: Boolean(row.has_greguesco),
            }
          : null,
    }));

    return NextResponse.json({ success: true, count: results.length, items: results });
  } catch (error: any) {
    console.error("Error searching assets:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      assetType,
      code,
      name,
      photoUrl,
      currentValue,
      fabricationYear,
      status,
      notes,
      tags,
      createdByEmail,
      instrument,
      recognition,
      uniform,
    } = body as {
      assetType: AssetType;
      code?: string;
      name?: string;
      photoUrl: string;
      currentValue: number;
      fabricationYear?: number | null;
      status?: string;
      notes?: string | null;
      tags?: string[];
      createdByEmail?: string;
      instrument?: { instrumentType?: string; brand?: string } | null;
      recognition?: { issuer?: string; issueDate?: string | null; documentType?: string | null; referenceCode?: string | null } | null;
      uniform?: { size?: string | null; hasCinta?: boolean; hasJubon?: boolean; hasGreguesco?: boolean } | null;
    };

    const generatedCode = generateAssetCode(assetType || "otro");
    const assetIdentifier = String(code || name || generatedCode).trim();
    const parsedCurrentValue = Number(currentValue ?? 0);
    const rawFabricationYear = fabricationYear ?? null;
    const parsedFabricationYear = rawFabricationYear === null || rawFabricationYear === undefined ? null : Number(rawFabricationYear);

    if (
      !assetType ||
      !assetIdentifier ||
      !photoUrl ||
      Number.isNaN(parsedCurrentValue) ||
      (parsedFabricationYear !== null && Number.isNaN(parsedFabricationYear))
    ) {
      return NextResponse.json({ error: "assetType, código/nombre y photoUrl son requeridos" }, { status: 400 });
    }

    const validTypes = ["instrumento", "reconocimiento", "uniforme", "otro"];
    if (!validTypes.includes(assetType)) {
      return NextResponse.json({ error: "assetType inválido" }, { status: 400 });
    }

    const db = getDbBinding();
    const assetId = crypto.randomUUID();

    let createdByUserId: string | null = null;
    let holderDisplayName: string | null = null;
    if (createdByEmail) {
      const user = await db.prepare("SELECT id, nickname, full_name, email FROM users WHERE email = ?").bind(createdByEmail).first();
      createdByUserId = user?.id || null;
      holderDisplayName = user?.nickname || user?.full_name || user?.email || null;
    }

    await db
      .prepare(
        `INSERT INTO assets (id, asset_type, name, photo_url, fabrication_year, current_value, status, notes, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        assetId,
        assetType,
        assetIdentifier,
        photoUrl,
        parsedFabricationYear,
        parsedCurrentValue,
        status || "bajo_responsabilidad",
        notes ?? null,
        createdByUserId
      )
      .run();

    if (assetType === "instrumento") {
      await db
        .prepare(
          `INSERT INTO asset_instruments (asset_id, instrument_type, brand)
           VALUES (?, ?, ?)`
        )
        .bind(
          assetId,
          instrument?.instrumentType || "No identificado",
          instrument?.brand || "No identificado"
        )
        .run();
    }

    if (assetType === "reconocimiento") {
      await db
        .prepare(
          `INSERT INTO asset_recognitions (asset_id, issuer, issue_date, document_type, reference_code)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(
          assetId,
          recognition?.issuer || "No identificado",
          recognition?.issueDate ?? null,
          recognition?.documentType ?? null,
          recognition?.referenceCode ?? null
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

    return NextResponse.json({
      success: true,
      assetId,
      assetCode: assetIdentifier,
      status: status || "bajo_responsabilidad",
      holderName: holderDisplayName,
    });
  } catch (error: any) {
    console.error("Error creating asset:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
