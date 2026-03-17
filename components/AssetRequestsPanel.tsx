"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AssetRequestItem = {
  id: string;
  asset_id: string;
  asset_name: string;
  asset_type: string;
  status: string;
  isUnread?: boolean;
  requester_nickname?: string | null;
  requester_name?: string | null;
  requester_email?: string | null;
  holder_nickname?: string | null;
  holder_name?: string | null;
  holder_email?: string | null;
  created_at: string;
};

interface Props {
  userEmail: string;
}

export default function AssetRequestsPanel({ userEmail }: Props) {
  const [incomingRequests, setIncomingRequests] = useState<AssetRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<AssetRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [unreadIncomingCount, setUnreadIncomingCount] = useState(0);
  const [unreadOutgoingCount, setUnreadOutgoingCount] = useState(0);

  const loadRequests = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/asset-requests?userEmail=${encodeURIComponent(userEmail)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "No se pudieron cargar las solicitudes.");
      }

      setIncomingRequests(Array.isArray(data?.incoming) ? data.incoming : []);
      setOutgoingRequests(Array.isArray(data?.outgoing) ? data.outgoing : []);
      setUnreadIncomingCount(Number(data?.unreadIncomingCount || 0));
      setUnreadOutgoingCount(Number(data?.unreadOutgoingCount || 0));
    } catch (requestError: any) {
      setError(requestError?.message || "No se pudieron cargar las solicitudes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [userEmail]);

  const postAction = async (requestId: string, action: "accept" | "reject" | "cancel" | "mark-read") => {
    const response = await fetch(`/api/asset-requests/${requestId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, actingUserEmail: userEmail }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || "No se pudo procesar la solicitud.");
    }
  };

  const handleAction = async (requestId: string, action: "accept" | "reject" | "cancel" | "mark-read") => {
    setError("");
    try {
      await postAction(requestId, action);
      await loadRequests();
    } catch (requestError: any) {
      setError(requestError?.message || "No se pudo procesar la solicitud.");
    }
  };

  return (
    <section className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-lime-600">Solicitudes</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Por aprobar</h2>
              <p className="mt-1 text-sm text-slate-500">Solicitudes pendientes que requieren tu decisión.</p>
            </div>
            {unreadIncomingCount > 0 ? (
              <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white">{unreadIncomingCount} nueva{unreadIncomingCount === 1 ? "" : "s"}</span>
            ) : null}
          </div>

          {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-100">{error}</p> : null}

          <div className="mt-4 grid gap-3">
            {isLoading ? (
              <p className="text-sm text-slate-500">Cargando solicitudes...</p>
            ) : incomingRequests.length === 0 ? (
              <p className="text-sm text-slate-500">No tienes solicitudes pendientes de aprobar.</p>
            ) : (
              incomingRequests.map((item) => {
                const requester = item.requester_nickname || item.requester_name || item.requester_email || "Usuario";
                return (
                  <div key={item.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link href={`/assets/${item.asset_id}`} className="text-sm font-bold text-slate-900 hover:text-lime-700">
                          {item.asset_name}
                        </Link>
                        <p className="mt-1 text-sm text-slate-600">{requester} solicitó este activo.</p>
                        {item.isUnread ? <p className="mt-1 text-xs font-semibold text-rose-600">Acción pendiente de aprobar</p> : null}
                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(item.created_at).toLocaleString("es-PE", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <span className="text-lg" aria-hidden="true">🔔</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.isUnread ? (
                        <button
                          type="button"
                          onClick={() => handleAction(item.id, "mark-read")}
                          className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
                        >
                          Marcar leída
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleAction(item.id, "accept")}
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Ceder activo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(item.id, "reject")}
                        className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sky-600">Seguimiento</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Enviadas</h2>
              <p className="mt-1 text-sm text-slate-500">Solicitudes enviadas y respuestas recibidas.</p>
            </div>
            {unreadOutgoingCount > 0 ? (
              <span className="rounded-full bg-lime-600 px-3 py-1 text-xs font-bold text-white">{unreadOutgoingCount} nueva{unreadOutgoingCount === 1 ? "" : "s"}</span>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3">
            {isLoading ? (
              <p className="text-sm text-slate-500">Cargando solicitudes...</p>
            ) : outgoingRequests.length === 0 ? (
              <p className="text-sm text-slate-500">No has enviado solicitudes.</p>
            ) : (
              outgoingRequests.map((item) => {
                const holder = item.holder_nickname || item.holder_name || item.holder_email || "Responsable actual";
                const statusLabel =
                  item.status === "pendiente"
                    ? `Esperando respuesta de ${holder}.`
                    : item.status === "aceptada"
                      ? `${holder} aceptó la solicitud.`
                      : item.status === "rechazada"
                        ? `${holder} rechazó la solicitud.`
                        : "Solicitud cancelada.";

                return (
                  <div key={item.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <Link href={`/assets/${item.asset_id}`} className="text-sm font-bold text-slate-900 hover:text-lime-700">
                      {item.asset_name}
                    </Link>
                    <p className="mt-1 text-sm text-slate-600">{statusLabel}</p>
                    {item.isUnread ? <p className="mt-1 text-xs font-semibold text-lime-700">Nueva actualización</p> : null}
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(item.created_at).toLocaleString("es-PE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.status === "pendiente" ? (
                        <button
                          type="button"
                          onClick={() => handleAction(item.id, "cancel")}
                          className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
                        >
                          Cancelar
                        </button>
                      ) : null}
                      {item.isUnread ? (
                        <button
                          type="button"
                          onClick={() => handleAction(item.id, "mark-read")}
                          className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
                        >
                          Marcar leída
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}