import { NextResponse } from "next/server";
import { getDbBinding, isMissingTableError } from "@/app/lib/db";
import { getPeruISOString } from "@/app/lib/time";
import { sendPendingActionEmail } from "@/app/lib/email";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = String(searchParams.get("userEmail") || "").trim().toLowerCase();

    if (!userEmail) {
      return NextResponse.json({ error: "userEmail es requerido" }, { status: 400 });
    }

    const db = getDbBinding();
    const user = await db
      .prepare("SELECT id FROM users WHERE LOWER(email) = ?")
      .bind(userEmail)
      .first<{ id: string }>();

    if (!user?.id) {
      return NextResponse.json({ incoming: [], outgoing: [], unreadIncomingCount: 0, unreadOutgoingCount: 0, featureReady: true });
    }

    let incoming: any[] = [];
    let outgoing: any[] = [];
    let unreadIncomingCount = 0;
    let unreadOutgoingCount = 0;

    try {
      const incomingRows = await db
        .prepare(
          `SELECT
            ar.id,
            ar.asset_id,
            ar.status,
            ar.created_at,
            ar.holder_read_at,
            a.name AS asset_name,
            a.asset_type,
            a.photo_url,
            req.nickname AS requester_nickname,
            req.full_name AS requester_name,
            req.email AS requester_email
          FROM asset_requests ar
          JOIN assets a ON a.id = ar.asset_id
          JOIN users req ON req.id = ar.requester_user_id
          WHERE ar.current_holder_user_id = ? AND ar.status = 'pendiente'
          ORDER BY ar.created_at DESC`
        )
        .bind(user.id)
        .all();

      incoming = (Array.isArray((incomingRows as any)?.results) ? (incomingRows as any).results : []).map((item: any) => ({
        ...item,
        isUnread: !item.holder_read_at,
      }));
      unreadIncomingCount = incoming.filter((item) => item.isUnread).length;

      const outgoingRows = await db
        .prepare(
          `SELECT
            ar.id,
            ar.asset_id,
            ar.status,
            ar.created_at,
            ar.requester_read_at,
            a.name AS asset_name,
            a.asset_type,
            a.photo_url,
            holder.nickname AS holder_nickname,
            holder.full_name AS holder_name,
            holder.email AS holder_email
          FROM asset_requests ar
          JOIN assets a ON a.id = ar.asset_id
          JOIN users holder ON holder.id = ar.current_holder_user_id
          WHERE ar.requester_user_id = ?
          ORDER BY ar.created_at DESC`
        )
        .bind(user.id)
        .all();

      outgoing = (Array.isArray((outgoingRows as any)?.results) ? (outgoingRows as any).results : []).map((item: any) => ({
        ...item,
        isUnread: item.status !== "pendiente" && !item.requester_read_at,
      }));
      unreadOutgoingCount = outgoing.filter((item) => item.isUnread).length;
    } catch (error) {
      if (isMissingTableError(error, "asset_requests")) {
        return NextResponse.json({ incoming: [], outgoing: [], unreadIncomingCount: 0, unreadOutgoingCount: 0, featureReady: false });
      }
      throw error;
    }

    return NextResponse.json({ incoming, outgoing, unreadIncomingCount, unreadOutgoingCount, featureReady: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const assetId = String(body?.assetId || "").trim();
    const requesterEmail = String(body?.requesterEmail || "").trim().toLowerCase();

    if (!assetId || !requesterEmail) {
      return NextResponse.json({ error: "assetId y requesterEmail son requeridos" }, { status: 400 });
    }

    const db = getDbBinding();
    const requester = await db
      .prepare("SELECT id, nickname, full_name, email FROM users WHERE LOWER(email) = ?")
      .bind(requesterEmail)
      .first<any>();

    if (!requester?.id) {
      return NextResponse.json({ error: "Solicitante no encontrado" }, { status: 404 });
    }

    const asset = await db
      .prepare(
        `SELECT a.id, a.name, a.holder_user_id, a.status,
                holder.email AS holder_email,
                holder.nickname AS holder_nickname,
                holder.full_name AS holder_name
         FROM assets a
         LEFT JOIN users holder ON holder.id = a.holder_user_id
         WHERE id = ?`
      )
      .bind(assetId)
      .first<any>();

    if (!asset?.id) {
      return NextResponse.json({ error: "Activo no encontrado" }, { status: 404 });
    }

    if (!asset.holder_user_id) {
      return NextResponse.json({ error: "El activo no tiene un responsable asignado" }, { status: 400 });
    }

    if (asset.holder_user_id === requester.id) {
      return NextResponse.json({ error: "No puedes solicitar un activo que ya está bajo tu responsabilidad" }, { status: 400 });
    }

    try {
      const pendingRequest = await db
        .prepare(
          `SELECT id
           FROM asset_requests
           WHERE asset_id = ? AND status = 'pendiente'
           LIMIT 1`
        )
        .bind(assetId)
        .first<{ id: string }>();

      if (pendingRequest?.id) {
        return NextResponse.json({ error: "Ya existe una solicitud pendiente para este activo" }, { status: 409 });
      }
    } catch (error) {
      if (isMissingTableError(error, "asset_requests")) {
        return NextResponse.json(
          { error: "Falta la migración de solicitudes/movimientos en D1. Ejecuta el SQL correspondiente." },
          { status: 500 }
        );
      }
      throw error;
    }

    const requestId = crypto.randomUUID();
    const now = getPeruISOString();

    await db
      .prepare(
          `INSERT INTO asset_requests (id, asset_id, requester_user_id, current_holder_user_id, status, created_at, holder_read_at, requester_read_at)
          VALUES (?, ?, ?, ?, 'pendiente', ?, NULL, ?)`
      )
        .bind(requestId, assetId, requester.id, asset.holder_user_id, now, now)
      .run();

    await db
      .prepare("UPDATE assets SET status = ? WHERE id = ?")
      .bind("solicitado", assetId)
      .run();

    try {
      if (asset.holder_email) {
        await sendPendingActionEmail({
          toEmail: String(asset.holder_email),
          toName: String(asset.holder_nickname || asset.holder_name || "").trim() || null,
          assetName: String(asset.name || "Activo"),
          actionTitle: "Revisar nueva solicitud",
          actionDetail: `${requester.nickname || requester.full_name || requester.email} ha solicitado este activo.`,
        });
      }
    } catch (error) {
      console.error("No se pudo enviar correo de solicitud pendiente:", error);
    }

    try {
      await db
        .prepare(
          `INSERT INTO asset_movements (id, asset_id, movement_type, from_user_id, to_user_id, request_id, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          assetId,
          "solicitud",
          asset.holder_user_id,
          requester.id,
          requestId,
          `Solicitud enviada para el activo ${asset.name}`,
          now
        )
        .run();
    } catch (error) {
      if (!isMissingTableError(error, "asset_movements")) {
        throw error;
      }
    }

    return NextResponse.json({ success: true, requestId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}