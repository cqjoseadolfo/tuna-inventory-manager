import { NextResponse } from "next/server";
import { getDbBinding, isMissingTableError } from "@/app/lib/db";

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
          a.created_by_user_id AS creator_user_id,
          a.holder_user_id AS holder_user_id,
          creator.nickname  AS creator_nickname,
          creator.full_name AS creator_name,
          creator.email     AS creator_email,
          holder.nickname  AS holder_nickname,
          holder.full_name AS holder_name,
          holder.email     AS holder_email,
          holder.picture   AS holder_picture,
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
        LEFT JOIN users creator ON creator.id = a.created_by_user_id
        LEFT JOIN users holder ON holder.id = a.holder_user_id
        LEFT JOIN asset_instruments i ON i.asset_id = a.id
        LEFT JOIN asset_recognitions r ON r.asset_id = a.id
        LEFT JOIN asset_uniforms u ON u.asset_id = a.id
        LEFT JOIN asset_tag_map atm ON atm.asset_id = a.id
        LEFT JOIN tags tg ON tg.id = atm.tag_id
        WHERE a.id = ?
        GROUP BY a.id`
      )
      .bind(id)
      .first();

    if (!asset) return NextResponse.json({ error: "Activo no encontrado" }, { status: 404 });

    let movements: any[] = [];
    let pendingRequest: any = null;

    try {
      const movementRows = await db
        .prepare(
          `SELECT
            m.id,
            m.movement_type,
            m.notes,
            m.created_at,
            from_usr.nickname AS from_nickname,
            from_usr.full_name AS from_name,
            from_usr.email AS from_email,
            to_usr.nickname AS to_nickname,
            to_usr.full_name AS to_name,
            to_usr.email AS to_email
          FROM asset_movements m
          LEFT JOIN users from_usr ON from_usr.id = m.from_user_id
          LEFT JOIN users to_usr ON to_usr.id = m.to_user_id
          WHERE m.asset_id = ?
          ORDER BY m.created_at DESC`
        )
        .bind(id)
        .all();

      movements = Array.isArray((movementRows as any)?.results) ? (movementRows as any).results : [];
    } catch (error) {
      if (!isMissingTableError(error, "asset_movements")) {
        throw error;
      }
    }

    try {
      pendingRequest = await db
        .prepare(
          `SELECT
            ar.id,
            ar.status,
            ar.created_at,
            ar.requester_user_id,
            ar.holder_read_at,
            ar.requester_read_at,
            req.nickname AS requester_nickname,
            req.full_name AS requester_name,
            req.email AS requester_email
          FROM asset_requests ar
          JOIN users req ON req.id = ar.requester_user_id
          WHERE ar.asset_id = ? AND ar.status = 'pendiente'
          ORDER BY ar.created_at DESC
          LIMIT 1`
        )
        .bind(id)
        .first();
    } catch (error) {
      if (!isMissingTableError(error, "asset_requests")) {
        throw error;
      }
    }

    return NextResponse.json({
      ...asset,
      tags: asset.tags ? String(asset.tags).split(",").filter(Boolean) : [],
      movements,
      pendingRequest,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
