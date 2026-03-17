"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import AppHamburgerMenu from "@/components/AppHamburgerMenu";

type AssetType = "instrumento" | "reconocimiento" | "uniforme" | "otro";

interface AssetDetail {
  id: string;
  asset_type: AssetType;
  name: string;
  photo_url: string;
  fabrication_year: number | null;
  current_value: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  creator_user_id: string | null;
  creator_nickname?: string | null;
  creator_name?: string | null;
  creator_email?: string | null;
  holder_user_id: string | null;
  holder_nickname: string | null;
  holder_name: string | null;
  holder_email: string | null;
  holder_picture: string | null;
  instrument_type: string | null;
  brand: string | null;
  issuer: string | null;
  issue_date: string | null;
  document_type: string | null;
  reference_code: string | null;
  size: string | null;
  has_cinta: number | null;
  has_jubon: number | null;
  has_greguesco: number | null;
  tags: string[];
  movements: Array<{
    id: string;
    movement_type: string;
    notes: string | null;
    created_at: string;
    from_nickname: string | null;
    from_name: string | null;
    from_email: string | null;
    to_nickname: string | null;
    to_name: string | null;
    to_email: string | null;
  }>;
  movementPagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  pendingRequest?: {
    id: string;
    status: string;
    created_at: string;
    requester_user_id: string;
    holder_read_at?: string | null;
    requester_read_at?: string | null;
    requester_nickname: string | null;
    requester_name: string | null;
    requester_email: string | null;
  } | null;
  editLogs?: Array<{
    id: string;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    edited_at: string;
    editor_nickname: string | null;
    editor_name: string | null;
    editor_email: string | null;
  }>;
  editLogsPagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface EditFormState {
  name: string;
  photoUrl: string;
  fabricationYear: string;
  currentValue: string;
  status: string;
  notes: string;
  instrumentType: string;
  brand: string;
  issuer: string;
  issueDate: string;
  documentType: string;
  referenceCode: string;
  size: string;
  hasCinta: boolean;
  hasJubon: boolean;
  hasGreguesco: boolean;
  tagsInput: string;
}

const statusLabel: Record<string, string> = {
  en_uso: "En uso",
  mantenimiento: "Mantenimiento",
  baja: "Baja",
  disponible: "Disponible",
  solicitado: "Solicitado",
  pendiente_recepcion: "Pendiente de aceptar recepcion",
  bajo_responsabilidad: "En uso",
  en_reparacion: "Mantenimiento",
};

const typeLabel: Record<AssetType, string> = {
  instrumento: "Instrumento",
  reconocimiento: "Reconocimiento",
  uniforme: "Uniforme",
  otro: "Otro",
};

const typeEmoji: Record<AssetType, string> = {
  instrumento: "🎸",
  reconocimiento: "🏆",
  uniforme: "👘",
  otro: "📦",
};

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 min-w-0 font-semibold text-slate-800">{String(value)}</dd>
    </div>
  );
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestFeedback, setRequestFeedback] = useState("");
  const [isRequestSubmitting, setIsRequestSubmitting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editFeedback, setEditFeedback] = useState("");
  const [visibleMovementCount, setVisibleMovementCount] = useState(6);
  const [visibleEditLogCount, setVisibleEditLogCount] = useState(6);
  const [editForm, setEditForm] = useState<EditFormState>({
    name: "",
    photoUrl: "",
    fabricationYear: "",
    currentValue: "",
    status: "en_uso",
    notes: "",
    instrumentType: "",
    brand: "",
    issuer: "",
    issueDate: "",
    documentType: "",
    referenceCode: "",
    size: "",
    hasCinta: false,
    hasJubon: false,
    hasGreguesco: false,
    tagsInput: "",
  });

  const loadAsset = async () => {
    if (!id) return;
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (user?.email) {
        params.set("viewerEmail", user.email);
      }
      params.set("movementLimit", "20");
      params.set("movementOffset", "0");
      params.set("editLimit", "20");
      params.set("editOffset", "0");
      const query = params.toString();
      const response = await fetch(`/api/assets/${id}${query ? `?${query}` : ""}`);
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "No se pudo cargar el activo.");
      }
      setAsset(data);
      setVisibleMovementCount(6);
      setVisibleEditLogCount(6);
      setEditForm({
        name: data.name || "",
        photoUrl: data.photo_url || "",
        fabricationYear: data.fabrication_year !== null && data.fabrication_year !== undefined ? String(data.fabrication_year) : "",
        currentValue: data.current_value !== null && data.current_value !== undefined ? String(data.current_value) : "",
        status: data.status || "en_uso",
        notes: data.notes || "",
        instrumentType: data.instrument_type || "",
        brand: data.brand || "",
        issuer: data.issuer || "",
        issueDate: data.issue_date || "",
        documentType: data.document_type || "",
        referenceCode: data.reference_code || "",
        size: data.size || "",
        hasCinta: Boolean(data.has_cinta),
        hasJubon: Boolean(data.has_jubon),
        hasGreguesco: Boolean(data.has_greguesco),
        tagsInput: Array.isArray(data.tags) ? data.tags.join(", ") : "",
      });
    } catch (err: any) {
      setError(err.message || "No se pudo cargar el activo.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAsset();
  }, [id, user?.email]);

  useEffect(() => {
    if (searchParams.get("edit") === "1") {
      setIsEditModalOpen(true);
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-lime-500" />
      </main>
    );
  }

  if (error || !asset) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-3xl">😕</p>
          <h1 className="mt-3 text-xl font-black text-slate-900">Activo no encontrado</h1>
          <p className="mt-1 text-sm text-slate-500">{error || "No se pudo cargar el activo."}</p>
          <Link href="/" className="mt-4 inline-block font-semibold text-lime-600">← Volver al panel</Link>
        </div>
      </main>
    );
  }

  const holderDisplay = asset.holder_nickname || asset.holder_name || asset.holder_email || "—";
  const creatorDisplay = asset.creator_nickname || asset.creator_name || asset.creator_email || "—";
  const pendingRequesterDisplay =
    asset.pendingRequest?.requester_nickname ||
    asset.pendingRequest?.requester_name ||
    asset.pendingRequest?.requester_email ||
    "";
  const isHolder = !!user?.email && !!asset.holder_email && user.email.toLowerCase() === asset.holder_email.toLowerCase();
  const isRequester =
    !!user?.email &&
    !!asset.pendingRequest?.requester_email &&
    user.email.toLowerCase() === asset.pendingRequest.requester_email.toLowerCase();
  const createdAtLabel = asset.created_at
    ? new Date(asset.created_at).toLocaleString("es-PE", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  const movementItems = [
    {
      id: `created-${asset.id}`,
      type: "Creacion",
      description: "Activo registrado en el sistema.",
      date: createdAtLabel,
      sortDate: asset.created_at || "",
    },
    ...((asset.movements || [])
      .filter((movement) => movement.movement_type !== "creacion")
      .map((movement) => {
        const fromDisplay = movement.from_nickname || movement.from_name || movement.from_email || "sin responsable";
        const toDisplay = movement.to_nickname || movement.to_name || movement.to_email || "sin responsable";
        const typeMap: Record<string, string> = {
          solicitud: "Solicitud",
          traspaso: "Traspaso",
          aprobacion_traspaso: "Aprobación",
          recepcion: "Recepción",
          rechazo: "Rechazo",
          cancelacion: "Cancelación",
          edicion: "Edición",
        };
        const descriptionMap: Record<string, string> = {
          solicitud: `${toDisplay} solicitó este activo a ${fromDisplay}.`,
          traspaso: `${fromDisplay} cedió este activo a ${toDisplay}.`,
          aprobacion_traspaso: `${fromDisplay} aceptó la solicitud; pendiente recepción de ${toDisplay}.`,
          recepcion: `${toDisplay} confirmó recepción y asumió el activo.`,
          rechazo: `${fromDisplay} rechazó la solicitud de ${toDisplay}.`,
          cancelacion: `${toDisplay} canceló la solicitud de este activo.`,
          edicion: `Se editaron campos del activo por ${toDisplay}.`,
        };

        return {
          id: movement.id,
          type: typeMap[movement.movement_type] || movement.movement_type,
          description: movement.notes || descriptionMap[movement.movement_type] || "Movimiento registrado.",
          date: movement.created_at
            ? new Date(movement.created_at).toLocaleString("es-PE", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—",
          sortDate: movement.created_at || "",
        };
      })),
  ].sort((left, right) => new Date(right.sortDate).getTime() - new Date(left.sortDate).getTime());
  const movementVisibleLimit = Math.min(20, movementItems.length);
  const movementItemsVisible = movementItems.slice(0, visibleMovementCount);
  const canLoadMoreMovements = visibleMovementCount < movementVisibleLimit;

  const editLogsAll = Array.isArray(asset.editLogs) ? asset.editLogs : [];
  const editLogsVisibleLimit = Math.min(20, editLogsAll.length);
  const editLogsVisible = editLogsAll.slice(0, visibleEditLogCount);
  const canLoadMoreEditLogs = visibleEditLogCount < editLogsVisibleLimit;

  const handleRequestAsset = async () => {
    if (!user?.email || !asset) return;
    setIsRequestSubmitting(true);
    setRequestFeedback("");

    try {
      const response = await fetch("/api/asset-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: asset.id, requesterEmail: user.email }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "No se pudo registrar la solicitud.");
      }
      setRequestFeedback("Solicitud enviada al responsable actual.");
      await loadAsset();
    } catch (err: any) {
      setRequestFeedback(err.message || "No se pudo registrar la solicitud.");
    } finally {
      setIsRequestSubmitting(false);
    }
  };

  const handlePendingRequest = async (action: "accept" | "reject") => {
    if (!user?.email || !asset?.pendingRequest?.id) return;
    setIsRequestSubmitting(true);
    setRequestFeedback("");

    try {
      const response = await fetch(`/api/asset-requests/${asset.pendingRequest.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, actingUserEmail: user.email }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "No se pudo procesar la solicitud.");
      }
      setRequestFeedback(action === "accept" ? "Activo cedido correctamente." : "Solicitud rechazada.");
      await loadAsset();
    } catch (err: any) {
      setRequestFeedback(err.message || "No se pudo procesar la solicitud.");
    } finally {
      setIsRequestSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!user?.email || !asset?.pendingRequest?.id) return;
    setIsRequestSubmitting(true);
    setRequestFeedback("");

    try {
      const response = await fetch(`/api/asset-requests/${asset.pendingRequest.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", actingUserEmail: user.email }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "No se pudo cancelar la solicitud.");
      }
      setRequestFeedback("Solicitud cancelada.");
      await loadAsset();
    } catch (err: any) {
      setRequestFeedback(err.message || "No se pudo cancelar la solicitud.");
    } finally {
      setIsRequestSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!asset || !user?.email) return;
    setIsSavingEdit(true);
    setEditFeedback("");

    try {
      const tags = editForm.tagsInput
        .split(",")
        .map((item) => String(item || "").trim())
        .filter(Boolean);

      const payload: any = {
        actingUserEmail: user.email,
        name: editForm.name,
        photoUrl: editForm.photoUrl,
        fabricationYear: editForm.fabricationYear ? Number(editForm.fabricationYear) : null,
        currentValue: editForm.currentValue ? Number(editForm.currentValue) : null,
        status: editForm.status,
        notes: editForm.notes,
        tags,
      };

      if (asset.asset_type === "instrumento") {
        payload.instrumentType = editForm.instrumentType;
        payload.brand = editForm.brand;
      }

      if (asset.asset_type === "reconocimiento") {
        payload.issuer = editForm.issuer;
        payload.issueDate = editForm.issueDate;
        payload.documentType = editForm.documentType;
        payload.referenceCode = editForm.referenceCode;
        payload.reference_code = editForm.referenceCode;
      }

      if (asset.asset_type === "uniforme") {
        payload.size = editForm.size;
        payload.hasCinta = editForm.hasCinta;
        payload.hasJubon = editForm.hasJubon;
        payload.hasGreguesco = editForm.hasGreguesco;
      }

      const response = await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "No se pudo guardar la edición.");
      }

      setEditFeedback(data.updated ? "Cambios guardados correctamente." : "No hubo cambios para guardar.");
      await loadAsset();
      setIsEditModalOpen(false);
    } catch (editError: any) {
      setEditFeedback(editError?.message || "No se pudo guardar la edición.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full items-start justify-center px-4 py-6">
      <AppHamburgerMenu />
      <section className="w-full max-w-xl space-y-4">

        {/* Top nav */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-lime-600">
              {typeLabel[asset.asset_type]}
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">{asset.name}</h1>
            <Link href="/" className="mt-1 inline-block text-sm font-semibold text-slate-500 hover:text-slate-700">
              ← Volver al panel
            </Link>
          </div>
          <span className="text-5xl">{typeEmoji[asset.asset_type]}</span>
        </div>

        {/* Photo */}
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
          {asset.photo_url ? (
            <img src={asset.photo_url} alt="Foto del activo" className="h-64 w-full object-cover" />
          ) : (
            <div className="flex h-64 w-full items-center justify-center bg-slate-50 text-sm font-medium text-slate-400">
              Sin foto registrada
            </div>
          )}
        </div>

        {/* Main data */}
        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Ficha del activo</h2>
            {isHolder ? (
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Editar activo
              </button>
            ) : null}
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <DetailRow label="ID interno" value={asset.id} />
            <DetailRow label="Código" value={asset.name} />
            <DetailRow label="Estado" value={statusLabel[asset.status] || asset.status} />
            <DetailRow label="Creado por" value={creatorDisplay} />
            <DetailRow label="Responsable" value={holderDisplay} />
            {asset.holder_email ? (
              <div className="col-span-2 min-w-0 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Correo responsable</dt>
                <dd className="mt-0.5 truncate text-xs font-medium text-slate-700" title={asset.holder_email}>
                  {asset.holder_email}
                </dd>
              </div>
            ) : null}
            <DetailRow label="Tipo" value={typeLabel[asset.asset_type]} />
            <DetailRow label="Año de fabricación" value={asset.fabrication_year} />
            <DetailRow
              label="Valor actual"
              value={
                asset.current_value !== null && asset.current_value !== undefined
                  ? `S/ ${Number(asset.current_value).toFixed(2)}`
                  : "—"
              }
            />
            <DetailRow label="Fecha de creación" value={createdAtLabel} />
            {/* Instrument */}
            <DetailRow label="Instrumento" value={asset.instrument_type} />
            <DetailRow label="Marca" value={asset.brand} />
            {/* Recognition */}
            <DetailRow label="Emisor" value={asset.issuer} />
            <DetailRow label="Fecha de emisión" value={asset.issue_date} />
            <DetailRow label="Tipo de documento" value={asset.document_type} />
            <DetailRow label="Código de referencia" value={asset.reference_code} />
            {/* Uniform */}
            <DetailRow label="Talla" value={asset.size} />
            {asset.has_cinta || asset.has_jubon || asset.has_greguesco ? (
              <div className="col-span-2 flex flex-wrap gap-2">
                {asset.has_cinta ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">Cinta</span> : null}
                {asset.has_jubon ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">Jubón</span> : null}
                {asset.has_greguesco ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">Gregüesco</span> : null}
              </div>
            ) : null}
            {/* Notes */}
            {asset.notes && (
              <div className="col-span-2 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notas</dt>
                <dd className="mt-0.5 text-slate-700">{asset.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Solicitud del activo</h2>
              <p className="mt-1 text-sm text-slate-500">
                El responsable actual puede ceder el activo a otro integrante cuando exista una solicitud pendiente.
              </p>
            </div>

            {user ? (
              isHolder ? null : asset.pendingRequest ? (
                isRequester ? (
                  <button
                    type="button"
                    onClick={handleCancelRequest}
                    disabled={isRequestSubmitting}
                    className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    {isRequestSubmitting ? "Procesando..." : "Cancelar solicitud"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500 ring-1 ring-slate-200"
                  >
                    Activo con solicitud pendiente
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={handleRequestAsset}
                  disabled={isRequestSubmitting || !asset.holder_user_id}
                  className="rounded-2xl bg-lime-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-lime-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isRequestSubmitting ? "Enviando..." : "Solicitar"}
                </button>
              )
            ) : (
              <span className="text-sm font-medium text-slate-500">Inicia sesión para solicitar este activo.</span>
            )}
          </div>

          {asset.pendingRequest && (
            <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-4 ring-1 ring-amber-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Solicitud pendiente</p>
              <p className="mt-1 text-sm text-slate-700">
                {pendingRequesterDisplay} solicitó este activo.
              </p>
              {isHolder ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handlePendingRequest("accept")}
                    disabled={isRequestSubmitting}
                    className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isRequestSubmitting ? "Procesando..." : "Ceder activo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePendingRequest("reject")}
                    disabled={isRequestSubmitting}
                    className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    Rechazar
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {requestFeedback ? <p className="mt-3 text-sm text-slate-600">{requestFeedback}</p> : null}
          {editFeedback ? <p className="mt-2 text-sm text-slate-600">{editFeedback}</p> : null}
        </div>

        {/* Tags */}
        {asset.tags.length > 0 && (
          <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="mb-3 text-lg font-bold text-slate-900">Etiquetas</h2>
            <div className="flex flex-wrap gap-2">
              {asset.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Movement log */}
        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Registro de movimientos</h2>
          {movementItems.length > 0 ? (
            <>
              <ul className="space-y-3">
                {movementItemsVisible.map((movement) => (
                <li key={movement.id} className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-lime-700">{movement.type}</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{movement.description}</p>
                  <p className="mt-1 text-xs text-slate-500">{movement.date}</p>
                </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {canLoadMoreMovements ? (
                  <button
                    type="button"
                    onClick={() => setVisibleMovementCount(20)}
                    className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
                  >
                    Cargar más
                  </button>
                ) : null}
                {(asset.movementPagination?.hasMore || Number(asset.movementPagination?.total || 0) > 20) ? (
                  <Link
                    href={`/assets/${asset.id}/history`}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Ver histórico completo
                  </Link>
                ) : null}
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400 ring-1 ring-slate-100">
              Aun no hay movimientos registrados.
            </div>
          )}
        </div>

        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Historial de cambios</h2>
          {editLogsAll.length > 0 ? (
            <>
              <ul className="space-y-3">
                {editLogsVisible.map((logItem) => {
                const editor = logItem.editor_nickname || logItem.editor_name || logItem.editor_email || "Usuario";
                const dateLabel = logItem.edited_at
                  ? new Date(logItem.edited_at).toLocaleString("es-PE", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—";
                return (
                  <li key={logItem.id} className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                    <p className="text-xs font-semibold uppercase tracking-wide text-lime-700">Se cambió {logItem.field_name}</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {logItem.new_value || "(vacío)"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Por {editor} · {dateLabel}</p>
                  </li>
                );
                })}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {canLoadMoreEditLogs ? (
                  <button
                    type="button"
                    onClick={() => setVisibleEditLogCount(20)}
                    className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
                  >
                    Cargar más
                  </button>
                ) : null}
                {(asset.editLogsPagination?.hasMore || Number(asset.editLogsPagination?.total || 0) > 20) ? (
                  <Link
                    href={`/assets/${asset.id}/history`}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Ver histórico completo
                  </Link>
                ) : null}
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400 ring-1 ring-slate-100">
              Aún no hay cambios registrados.
            </div>
          )}
        </div>

        {isEditModalOpen ? (
          <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-slate-950/50 px-4 py-6" role="dialog" aria-modal="true">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white p-6 shadow-2xl ring-1 ring-slate-100">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-black text-slate-900">Editar activo</h3>
                <button type="button" className="rounded-full p-2 text-slate-500 hover:bg-slate-100" onClick={() => setIsEditModalOpen(false)}>✕</button>
              </div>

              <div className="mt-4 grid flex-1 gap-3 overflow-y-auto pr-2 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Código / nombre
                  <input value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  URL de foto
                  <input value={editForm.photoUrl} onChange={(e) => setEditForm((prev) => ({ ...prev, photoUrl: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Año de fabricación
                  <input type="number" value={editForm.fabricationYear} onChange={(e) => setEditForm((prev) => ({ ...prev, fabricationYear: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Valor actual
                  <input type="number" step="0.01" value={editForm.currentValue} onChange={(e) => setEditForm((prev) => ({ ...prev, currentValue: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Estado
                  <select value={editForm.status} onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2">
                    <option value="en_uso">En uso</option>
                    <option value="disponible">Disponible</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="baja">Baja</option>
                    <option value="solicitado">Solicitado</option>
                    <option value="pendiente_recepcion">Pendiente de aceptar recepción</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2">
                  Notas
                  <textarea rows={3} value={editForm.notes} onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2">
                  Etiquetas (separadas por coma)
                  <input value={editForm.tagsInput} onChange={(e) => setEditForm((prev) => ({ ...prev, tagsInput: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2" />
                </label>

                {asset.asset_type === "instrumento" ? (
                  <>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Tipo de instrumento
                      <input value={editForm.instrumentType} onChange={(e) => setEditForm((prev) => ({ ...prev, instrumentType: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2" />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Marca
                      <input value={editForm.brand} onChange={(e) => setEditForm((prev) => ({ ...prev, brand: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2" />
                    </label>
                  </>
                ) : null}

                {asset.asset_type === "reconocimiento" ? (
                  <>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Emisor
                      <input value={editForm.issuer} onChange={(e) => setEditForm((prev) => ({ ...prev, issuer: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2" />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Fecha de emisión
                      <input value={editForm.issueDate} onChange={(e) => setEditForm((prev) => ({ ...prev, issueDate: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2" />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Tipo de documento
                      <input value={editForm.documentType} onChange={(e) => setEditForm((prev) => ({ ...prev, documentType: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2" />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Código de referencia
                      <input value={editForm.referenceCode} onChange={(e) => setEditForm((prev) => ({ ...prev, referenceCode: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2" />
                    </label>
                  </>
                ) : null}

                {asset.asset_type === "uniforme" ? (
                  <>
                    <label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2">
                      Talla
                      <input value={editForm.size} onChange={(e) => setEditForm((prev) => ({ ...prev, size: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2" />
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={editForm.hasCinta} onChange={(e) => setEditForm((prev) => ({ ...prev, hasCinta: e.target.checked }))} /> Tiene cinta</label>
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={editForm.hasJubon} onChange={(e) => setEditForm((prev) => ({ ...prev, hasJubon: e.target.checked }))} /> Tiene jubón</label>
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 md:col-span-2"><input type="checkbox" checked={editForm.hasGreguesco} onChange={(e) => setEditForm((prev) => ({ ...prev, hasGreguesco: e.target.checked }))} /> Tiene gregüesco</label>
                  </>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 bg-white pt-4">
                <button type="button" onClick={handleSaveEdit} disabled={isSavingEdit} className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-slate-400">
                  {isSavingEdit ? "Guardando..." : "Guardar cambios"}
                </button>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">Cancelar</button>
              </div>
            </div>
          </div>
        ) : null}

      </section>
    </main>
  );
}
