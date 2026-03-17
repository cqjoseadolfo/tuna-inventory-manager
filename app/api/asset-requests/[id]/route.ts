import { NextResponse } from "next/server";
import { getDbBinding, isMissingTableError } from "@/app/lib/db";
import { getPeruISOString } from "@/app/lib/time";

export const runtime = "edge";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const requestId = String(params?.id || "").trim();
    const body = await request.json();
    const action = String(body?.action || "").trim().toLowerCase();
    const actingUserEmail = String(body?.actingUserEmail || "").trim().toLowerCase();

    if (!requestId || !action || !actingUserEmail) {
      return NextResponse.json({ error: "id, action y actingUserEmail son requeridos" }, { status: 400 });
    }

    if (!["accept", "reject", "cancel", "mark-read", "confirm-receipt"].includes(action)) {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    const db = getDbBinding();
    const actingUser = await db
      .prepare("SELECT id FROM users WHERE LOWER(email) = ?")
      .bind(actingUserEmail)
      .first<{ id: string }>();

    if (!actingUser?.id) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    let assetRequest: any;
    try {
      assetRequest = await db
        .prepare(
          `SELECT id, asset_id, requester_user_id, current_holder_user_id, status, requester_read_at, holder_read_at
           FROM asset_requests
           WHERE id = ?`
        )
        .bind(requestId)
        .first<any>();
    } catch (error) {
      if (isMissingTableError(error, "asset_requests")) {
        return NextResponse.json(
          { error: "Falta la migración de solicitudes/movimientos en D1. Ejecuta el SQL correspondiente." },
          { status: 500 }
        );
      }
      throw error;
    }

    if (!assetRequest?.id) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    if (action === "mark-read") {
      if (assetRequest.current_holder_user_id === actingUser.id) {
        await db
          .prepare("UPDATE asset_requests SET holder_read_at = ? WHERE id = ?")
          .bind(getPeruISOString(), requestId)
          .run();
        return NextResponse.json({ success: true });
      }

      if (assetRequest.requester_user_id === actingUser.id) {
        await db
          .prepare("UPDATE asset_requests SET requester_read_at = ? WHERE id = ?")
          .bind(getPeruISOString(), requestId)
          .run();
        return NextResponse.json({ success: true });
      }

      return NextResponse.json({ error: "No autorizado para marcar esta notificación" }, { status: 403 });
    }

    if (action === "confirm-receipt") {
      if (assetRequest.status !== "aceptada") {
        return NextResponse.json({ error: "Solo puedes confirmar recepciones aceptadas" }, { status: 409 });
      }

      if (assetRequest.requester_user_id !== actingUser.id) {
        return NextResponse.json({ error: "Solo el solicitante puede confirmar la recepción" }, { status: 403 });
      }

      const now = getPeruISOString();

      await db
        .prepare("UPDATE assets SET holder_user_id = ?, status = ? WHERE id = ?")
        .bind(assetRequest.requester_user_id, "en_uso", assetRequest.asset_id)
        .run();

      await db
        .prepare(
          `UPDATE asset_requests
           SET status = ?, requester_read_at = ?
           WHERE id = ?`
        )
        .bind("completada", now, requestId)
        .run();

      try {
        await db
          .prepare(
            `INSERT INTO asset_movements (id, asset_id, movement_type, from_user_id, to_user_id, request_id, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            crypto.randomUUID(),
            assetRequest.asset_id,
            "recepcion",
            assetRequest.current_holder_user_id,
            assetRequest.requester_user_id,
            requestId,
            "Recepción confirmada por el solicitante. Activo asumido por el nuevo responsable.",
            now
          )
          .run();
      } catch (error) {
        if (!isMissingTableError(error, "asset_movements")) {
          throw error;
        }
      }

      return NextResponse.json({ success: true });
    }

    if (action === "cancel") {
      if (assetRequest.status !== "pendiente") {
        return NextResponse.json({ error: "Solo puedes cancelar solicitudes pendientes" }, { status: 409 });
      }

      if (assetRequest.requester_user_id !== actingUser.id) {
        return NextResponse.json({ error: "Solo el solicitante puede cancelar esta solicitud" }, { status: 403 });
      }

      const now = getPeruISOString();
      await db
        .prepare(
          `UPDATE asset_requests
           SET status = ?, responded_at = ?, responded_by_user_id = ?, requester_read_at = ?, holder_read_at = holder_read_at
           WHERE id = ?`
        )
        .bind("cancelada", now, actingUser.id, now, requestId)
        .run();

      await db
        .prepare("UPDATE assets SET status = ? WHERE id = ?")
        .bind("en_uso", assetRequest.asset_id)
        .run();

      try {
        await db
          .prepare(
            `INSERT INTO asset_movements (id, asset_id, movement_type, from_user_id, to_user_id, request_id, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            crypto.randomUUID(),
            assetRequest.asset_id,
            "cancelacion",
            assetRequest.current_holder_user_id,
            assetRequest.requester_user_id,
            requestId,
            "Solicitud cancelada por el solicitante.",
            now
          )
          .run();
      } catch (error) {
        if (!isMissingTableError(error, "asset_movements")) {
          throw error;
        }
      }

      return NextResponse.json({ success: true });
    }

    if (assetRequest.status !== "pendiente") {
      return NextResponse.json({ error: "La solicitud ya fue procesada" }, { status: 409 });
    }

    if (assetRequest.current_holder_user_id !== actingUser.id) {
      return NextResponse.json({ error: "Solo el responsable actual puede procesar esta solicitud" }, { status: 403 });
    }

    const now = getPeruISOString();

    await db
      .prepare(
        `UPDATE asset_requests
         SET status = ?, responded_at = ?, responded_by_user_id = ?, holder_read_at = ?, requester_read_at = NULL
         WHERE id = ?`
      )
      .bind(action === "accept" ? "aceptada" : "rechazada", now, actingUser.id, now, requestId)
      .run();

    if (action === "accept") {
      await db
        .prepare("UPDATE assets SET status = ? WHERE id = ?")
        .bind("pendiente_recepcion", assetRequest.asset_id)
        .run();

      try {
        await db
          .prepare(
            `INSERT INTO asset_movements (id, asset_id, movement_type, from_user_id, to_user_id, request_id, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            crypto.randomUUID(),
            assetRequest.asset_id,
            "aprobacion_traspaso",
            assetRequest.current_holder_user_id,
            assetRequest.requester_user_id,
            requestId,
            "Solicitud aceptada por el responsable actual. Pendiente de recepción del solicitante.",
            now
          )
          .run();
      } catch (error) {
        if (!isMissingTableError(error, "asset_movements")) {
          throw error;
        }
      }
    } else {
      await db
        .prepare("UPDATE assets SET status = ? WHERE id = ?")
        .bind("en_uso", assetRequest.asset_id)
        .run();

      try {
        await db
          .prepare(
            `INSERT INTO asset_movements (id, asset_id, movement_type, from_user_id, to_user_id, request_id, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            crypto.randomUUID(),
            assetRequest.asset_id,
            "rechazo",
            assetRequest.current_holder_user_id,
            assetRequest.requester_user_id,
            requestId,
            "Solicitud rechazada por el responsable actual.",
            now
          )
          .run();
      } catch (error) {
        if (!isMissingTableError(error, "asset_movements")) {
          throw error;
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}