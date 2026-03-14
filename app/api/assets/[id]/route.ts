import { NextResponse } from "next/server";
import { getDbBinding } from "@/app/lib/db";

export const runtime = "edge";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const db = getDbBinding();

    const asset = await db
      .prepare(
        `SELECT
          a.id,
          a.asset_type,
          a.name,
          a.photo_url,
          a.fabrication_year,
          a.current_value,
          a.status,
          a.notes,
          a.created_at,
          usr.nickname  AS holder_nickname,
          usr.full_name AS holder_name,
          usr.email     AS holder_email,
          usr.picture   AS holder_picture,
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
        WHERE a.id = ?
        GROUP BY a.id`
      )
      .bind(id)
      .first();

    if (!asset) return NextResponse.json({ error: "Activo no encontrado" }, { status: 404 });

    return NextResponse.json({
      ...asset,
      tags: asset.tags ? String(asset.tags).split(",").filter(Boolean) : [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
