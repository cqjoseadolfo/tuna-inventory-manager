import { NextResponse } from "next/server";
import { getDbBinding, isMissingTableError } from "@/app/lib/db";
import { getPeruISOString } from "@/app/lib/time";
import { getAssetStatusesFromDb, normalizeStatusCode, updateAssetStatusWithFallback } from "@/app/lib/assetStatus";

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
    let editLogs: any[] = [];
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
      const editRows = await db
        .prepare(
          `SELECT
            l.id,
            l.field_name,
            l.old_value,
            l.new_value,
            l.edited_at,
            editor.nickname AS editor_nickname,
            editor.full_name AS editor_name,
            editor.email AS editor_email
          FROM asset_field_edit_logs l
          LEFT JOIN users editor ON editor.id = l.edited_by_user_id
          WHERE l.asset_id = ?
          ORDER BY l.edited_at DESC`
        )
        .bind(id)
        .all();

      editLogs = Array.isArray((editRows as any)?.results) ? (editRows as any).results : [];
    } catch (error) {
      if (!isMissingTableError(error, "asset_field_edit_logs")) {
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
      editLogs,
      pendingRequest,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const assetId = String(params?.id || "").trim();
    if (!assetId) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const body = await request.json();
    const actingUserEmail = String(body?.actingUserEmail || "").trim().toLowerCase();
    if (!actingUserEmail) {
      return NextResponse.json({ error: "actingUserEmail es requerido" }, { status: 400 });
    }

    const db = getDbBinding();
    const actingUser = await db
      .prepare("SELECT id FROM users WHERE LOWER(email) = ?")
      .bind(actingUserEmail)
      .first<{ id: string }>();

    if (!actingUser?.id) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const asset = await db
      .prepare(
        `SELECT id, asset_type, holder_user_id, name, photo_url, fabrication_year, current_value, status, notes
         FROM assets
         WHERE id = ?`
      )
      .bind(assetId)
      .first<any>();

    if (!asset?.id) {
      return NextResponse.json({ error: "Activo no encontrado" }, { status: 404 });
    }

    const pendingReceptionRequest = await db
      .prepare(
        `SELECT id
         FROM asset_requests
         WHERE asset_id = ? AND requester_user_id = ? AND status = 'aceptada'
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .bind(assetId, actingUser.id)
      .first<{ id: string }>();

    const canEditAsCurrentHolder = asset.holder_user_id === actingUser.id;
    const canEditAsPendingReceiver = !!pendingReceptionRequest?.id;

    if (!canEditAsCurrentHolder && !canEditAsPendingReceiver) {
      return NextResponse.json({ error: "Solo el responsable actual o receptor pendiente puede editar este activo" }, { status: 403 });
    }

    const now = getPeruISOString();
    const changes: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];

    const normalizeString = (value: unknown) => {
      if (value === null || value === undefined) return null;
      const parsed = String(value).trim();
      return parsed.length ? parsed : null;
    };

    const normalizeNumber = (value: unknown) => {
      if (value === null || value === undefined || value === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const registerChange = (field: string, oldValue: unknown, newValue: unknown) => {
      const oldNorm = oldValue === null || oldValue === undefined ? null : String(oldValue);
      const newNorm = newValue === null || newValue === undefined ? null : String(newValue);
      if (oldNorm === newNorm) return;
      changes.push({ field, oldValue: oldNorm, newValue: newNorm });
    };

    const nextName = normalizeString(body?.name);
    if (nextName !== null && nextName !== asset.name) {
      await db.prepare("UPDATE assets SET name = ? WHERE id = ?").bind(nextName, assetId).run();
      registerChange("name", asset.name, nextName);
      asset.name = nextName;
    }

    const nextPhotoUrl = normalizeString(body?.photoUrl);
    if (nextPhotoUrl !== null && nextPhotoUrl !== asset.photo_url) {
      await db.prepare("UPDATE assets SET photo_url = ? WHERE id = ?").bind(nextPhotoUrl, assetId).run();
      registerChange("photo_url", asset.photo_url, nextPhotoUrl);
      asset.photo_url = nextPhotoUrl;
    }

    if (Object.prototype.hasOwnProperty.call(body, "fabricationYear")) {
      const nextFabricationYear = normalizeNumber(body?.fabricationYear);
      if (nextFabricationYear !== asset.fabrication_year) {
        await db.prepare("UPDATE assets SET fabrication_year = ? WHERE id = ?").bind(nextFabricationYear, assetId).run();
        registerChange("fabrication_year", asset.fabrication_year, nextFabricationYear);
        asset.fabrication_year = nextFabricationYear;
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "currentValue")) {
      const nextCurrentValue = normalizeNumber(body?.currentValue);
      if (nextCurrentValue !== asset.current_value) {
        await db.prepare("UPDATE assets SET current_value = ? WHERE id = ?").bind(nextCurrentValue, assetId).run();
        registerChange("current_value", asset.current_value, nextCurrentValue);
        asset.current_value = nextCurrentValue;
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "status")) {
      const catalog = await getAssetStatusesFromDb(db);
      const allowedStatuses = new Set(catalog.map((item) => item.code));
      const nextStatus = normalizeStatusCode(String(body?.status || ""));
      if (nextStatus && allowedStatuses.has(nextStatus) && nextStatus !== asset.status) {
        await db.prepare("UPDATE assets SET status = ? WHERE id = ?").bind(nextStatus, assetId).run();
        registerChange("status", asset.status, nextStatus);
        asset.status = nextStatus;
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "notes")) {
      const nextNotes = normalizeString(body?.notes);
      if (nextNotes !== asset.notes) {
        await db.prepare("UPDATE assets SET notes = ? WHERE id = ?").bind(nextNotes, assetId).run();
        registerChange("notes", asset.notes, nextNotes);
        asset.notes = nextNotes;
      }
    }

    if (asset.asset_type === "instrumento") {
      const current = await db
        .prepare("SELECT instrument_type, brand FROM asset_instruments WHERE asset_id = ?")
        .bind(assetId)
        .first<any>();

      const nextInstrumentType = Object.prototype.hasOwnProperty.call(body, "instrumentType") ? normalizeString(body?.instrumentType) : current?.instrument_type ?? null;
      const nextBrand = Object.prototype.hasOwnProperty.call(body, "brand") ? normalizeString(body?.brand) : current?.brand ?? null;

      if (!current) {
        await db
          .prepare("INSERT INTO asset_instruments (asset_id, instrument_type, brand) VALUES (?, ?, ?)")
          .bind(assetId, nextInstrumentType, nextBrand)
          .run();
      } else {
        await db
          .prepare("UPDATE asset_instruments SET instrument_type = ?, brand = ? WHERE asset_id = ?")
          .bind(nextInstrumentType, nextBrand, assetId)
          .run();
      }

      if (Object.prototype.hasOwnProperty.call(body, "instrumentType")) {
        registerChange("instrument_type", current?.instrument_type ?? null, nextInstrumentType);
      }
      if (Object.prototype.hasOwnProperty.call(body, "brand")) {
        registerChange("brand", current?.brand ?? null, nextBrand);
      }
    }

    if (asset.asset_type === "reconocimiento") {
      const current = await db
        .prepare("SELECT issuer, issue_date, document_type, reference_code FROM asset_recognitions WHERE asset_id = ?")
        .bind(assetId)
        .first<any>();

      const nextIssuer = Object.prototype.hasOwnProperty.call(body, "issuer") ? normalizeString(body?.issuer) : current?.issuer ?? null;
      const nextIssueDate = Object.prototype.hasOwnProperty.call(body, "issueDate") ? normalizeString(body?.issueDate) : current?.issue_date ?? null;
      const nextDocumentType = Object.prototype.hasOwnProperty.call(body, "documentType") ? normalizeString(body?.documentType) : current?.document_type ?? null;
      const hasReferenceCode =
        Object.prototype.hasOwnProperty.call(body, "referenceCode") ||
        Object.prototype.hasOwnProperty.call(body, "reference_code");
      const nextReferenceCode = hasReferenceCode
        ? normalizeString(body?.referenceCode ?? body?.reference_code)
        : current?.reference_code ?? null;

      if (!current) {
        await db
          .prepare("INSERT INTO asset_recognitions (asset_id, issuer, issue_date, document_type, reference_code) VALUES (?, ?, ?, ?, ?)")
          .bind(assetId, nextIssuer, nextIssueDate, nextDocumentType, nextReferenceCode)
          .run();
      } else {
        await db
          .prepare("UPDATE asset_recognitions SET issuer = ?, issue_date = ?, document_type = ?, reference_code = ? WHERE asset_id = ?")
          .bind(nextIssuer, nextIssueDate, nextDocumentType, nextReferenceCode, assetId)
          .run();
      }

      if (Object.prototype.hasOwnProperty.call(body, "issuer")) registerChange("issuer", current?.issuer ?? null, nextIssuer);
      if (Object.prototype.hasOwnProperty.call(body, "issueDate")) registerChange("issue_date", current?.issue_date ?? null, nextIssueDate);
      if (Object.prototype.hasOwnProperty.call(body, "documentType")) registerChange("document_type", current?.document_type ?? null, nextDocumentType);
      if (hasReferenceCode) registerChange("reference_code", current?.reference_code ?? null, nextReferenceCode);
    }

    if (asset.asset_type === "uniforme") {
      const current = await db
        .prepare("SELECT size, has_cinta, has_jubon, has_greguesco FROM asset_uniforms WHERE asset_id = ?")
        .bind(assetId)
        .first<any>();

      const nextSize = Object.prototype.hasOwnProperty.call(body, "size") ? normalizeString(body?.size) : current?.size ?? null;
      const nextHasCinta = Object.prototype.hasOwnProperty.call(body, "hasCinta") ? (body?.hasCinta ? 1 : 0) : (current?.has_cinta ?? 0);
      const nextHasJubon = Object.prototype.hasOwnProperty.call(body, "hasJubon") ? (body?.hasJubon ? 1 : 0) : (current?.has_jubon ?? 0);
      const nextHasGreguesco = Object.prototype.hasOwnProperty.call(body, "hasGreguesco") ? (body?.hasGreguesco ? 1 : 0) : (current?.has_greguesco ?? 0);

      if (!current) {
        await db
          .prepare("INSERT INTO asset_uniforms (asset_id, size, has_cinta, has_jubon, has_greguesco) VALUES (?, ?, ?, ?, ?)")
          .bind(assetId, nextSize, nextHasCinta, nextHasJubon, nextHasGreguesco)
          .run();
      } else {
        await db
          .prepare("UPDATE asset_uniforms SET size = ?, has_cinta = ?, has_jubon = ?, has_greguesco = ? WHERE asset_id = ?")
          .bind(nextSize, nextHasCinta, nextHasJubon, nextHasGreguesco, assetId)
          .run();
      }

      if (Object.prototype.hasOwnProperty.call(body, "size")) registerChange("size", current?.size ?? null, nextSize);
      if (Object.prototype.hasOwnProperty.call(body, "hasCinta")) registerChange("has_cinta", current?.has_cinta ?? 0, nextHasCinta);
      if (Object.prototype.hasOwnProperty.call(body, "hasJubon")) registerChange("has_jubon", current?.has_jubon ?? 0, nextHasJubon);
      if (Object.prototype.hasOwnProperty.call(body, "hasGreguesco")) registerChange("has_greguesco", current?.has_greguesco ?? 0, nextHasGreguesco);
    }

    if (Array.isArray(body?.tags)) {
      const normalizeTag = (value: string) => {
        const trimmed = String(value || "").trim().toLowerCase();
        if (!trimmed) return null;
        return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
      };

      const nextTags = Array.from(new Set(body.tags.map((tag: string) => normalizeTag(tag)).filter(Boolean) as string[])).sort();
      const currentRows = await db
        .prepare(
          `SELECT tg.tag
           FROM asset_tag_map atm
           JOIN tags tg ON tg.id = atm.tag_id
           WHERE atm.asset_id = ?`
        )
        .bind(assetId)
        .all();

      const currentTags = Array.from(new Set((Array.isArray((currentRows as any)?.results) ? (currentRows as any).results : []).map((row: any) => String(row.tag || "").trim().toLowerCase()).filter(Boolean))).sort();

      if (JSON.stringify(currentTags) !== JSON.stringify(nextTags)) {
        await db.prepare("DELETE FROM asset_tag_map WHERE asset_id = ?").bind(assetId).run();

        for (const tag of nextTags) {
          const existingTag = await db.prepare("SELECT id FROM tags WHERE tag = ?").bind(tag).first<{ id: string }>();
          const tagId = existingTag?.id || crypto.randomUUID();
          if (!existingTag?.id) {
            await db.prepare("INSERT INTO tags (id, tag) VALUES (?, ?)").bind(tagId, tag).run();
          }
          await db.prepare("INSERT INTO asset_tag_map (asset_id, tag_id) VALUES (?, ?)").bind(assetId, tagId).run();
        }

        registerChange("tags", currentTags.join(", "), nextTags.join(", "));
      }
    }

    if (changes.length === 0) {
      return NextResponse.json({ success: true, updated: false, changes: [] });
    }

    try {
      for (const change of changes) {
        await db
          .prepare(
            `INSERT INTO asset_field_edit_logs (id, asset_id, field_name, old_value, new_value, edited_by_user_id, edited_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(crypto.randomUUID(), assetId, change.field, change.oldValue, change.newValue, actingUser.id, now)
          .run();
      }
    } catch (error) {
      if (isMissingTableError(error, "asset_field_edit_logs")) {
        return NextResponse.json({ error: "Falta la migración de logs de edición de activos en D1." }, { status: 500 });
      }
      throw error;
    }

    if (canEditAsPendingReceiver) {
      await db
        .prepare("UPDATE assets SET holder_user_id = ? WHERE id = ?")
        .bind(actingUser.id, assetId)
        .run();
      await updateAssetStatusWithFallback(db, assetId, "en_uso");

      await db
        .prepare(
          `UPDATE asset_requests
           SET status = 'completada', requester_read_at = ?
           WHERE id = ?`
        )
        .bind(now, pendingReceptionRequest?.id)
        .run();

      try {
        await db
          .prepare(
            `INSERT INTO asset_movements (id, asset_id, movement_type, from_user_id, to_user_id, request_id, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            crypto.randomUUID(),
            assetId,
            "recepcion",
            asset.holder_user_id,
            actingUser.id,
            pendingReceptionRequest?.id || null,
            "Recepcion confirmada y activo asumido por el nuevo responsable.",
            now
          )
          .run();
      } catch (error) {
        if (!isMissingTableError(error, "asset_movements")) {
          throw error;
        }
      }
    }

    return NextResponse.json({ success: true, updated: true, changes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
