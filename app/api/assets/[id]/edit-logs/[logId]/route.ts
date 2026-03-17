import { NextResponse } from "next/server";
import { getDbBinding, isMissingTableError } from "@/app/lib/db";

export const runtime = "edge";

export async function GET(_req: Request, { params }: { params: { id: string; logId: string } }) {
  try {
    const assetId = String(params?.id || "").trim();
    const logId = String(params?.logId || "").trim();

    if (!assetId || !logId) {
      return NextResponse.json({ error: "ID de activo y log son requeridos" }, { status: 400 });
    }

    const db = getDbBinding();

    const asset = await db
      .prepare(
        `SELECT
          a.id,
          a.asset_type,
          a.name,
          a.status,
          a.notes,
          a.photo_url,
          a.fabrication_year,
          a.current_value,
          holder.nickname AS holder_nickname,
          holder.full_name AS holder_name,
          holder.email AS holder_email,
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
         FROM assets a
         LEFT JOIN users holder ON holder.id = a.holder_user_id
         LEFT JOIN asset_instruments i ON i.asset_id = a.id
         LEFT JOIN asset_recognitions r ON r.asset_id = a.id
         LEFT JOIN asset_uniforms u ON u.asset_id = a.id
         WHERE a.id = ?
         LIMIT 1`
      )
      .bind(assetId)
      .first<any>();

    if (!asset?.id) {
      return NextResponse.json({ error: "Activo no encontrado" }, { status: 404 });
    }

    let log: any = null;
    try {
      log = await db
        .prepare(
          `SELECT
            l.id,
            l.asset_id,
            l.field_name,
            l.old_value,
            l.new_value,
            l.edited_at,
            editor.nickname AS editor_nickname,
            editor.full_name AS editor_name,
            editor.email AS editor_email
           FROM asset_field_edit_logs l
           LEFT JOIN users editor ON editor.id = l.edited_by_user_id
           WHERE l.id = ? AND l.asset_id = ?
           LIMIT 1`
        )
        .bind(logId, assetId)
        .first<any>();
    } catch (error) {
      if (isMissingTableError(error, "asset_field_edit_logs")) {
        return NextResponse.json({ error: "Falta la migración de logs de edición de activos en D1." }, { status: 500 });
      }
      throw error;
    }

    if (!log?.id) {
      return NextResponse.json({ error: "Cambio no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ asset, log });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error interno" }, { status: 500 });
  }
}