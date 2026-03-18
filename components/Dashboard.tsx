"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../app/context/AuthContext";

type AssetItem = {
  id: string;
  name?: string;
  photoUrl?: string | null;
  holderPicture?: string | null;
  holderDisplayName?: string | null;
  holderNickname?: string | null;
  holderName?: string | null;
  status: string;
  tags: string[];
  notes?: string | null;
  assetType?: string;
  holderEmail?: string | null;
};

type AssetRequestItem = {
  id: string;
  asset_id: string;
  asset_name?: string;
  status?: string;
  isUnread?: boolean;
  created_at?: string;
};

type AcceptedAssetDetail = {
  id: string;
  asset_type: string;
  name?: string | null;
  photo_url?: string | null;
  fabrication_year?: number | null;
  current_value?: number | null;
  status?: string | null;
  notes?: string | null;
  instrument_type?: string | null;
  brand?: string | null;
  issuer?: string | null;
  issue_date?: string | null;
  document_type?: string | null;
  reference_code?: string | null;
  size?: string | null;
  has_cinta?: number | boolean | null;
  has_jubon?: number | boolean | null;
  has_greguesco?: number | boolean | null;
  tags?: string[];
  editLogs?: Array<{
    id: string;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    edited_at: string;
    editor_nickname?: string | null;
    editor_name?: string | null;
    editor_email?: string | null;
  }>;
};

type EditFormState = {
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
};

type AssetStatusOption = {
  code: string;
  label: string;
};

type DashboardFilter = "all" | "mine" | "requested";

const DONUT_COLORS = ["#84cc16", "#06b6d4", "#f59e0b", "#8b5cf6", "#f43f5e", "#14b8a6", "#3b82f6"];

