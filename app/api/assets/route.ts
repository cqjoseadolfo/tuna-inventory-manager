import { NextResponse } from "next/server";
import { getDbBinding, isMissingTableError } from "@/app/lib/db";
import { getPeruDate, getPeruISOString } from "@/app/lib/time";
import { getAssetStatusesFromDb, getDefaultAssetStatusCode, normalizeStatusCode } from "@/app/lib/assetStatus";
import { getRecognitionDocumentTypesFromDb } from "@/app/lib/recognitionDocumentType";

export const runtime = "edge";

type AssetType = "instrumento" | "reconocimiento" | "uniforme" | "otro";

const generateAssetCode = async (
  db: ReturnType<typeof import("@/app/lib/db").getDbBinding>,
  assetType: AssetType,
  fabricationYear?: number | null
): Promise<string> => {
  const prefixMap: Record<AssetType, string> = {
    instrumento: "INS",
    reconocimiento: "REC",
    uniforme: "UNI",
    otro: "OTR",
  };

  const prefix = prefixMap[assetType];

  // Use fabrication year if provided and valid, otherwise fall back to current Peru year
  const fullYear =
    fabricationYear !== null && fabricationYear !== undefined && fabricationYear > 0
      ? fabricationYear
      : getPeruDate().getUTCFullYear();

  // Last 2 digits via modulo — unambiguous (e.g. 2026 → 26, 1998 → 98)
  const yy = String(fullYear % 100).padStart(2, "0");


  // Count existing codes with same prefix+year to determine correlative
  const likePattern = `${prefix}-${yy}%`;
  const row = await db
    .prepare("SELECT COUNT(*) AS cnt FROM assets WHERE name LIKE ?")
    .bind(likePattern)
    .first<{ cnt: number }>();
  const correlative = String((row?.cnt ?? 0) + 1).padStart(2, "0");

  return `${prefix}-${yy}${correlative}`;
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
      conditions.push("EXISTS (SELECT 1 FROM asset_tag_map atm2 JOIN tags tg2 ON tg2.id = atm2.tag_id WHERE atm2.asset_id = a.id AND LOWER(tg2.tag) = ?)");
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
        holder.nickname AS holder_nickname,
        holder.email AS holder_email,
        holder.full_name AS holder_name,
        COALESCE(holder.profile_picture_url, holder.picture) AS holder_picture,
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
        GROUP_CONCAT(DISTINCT tg.tag) AS tags
      FROM assets a
      LEFT JOIN users holder ON holder.id = a.holder_user_id
      LEFT JOIN asset_instruments i ON i.asset_id = a.id
      LEFT JOIN asset_recognitions r ON r.asset_id = a.id
      LEFT JOIN asset_uniforms u ON u.asset_id = a.id
      LEFT JOIN asset_tag_map atm ON atm.asset_id = a.id
      LEFT JOIN tags tg ON tg.id = atm.tag_id
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
        holder.nickname,
        holder.email,
        holder.full_name,
        holder.picture,
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

    const db = getDbBinding();
    const statusCatalog = await getAssetStatusesFromDb(db);
    const allowedStatuses = new Set(statusCatalog.map((item) => item.code));
    const defaultStatus = getDefaultAssetStatusCode(statusCatalog);
    const requestedStatus = normalizeStatusCode(String(status || "").trim().toLowerCase());
    const finalStatus = requestedStatus && allowedStatuses.has(requestedStatus) ? requestedStatus : defaultStatus;
    const parsedCurrentValue = Number(currentValue ?? 0);
    const rawFabricationYear = fabricationYear ?? null;
    const parsedFabricationYear = rawFabricationYear === null || rawFabricationYear === undefined ? null : Number(rawFabricationYear);

    const generatedCode = await generateAssetCode(db, assetType || "otro", parsedFabricationYear);
    const assetIdentifier = String(code || name || generatedCode).trim();


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

    const assetId = crypto.randomUUID();


    let createdByUserId: string | null = null;
    let holderUserId: string | null = null;
    let holderDisplayName: string | null = null;
    if (createdByEmail) {
      const user = await db.prepare("SELECT id, nickname, full_name, email FROM users WHERE email = ?").bind(createdByEmail).first();
      createdByUserId = user?.id || null;
      holderUserId = user?.id || null;
      holderDisplayName = user?.nickname || user?.full_name || user?.email || null;
    }

    await db
      .prepare(
        `INSERT INTO assets (id, asset_type, name, photo_url, fabrication_year, current_value, status, notes, created_by_user_id, holder_user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        assetId,
        assetType,
        assetIdentifier,
        photoUrl,
        parsedFabricationYear,
        parsedCurrentValue,
        finalStatus,
        notes ?? null,
        createdByUserId,
        holderUserId,
        getPeruISOString()          // stored as Peru local time, not UTC
      )
      .run();

    try {
      await db
        .prepare(
          `INSERT INTO asset_movements (id, asset_id, movement_type, from_user_id, to_user_id, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          assetId,
          "creacion",
          null,
          holderUserId,
          "Activo registrado en el sistema.",
          getPeruISOString()
        )
        .run();
    } catch (error) {
      if (!isMissingTableError(error, "asset_movements")) {
        throw error;
      }
    }

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
      const allowedDocumentTypes = new Set((await getRecognitionDocumentTypesFromDb(db)).map((item) => item.code));
      const normalizedDocumentType = recognition?.documentType
        ? String(recognition.documentType).trim().toLowerCase()
        : null;
      const normalizedReferenceCode = recognition?.referenceCode
        ? String(recognition.referenceCode).trim()
        : null;
      const finalReferenceCode = normalizedReferenceCode || generatedCode;

      if (normalizedDocumentType && !allowedDocumentTypes.has(normalizedDocumentType)) {
        return NextResponse.json({ error: "Tipo de documento de reconocimiento inválido" }, { status: 400 });
      }

      await db
        .prepare(
          `INSERT INTO asset_recognitions (asset_id, issuer, issue_date, document_type, reference_code)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(
          assetId,
          recognition?.issuer || "No identificado",
          recognition?.issueDate ?? null,
          normalizedDocumentType,
          finalReferenceCode
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

        // 1. Upsert into global tags catalog (INSERT OR IGNORE keeps existing id)
        const existingTag = await db
          .prepare("SELECT id FROM tags WHERE tag = ?")
          .bind(tag)
          .first<{ id: string }>();

        let tagId: string;
        if (existingTag?.id) {
          tagId = existingTag.id;
        } else {
          tagId = crypto.randomUUID();
          await db
            .prepare("INSERT OR IGNORE INTO tags (id, tag) VALUES (?, ?)")
            .bind(tagId, tag)
            .run();
        }

        // 2. Link tag to this asset (ignore if already linked)
        await db
          .prepare("INSERT OR IGNORE INTO asset_tag_map (asset_id, tag_id) VALUES (?, ?)")
          .bind(assetId, tagId)
          .run();
      }
    }

    return NextResponse.json({
      success: true,
      assetId,
      assetCode: assetIdentifier,
      status: finalStatus,
      holderName: holderDisplayName,
      referenceCode:
        assetType === "reconocimiento"
          ? ((recognition?.referenceCode && String(recognition.referenceCode).trim()) || generatedCode)
          : null,
    });
  } catch (error: any) {
    console.error("Error creating asset:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
