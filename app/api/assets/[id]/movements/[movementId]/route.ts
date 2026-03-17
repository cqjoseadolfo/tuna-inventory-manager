import { NextResponse } from "next/server";
import { getDbBinding, isMissingTableError } from "@/app/lib/db";

export const runtime = "edge";

export async function GET(_req: Request, { params }: { params: { id: string; movementId: string } }) {
  try {
    const assetId = String(params?.id || "").trim();
    const movementId = String(params?.movementId || "").trim();

    if (!assetId || !movementId) {
      return NextResponse.json({ error: "ID de activo y movimiento son requeridos" }, { status: 400 });
    }

    const db = getDbBinding();

    const asset = await db
      .prepare(
        `SELECT
          a.id,
          a.name,
          a.status,
          holder.nickname AS holder_nickname,
          holder.full_name AS holder_name,
          holder.email AS holder_email
         FROM assets a
         LEFT JOIN users holder ON holder.id = a.holder_user_id
         WHERE a.id = ?
         LIMIT 1`
      )
      .bind(assetId)
      .first<any>();

    if (!asset?.id) {
      return NextResponse.json({ error: "Activo no encontrado" }, { status: 404 });
    }

    let movement: any = null;
    try {
      movement = await db
        .prepare(
          `SELECT
            m.id,
            m.asset_id,
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
           WHERE m.id = ? AND m.asset_id = ?
           LIMIT 1`
        )
        .bind(movementId, assetId)
        .first<any>();
    } catch (error) {
      if (isMissingTableError(error, "asset_movements")) {
        return NextResponse.json({ error: "Falta la migración de movimientos de activos en D1." }, { status: 500 });
      }
      throw error;
    }

    if (!movement?.id) {
      return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ asset, movement });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error interno" }, { status: 500 });
  }
}