export default function Dashboard() {
  const router = useRouter();
  const emptyEditForm = (): EditFormState => ({
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

  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [planImageBroken, setPlanImageBroken] = useState(false);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>("all");
  const [incomingRequests, setIncomingRequests] = useState<AssetRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<AssetRequestItem[]>([]);
  const [unreadIncomingCount, setUnreadIncomingCount] = useState(0);
  const [acceptedNotice, setAcceptedNotice] = useState<AssetRequestItem | null>(null);
  const [acceptedAsset, setAcceptedAsset] = useState<AcceptedAssetDetail | null>(null);
  const [isLoadingAsset, setIsLoadingAsset] = useState(false);
  const [assetError, setAssetError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editFeedback, setEditFeedback] = useState("");
  const [editForm, setEditForm] = useState<EditFormState>(emptyEditForm());
  const [assetStatuses, setAssetStatuses] = useState<AssetStatusOption[]>([]);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const editNameInputRef = useRef<HTMLInputElement | null>(null);
  const dismissedAcceptedRequestIdRef = useRef<string | null>(null);

  if (!user) return null;

  const displayName = user.nickname?.trim() || user.name?.trim() || "músico";
  const isDirectRenderableUrl = (url: string) =>
    url.startsWith("/") || url.startsWith("data:") || url.startsWith("blob:");
  const resolveUserImageUrl = (url?: string | null) => {
    const source = String(url || "").trim();
    if (!source) return "";
    if (isDirectRenderableUrl(source)) return source;
    return `/api/ui/asset-image?url=${encodeURIComponent(source)}`;
  };
  const profileImageUrl = resolveUserImageUrl(user.picture);
  const plan2026ImageUrl = "/api/ui/newsletter-image";

  const statusLabelMap = new Map(assetStatuses.map((item: AssetStatusOption) => [item.code, item.label]));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isMenuOpen) return;
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousOverflow || "";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  const loadDashboardAssets = async () => {
    setIsStatsLoading(true);
    setStatsError("");
    try {
      const response = await fetch("/api/assets?limit=100");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudieron cargar los activos.");
      }
      setAssets(Array.isArray(data?.items) ? data.items : []);
    } catch (error: any) {
      setStatsError(error?.message || "No se pudieron cargar los datos.");
    } finally {
      setIsStatsLoading(false);
    }
  };

  const loadRequests = async () => {
    if (!user?.email) return;

    try {
      const response = await fetch(`/api/asset-requests?userEmail=${encodeURIComponent(user.email)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudieron cargar las solicitudes.");
      }
      setIncomingRequests(Array.isArray(data?.incoming) ? data.incoming : []);
      const outgoing = Array.isArray(data?.outgoing) ? data.outgoing : [];
      setOutgoingRequests(outgoing);
      setUnreadIncomingCount(Number(data?.unreadIncomingCount || 0));

      const acceptedUnread = outgoing
        .filter((item: any) => item?.status === "aceptada" && item?.isUnread)
        .sort((left: any, right: any) => {
          const leftDate = new Date(left?.created_at || 0).getTime();
          const rightDate = new Date(right?.created_at || 0).getTime();
          return rightDate - leftDate;
        });

      const newestUnreadAccepted = acceptedUnread.length > 0 ? acceptedUnread[0] : null;

      setAcceptedNotice((previous: AssetRequestItem | null) => {
        // Keep the current popup/form stable while the user is editing.
        if (previous) return previous;
        if (!newestUnreadAccepted) return null;
        // If user skipped once in this home session, do not reopen until reload.
        if (dismissedAcceptedRequestIdRef.current === newestUnreadAccepted.id) return null;
        return newestUnreadAccepted;
      });
    } catch {}
  };

  useEffect(() => {
    loadDashboardAssets();
  }, []);

  useEffect(() => {
    loadRequests();
  }, [user?.email]);

  useEffect(() => {
    const loadStatuses = async () => {
      try {
        const response = await fetch("/api/asset-statuses");
        const data = await response.json();
        if (!response.ok || data?.error) {
          throw new Error(data?.error || "No se pudieron cargar estados");
        }
        setAssetStatuses(Array.isArray(data?.items) ? data.items : []);
      } catch {
        setAssetStatuses([
          { code: "en_uso", label: "En uso" },
          { code: "disponible", label: "Disponible" },
          { code: "solicitado", label: "Solicitado" },
          { code: "pendiente_recepcion", label: "Pendiente de aceptar recepcion" },
          { code: "mantenimiento", label: "Mantenimiento" },
          { code: "baja", label: "Baja" },
        ]);
      }
    };

    loadStatuses();
  }, []);

  useEffect(() => {
    if (!user?.email) return;

    const intervalId = window.setInterval(() => {
      loadRequests();
    }, 8000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [user?.email]);

  useEffect(() => {
    if (!acceptedNotice?.asset_id) {
      setAcceptedAsset(null);
      setAssetError("");
      setEditFeedback("");
      setEditForm(emptyEditForm());
      return;
    }

    let isCancelled = false;

    const loadAsset = async () => {
      setIsLoadingAsset(true);
      setAssetError("");
      setEditFeedback("");

      try {
        const params = new URLSearchParams();
        params.set("viewerEmail", user.email);
        const response = await fetch(`/api/assets/${acceptedNotice.asset_id}?${params.toString()}`);
        const data = await response.json();

        if (!response.ok || data?.error) {
          throw new Error(data?.error || "No se pudo cargar el activo.");
        }

        if (isCancelled) return;

        const detail = data as AcceptedAssetDetail;
        
        // Solo cerrar el popup si el solicitante actual ya editó al menos una vez.
        const hasCurrentUserEdits = Array.isArray(detail.editLogs)
          && detail.editLogs.some((log) => String(log?.editor_email || "").toLowerCase() === user.email.toLowerCase());
        if (hasCurrentUserEdits) {
          try {
            await fetch(`/api/asset-requests/${acceptedNotice.id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "mark-read", actingUserEmail: user.email }),
            });
          } catch {
            // silenciar error
          }
          if (!isCancelled) {
            setAcceptedNotice(null);
          }
          return;
        }

        setAcceptedAsset(detail);
        setEditForm({
          name: String(detail.name || ""),
          photoUrl: String(detail.photo_url || ""),
          fabricationYear:
            detail.fabrication_year === null || detail.fabrication_year === undefined
              ? ""
              : String(detail.fabrication_year),
          currentValue:
            detail.current_value === null || detail.current_value === undefined
              ? ""
              : String(detail.current_value),
          status: String(detail.status || "en_uso"),
          notes: String(detail.notes || ""),
          instrumentType: String(detail.instrument_type || ""),
          brand: String(detail.brand || ""),
          issuer: String(detail.issuer || ""),
          issueDate: String(detail.issue_date || ""),
          documentType: String(detail.document_type || ""),
          referenceCode: String(detail.reference_code || ""),
          size: String(detail.size || ""),
          hasCinta: Boolean(detail.has_cinta),
          hasJubon: Boolean(detail.has_jubon),
          hasGreguesco: Boolean(detail.has_greguesco),
          tagsInput: Array.isArray(detail.tags) ? detail.tags.join(", ") : "",
        });
      } catch (error: any) {
        if (!isCancelled) {
          setAcceptedAsset(null);
          setAssetError(error?.message || "No se pudo cargar el activo.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingAsset(false);
        }
      }
    };

    loadAsset();

    return () => {
      isCancelled = true;
    };
  }, [acceptedNotice?.id, acceptedNotice?.asset_id, user?.email]);

  const isMine = (item: AssetItem) => {
    const holderEmail = String(item.holderEmail || "").toLowerCase().trim();
    const holderNickname = String(item.holderNickname || "").toLowerCase().trim();
    const holderName = String(item.holderName || "").toLowerCase().trim();
    const holderDisplayName = String(item.holderDisplayName || "").toLowerCase().trim();
    const userEmail = String(user.email || "").toLowerCase().trim();
    const userNickname = String(user.nickname || "").toLowerCase().trim();
    const userName = String(user.name || "").toLowerCase().trim();
    const normalizedStatus = String(item.status || "").toLowerCase();

    const matchesByEmail = holderEmail.length > 0 && holderEmail === userEmail;
    const matchesByIdentity = [holderNickname, holderName, holderDisplayName]
      .filter(Boolean)
      .some((value) => (userNickname && value === userNickname) || (userName && value === userName));

    // Ownership is determined by current holder; exclude only assets marked as baja.
    return normalizedStatus !== "baja" && (matchesByEmail || matchesByIdentity);
  };

  const totalAssets = assets.length;
  const inPossessionCount = assets.filter(isMine).length;
  const pendingOutgoingRequests = outgoingRequests.filter((item: AssetRequestItem) => String(item.status || "") === "pendiente");
  const requestedCount = pendingOutgoingRequests.length;

  const filteredAssets =
    activeFilter === "mine"
      ? assets.filter(isMine)
      : activeFilter === "requested"
        ? assets.filter((item: AssetItem) => String(item.status || "").toLowerCase() === "solicitado")
        : assets;

  const tagMap = new Map<string, number>();
  filteredAssets.forEach((item: AssetItem) => {
    (item.tags || []).forEach((rawTag: string) => {
      const tag = String(rawTag || "").trim().toLowerCase();
      if (!tag) return;
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
    });
  });

  const tagSummary = Array.from(tagMap.entries())
    .map(([tag, count], index) => ({
      tag,
      count,
      color: DONUT_COLORS[index % DONUT_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const chartTotal = tagSummary.reduce((sum, item) => sum + item.count, 0);

  const donutStops =
    chartTotal > 0
      ? tagSummary
          .map((item, index, arr) => {
            const start = arr.slice(0, index).reduce((acc, current) => acc + current.count, 0);
            const end = start + item.count;
            const startPct = ((start / chartTotal) * 100).toFixed(2);
            const endPct = ((end / chartTotal) * 100).toFixed(2);
            return `${item.color} ${startPct}% ${endPct}%`;
          })
          .join(", ")
      : "#e2e8f0 0% 100%";

  const activeFilterLabel =
    activeFilter === "mine" ? "Mis activos" : activeFilter === "requested" ? "Solicitados" : "Activos";
  const hasPendingApproval = unreadIncomingCount > 0 || incomingRequests.length > 0;

  const saveAcceptedEdit = async () => {
    if (!acceptedAsset?.id || !acceptedNotice?.id || !user?.email) return;
    const tags = editForm.tagsInput
      .split(",")
      .map((item: string) => String(item || "").trim())
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

    if (acceptedAsset.asset_type === "instrumento") {
      payload.instrumentType = editForm.instrumentType;
      payload.brand = editForm.brand;
    }

    if (acceptedAsset.asset_type === "reconocimiento") {
      payload.issuer = editForm.issuer;
      payload.issueDate = editForm.issueDate;
      payload.documentType = editForm.documentType;
      payload.referenceCode = editForm.referenceCode;
      payload.reference_code = editForm.referenceCode;
    }

    if (acceptedAsset.asset_type === "uniforme") {
      payload.size = editForm.size;
      payload.hasCinta = editForm.hasCinta;
      payload.hasJubon = editForm.hasJubon;
      payload.hasGreguesco = editForm.hasGreguesco;
    }

    const response = await fetch(`/api/assets/${acceptedAsset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || data?.error) {
      throw new Error(data?.error || "No se pudo guardar la edición.");
    }

    return data?.updated !== false;
  };

  const closeAcceptedPopup = () => {
    dismissedAcceptedRequestIdRef.current = acceptedNotice?.id || null;
    setAcceptedNotice(null);
    setAcceptedAsset(null);
    setAssetError("");
    setEditFeedback("");
    setEditForm(emptyEditForm());
  };

  const handleAcceptPopup = async () => {
    if (!acceptedNotice?.id || !user?.email || isSavingEdit) return;
    setIsSavingEdit(true);
    setEditFeedback("");

    try {
      const wasUpdated = await saveAcceptedEdit();

      if (!wasUpdated) {
        const response = await fetch(`/api/asset-requests/${acceptedNotice.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "confirm-receipt", actingUserEmail: user.email }),
        });
        const data = await response.json();
        if (!response.ok || data?.error) {
          throw new Error(data?.error || "No se pudo confirmar la recepción.");
        }
      }

      setAcceptedNotice(null);
      setAcceptedAsset(null);
      setEditForm(emptyEditForm());
      await loadDashboardAssets();
      await loadRequests();
    } catch (error: any) {
      setEditFeedback(error?.message || "No se pudo aceptar el activo.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="relative w-full max-w-xl">
      <button
        type="button"
        className="fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-xl text-slate-900 shadow-sm transition hover:shadow-md md:right-6 md:top-5"
        aria-label="Abrir menú"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((prev: boolean) => !prev)}
      >
        ☰
        {hasPendingApproval ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            🔔
          </span>
        ) : null}
      </button>

      {isMenuOpen && <div className="fixed inset-0 z-40 bg-slate-950/55" aria-hidden="true"></div>}

      {acceptedNotice ? (
        <div className="fixed inset-0 z-[55] grid place-items-center overflow-y-auto bg-slate-950/50 px-4 py-6" role="dialog" aria-modal="true">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-white p-6 shadow-2xl ring-1 ring-slate-100">
            {isLoadingAsset ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-lime-500" />
              </div>
            ) : assetError ? (
              <div className="py-6">
                <p className="text-sm text-rose-600">{assetError}</p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
                    onClick={closeAcceptedPopup}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : acceptedAsset ? (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-lime-600">Solicitud aceptada</p>
                  <div className="mt-2 flex items-start justify-between gap-3">
                    <h3 className="text-2xl font-black text-slate-900">🔔 Activo pendiente de recepción</h3>
                    <button
                      type="button"
                      title="Activo editable"
                      aria-label="Enfocar edición del activo"
                      onClick={() => editNameInputRef.current?.focus()}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      ✏️ Editar
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Se aceptó tu solicitud para <strong>{acceptedNotice.asset_name || "este activo"}</strong>. Revisa los datos antes de aceptar.
                  </p>
                </div>

                <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre</label>
                    <input
                      ref={editNameInputRef}
                      type="text"
                      value={editForm.name}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 md:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">URL de foto</label>
                    <input
                      type="text"
                      value={editForm.photoUrl}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, photoUrl: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 md:text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Año de fabricación</label>
                      <input
                        type="number"
                        value={editForm.fabricationYear}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, fabricationYear: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 md:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Valor actual</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.currentValue}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, currentValue: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 md:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</label>
                    <select
                      value={editForm.status}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 md:text-sm"
                    >
                      {assetStatuses.map((item) => (
                        <option key={item.code} value={item.code}>{item.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Notas</label>
                    <textarea
                      rows={3}
                      value={editForm.notes}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 md:text-sm"
                    />
                  </div>

                  {acceptedAsset.asset_type === "instrumento" ? (
                    <>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo de instrumento</label>
                        <input
                          type="text"
                          value={editForm.instrumentType}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, instrumentType: event.target.value }))}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 md:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Marca</label>
                        <input
                          type="text"
                          value={editForm.brand}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, brand: event.target.value }))}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 md:text-sm"
                        />
                      </div>
                    </>
                  ) : null}

                  {acceptedAsset.asset_type === "reconocimiento" ? (
                    <>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Emisor</label>
                        <input
                          type="text"
                          value={editForm.issuer}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, issuer: event.target.value }))}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 md:text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha de emisión</label>
                          <input
                            type="date"
                            value={editForm.issueDate}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, issueDate: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 md:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo de documento</label>
                          <input
                            type="text"
                            value={editForm.documentType}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, documentType: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 md:text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Código de referencia</label>
                        <input
                          type="text"
                          value={editForm.referenceCode}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, referenceCode: event.target.value }))}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 md:text-sm"
                        />
                      </div>
                    </>
                  ) : null}

                  {acceptedAsset.asset_type === "uniforme" ? (
                    <>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Talla</label>
                        <input
                          type="text"
                          value={editForm.size}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, size: event.target.value }))}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 md:text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-700 md:text-sm">
                          <input
                            type="checkbox"
                            checked={editForm.hasCinta}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, hasCinta: event.target.checked }))}
                          />
                          Cinta
                        </label>
                        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-700 md:text-sm">
                          <input
                            type="checkbox"
                            checked={editForm.hasJubon}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, hasJubon: event.target.checked }))}
                          />
                          Jubón
                        </label>
                        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-700 md:text-sm">
                          <input
                            type="checkbox"
                            checked={editForm.hasGreguesco}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, hasGreguesco: event.target.checked }))}
                          />
                          Gregüesco
                        </label>
                      </div>
                    </>
                  ) : null}

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Etiquetas (coma separada)</label>
                    <input
                      type="text"
                      value={editForm.tagsInput}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, tagsInput: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 md:text-sm"
                    />
                  </div>

                  {editFeedback ? (
                    <p className={`text-sm ${editFeedback.includes("correctamente") ? "text-lime-600" : "text-rose-600"}`}>
                      {editFeedback}
                    </p>
                  ) : null}
                </div>

                <div className="sticky bottom-0 mt-4 flex flex-wrap gap-2 border-t border-slate-100 bg-white pt-4">
                  <button
                    type="button"
                    disabled={isSavingEdit}
                    onClick={handleAcceptPopup}
                    className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isSavingEdit ? "Procesando..." : "Aceptar"}
                  </button>
                  <button
                    type="button"
                    disabled={isSavingEdit}
                    className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 disabled:opacity-60"
                    onClick={closeAcceptedPopup}
                  >
                    Ahora no
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none fixed inset-0 z-50" ref={menuRef} aria-hidden={!isMenuOpen}>
        <aside
          className={`pointer-events-auto absolute right-0 top-0 grid h-dvh w-[82vw] max-w-[340px] content-start gap-2 overflow-y-auto rounded-l-2xl border-l border-slate-200 bg-white p-4 shadow-2xl transition-transform duration-200 ${
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          role="menu"
          aria-label="Menú principal"
        >
          <div className="mb-1 flex items-center gap-3 border-b border-slate-200 pb-3">
            <img
              src={profileImageUrl || user.picture}
              alt="Avatar"
              className="h-11 w-11 rounded-full border-2 border-slate-200 object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <span className="block truncate text-lg font-semibold text-slate-900">{user.name}</span>
              <span className="block truncate text-sm text-slate-500">{user.email}</span>
            </div>
          </div>

          <nav className="grid" aria-label="Opciones de navegación">
            <Link
              href="/"
              className="border-b border-slate-200 py-3 text-base font-medium text-slate-700 transition hover:text-blue-600"
              role="menuitem"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/requests"
              className="flex items-center justify-between gap-3 border-b border-slate-200 py-3 text-base font-medium text-slate-700 transition hover:text-blue-600"
              role="menuitem"
              onClick={() => setIsMenuOpen(false)}
            >
              <span>Solicitudes</span>
              {hasPendingApproval ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-1 text-xs font-bold text-white">
                  <span aria-hidden="true">🔔</span>
                  {unreadIncomingCount || incomingRequests.length}
                </span>
              ) : null}
            </Link>
            <Link
              href="/profile"
              className="border-b border-slate-200 py-3 text-base font-medium text-slate-700 transition hover:text-blue-600"
              role="menuitem"
              onClick={() => setIsMenuOpen(false)}
            >
              Perfil
            </Link>
            <Link
              href="/settings"
              className="border-b border-slate-200 py-3 text-base font-medium text-slate-700 transition hover:text-blue-600"
              role="menuitem"
              onClick={() => setIsMenuOpen(false)}
            >
              Configuraciones
            </Link>
            <button
              className="border-b border-slate-200 py-3 text-left text-base font-medium text-rose-500 transition hover:text-rose-600"
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false);
                logout();
              }}
            >
              Salir
            </button>
          </nav>

        </aside>
      </div>

      <section className="mb-5 flex items-stretch gap-3 pr-14 pt-4 md:pr-16">
        <div className="grid h-[84px] w-[84px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#FFBF00] via-[#007EFF] to-[#2400FF] p-[3px] shadow-[0_10px_24px_rgba(36,0,255,0.28)]">
          <div className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-white ring-1 ring-white/70">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={displayName}
                className="h-full w-full rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-2xl font-black text-slate-500">{displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>
        </div>
        <div className="flex min-h-[84px] flex-col justify-center">
          <p className="text-base font-medium text-slate-600">Buenos días,</p>
          <p className="text-[clamp(1.9rem,6vw,2.7rem)] font-black tracking-tight text-slate-900">{displayName} 👋</p>
        </div>
      </section>

      <main className="grid gap-5">
        <section className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/assets/new"
              className="group flex min-h-44 items-center justify-center rounded-[2rem] px-4 py-5 text-center transition hover:-translate-y-0.5"
              style={{ background: "#FFBF00", boxShadow: "0 16px 30px rgba(255,191,0,0.32)" }}
            >
              <div className="flex flex-col items-center justify-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-black/15 text-2xl leading-none text-slate-900">➕</span>
                <h3 className="text-base font-extrabold leading-tight text-slate-900">Registrar activo</h3>
              </div>
            </Link>

            <Link
              href="/assets/search"
              className="group flex min-h-44 items-center justify-center rounded-[2rem] px-4 py-5 text-center transition hover:-translate-y-0.5"
              style={{ background: "#807040", boxShadow: "0 16px 30px rgba(128,112,64,0.30)" }}
            >
              <div className="flex flex-col items-center justify-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-white/25 text-2xl leading-none text-white">🔎</span>
                <h3 className="text-base font-extrabold leading-tight text-white">Consultar activo</h3>
              </div>
            </Link>
          </div>
        </section>

        <section>
          <article
            className="relative min-h-[180px] overflow-visible rounded-[2rem] py-6 pl-6 pr-6 text-white shadow-[0_18px_30px_rgba(36,0,255,0.24)]"
            style={{ background: "#007EFF" }}
          >
            <div className="flex h-full flex-col justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FFBF00]">Newsletter</p>
                <h3 className="mt-2 text-[48px] font-black leading-[0.95]">Plan 2026</h3>
              </div>
              <p className="pr-[110px] text-[15px] leading-[1.3] text-blue-50">Sigue los ultimos cambios de los estatutos publicados.</p>
            </div>

            {!planImageBroken ? (
              <img
                src={plan2026ImageUrl}
                alt="Plan 2026"
                className="absolute bottom-0 -right-3 h-[200px] w-auto object-contain"
                style={{ zIndex: 2 }}
                onError={() => setPlanImageBroken(true)}
              />
            ) : (
              <div className="absolute bottom-0 right-3 grid h-[120px] w-[120px] place-items-center rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-center">
                <span className="text-xs text-slate-300">No se pudo cargar imagen</span>
              </div>
            )}
          </article>
        </section>

        <section className="grid gap-3">
          <div className="grid w-full grid-cols-3 gap-1 rounded-[1.4rem] bg-slate-100 p-1 ring-1 ring-slate-200">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`w-full rounded-[1.1rem] px-2 py-3 text-center transition ${
                activeFilter === "all"
                  ? "bg-[#2400FF] text-white shadow-md"
                  : "bg-transparent text-slate-600 hover:bg-white/70"
              }`}
            >
              <span className="block text-3xl font-black">{totalAssets}</span>
              <h4 className={`mt-1 text-[11px] font-semibold uppercase tracking-wide ${activeFilter === "all" ? "text-blue-100" : "text-slate-500"}`}>
                Activos
              </h4>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("mine")}
              className={`w-full rounded-[1.1rem] px-2 py-3 text-center transition ${
                activeFilter === "mine"
                  ? "bg-[#2400FF] text-white shadow-md"
                  : "bg-transparent text-slate-600 hover:bg-white/70"
              }`}
            >
              <span className="block text-3xl font-black">{inPossessionCount}</span>
              <h4 className={`mt-1 text-[11px] font-semibold uppercase tracking-wide ${activeFilter === "mine" ? "text-blue-100" : "text-slate-500"}`}>
                  Mis activos
              </h4>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("requested")}
              className={`w-full rounded-[1.1rem] px-2 py-3 text-center transition ${
                activeFilter === "requested"
                  ? "bg-[#2400FF] text-white shadow-md"
                  : "bg-transparent text-slate-600 hover:bg-white/70"
              }`}
            >
              <span className="block text-3xl font-black">{requestedCount}</span>
              <h4 className={`mt-1 text-[11px] font-semibold uppercase tracking-wide ${activeFilter === "requested" ? "text-blue-100" : "text-slate-500"}`}>
                Solicitados
              </h4>
            </button>
          </div>

          {statsError && (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-100">{statsError}</p>
          )}

          {activeFilter === "mine" ? (
            <article className="overflow-hidden rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900">Activos bajo mi responsabilidad</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {filteredAssets.length}
                </span>
              </div>

              {filteredAssets.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500 ring-1 ring-slate-100">
                  No tienes activos en uso actualmente.
                </p>
              ) : (
                <div className="max-h-[380px] w-full max-w-full overflow-x-auto overflow-y-auto rounded-xl border border-slate-200">
                  <table className="min-w-[560px] table-fixed text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="w-[24%] px-3 py-2">Foto</th>
                        <th className="w-[24%] px-3 py-2">Estado</th>
                        <th className="w-[52%] px-3 py-2">Responsable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssets.map((item) => {
                        const assetPhotoUrl = resolveUserImageUrl(item.photoUrl);
                        const holderPhotoUrl = resolveUserImageUrl(item.holderPicture);
                        const holder = item.holderDisplayName || item.holderNickname || item.holderName || item.holderEmail || "—";
                        const statusLabel = statusLabelMap.get(item.status) || item.status;
                        return (
                          <tr
                            key={item.id}
                            className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50"
                            onClick={() => router.push(`/assets/${item.id}`)}
                          >
                            <td className="px-3 py-2">
                              {assetPhotoUrl ? (
                                <img src={assetPhotoUrl} alt={item.name || "Activo"} className="h-14 w-14 rounded-lg border border-slate-200 object-cover" />
                              ) : (
                                <div className="grid h-14 w-14 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-xl">📦</div>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                {statusLabel}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                {holderPhotoUrl ? (
                                  <img src={holderPhotoUrl} alt={holder} className="h-7 w-7 rounded-full border border-slate-200 object-cover" />
                                ) : (
                                  <div className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-slate-100 text-[10px] font-bold text-slate-600">
                                    {holder.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="truncate text-sm font-medium text-slate-700">{holder}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          ) : null}

          {activeFilter === "requested" ? (
            <article className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900">Solicitudes enviadas pendientes</h3>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                  {pendingOutgoingRequests.length}
                </span>
              </div>

              {pendingOutgoingRequests.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500 ring-1 ring-slate-100">
                  No tienes solicitudes pendientes de aprobación.
                </p>
              ) : (
                <ul className="space-y-2">
                  {pendingOutgoingRequests.map((request) => (
                    <li key={request.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{request.asset_name || "Activo"}</p>
                          <p className="text-xs text-slate-500">
                            Pendiente{request.created_at ? ` · ${new Date(request.created_at).toLocaleString("es-PE")}` : ""}
                          </p>
                        </div>
                        <Link
                          href={`/assets/${request.asset_id}`}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
                        >
                          Ver activo
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ) : null}
        </section>

        <section className="grid gap-4 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 md:grid-cols-[auto,1fr] md:items-center">
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold text-slate-900">Resumen gráfico por etiquetas</h3>
            <p className="text-base text-slate-500">Filtro activo: {activeFilterLabel}. El gráfico y tags se actualizan automáticamente.</p>
          </div>

          <div className="grid gap-4 md:col-span-2">
            <div
              className="mx-auto grid aspect-square w-[min(240px,70vw)] place-items-center rounded-full"
              style={{
                background: `conic-gradient(${donutStops})`,
              }}
            >
              <div className="flex aspect-square w-[62%] flex-col items-center justify-center rounded-full border border-slate-200 bg-white">
                <span className="text-sm text-slate-500">{activeFilterLabel}</span>
                <strong className="text-5xl font-black text-slate-900">{filteredAssets.length}</strong>
              </div>
            </div>

            {isStatsLoading ? (
              <p className="text-center text-sm text-slate-500">Cargando resumen...</p>
            ) : tagSummary.length === 0 ? (
              <p className="text-center text-sm text-slate-500">No hay tags para el filtro seleccionado.</p>
            ) : (
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {tagSummary.map((item) => (
                  <span
                    key={item.tag}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                    {item.tag}
                    <strong className="text-slate-900">{item.count}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
