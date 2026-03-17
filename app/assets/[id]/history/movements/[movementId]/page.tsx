"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import PageHeader from "@/components/PageHeader";

type MovementDetail = {
  id: string;
  asset_id: string;
  movement_type: string;
  notes: string | null;
  created_at: string;
  from_nickname: string | null;
  from_name: string | null;
  from_email: string | null;
  to_nickname: string | null;
  to_name: string | null;
  to_email: string | null;
};

type AssetSummary = {
  id: string;
  name: string;
  status: string;
  holder_nickname: string | null;
  holder_name: string | null;
  holder_email: string | null;
};

export default function AssetMovementDetailPage() {
  const { id, movementId } = useParams<{ id: string; movementId: string }>();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [asset, setAsset] = useState<AssetSummary | null>(null);
  const [movement, setMovement] = useState<MovementDetail | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id || !movementId) return;
      setIsLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (user?.email) params.set("viewerEmail", user.email);

        const response = await fetch(`/api/assets/${id}/movements/${movementId}?${params.toString()}`);
        const data = await response.json();

        if (!response.ok || data?.error) {
          throw new Error(data?.error || "No se pudo cargar el detalle del movimiento.");
        }

        setAsset(data.asset || null);
        setMovement(data.movement || null);
      } catch (loadError: any) {
        setError(loadError?.message || "No se pudo cargar el detalle del movimiento.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id, movementId, user?.email]);

  const fromDisplay = useMemo(() => {
    if (!movement) return "Sin responsable";
    return movement.from_nickname || movement.from_name || movement.from_email || "Sin responsable";
  }, [movement]);

  const toDisplay = useMemo(() => {
    if (!movement) return "Sin responsable";
    return movement.to_nickname || movement.to_name || movement.to_email || "Sin responsable";
  }, [movement]);

  const holderDisplay = useMemo(() => {
    if (!asset) return "-";
    return asset.holder_nickname || asset.holder_name || asset.holder_email || "-";
  }, [asset]);

  return (
    <main className="flex min-h-screen w-full items-start justify-center px-4 py-6">
      <section className="w-full max-w-3xl space-y-4">
        <PageHeader
          title="Detalle del movimiento"
          backHref={`/assets/${id}`}
          backLabel="Volver a la ficha del activo"
        />

        {error ? (
          <div className="rounded-[2rem] bg-rose-50 p-4 text-sm font-medium text-rose-700 ring-1 ring-rose-200">{error}</div>
        ) : null}

        {isLoading ? (
          <div className="rounded-[2rem] bg-white p-8 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-100">Cargando detalle...</div>
        ) : null}

        {!isLoading && asset && movement ? (
          <article className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-lime-600">Activo</p>
            <h2 className="mt-1 break-words text-2xl font-black text-slate-900">{asset.name}</h2>
            <dl className="mt-4 grid grid-cols-1 gap-3">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Tipo de movimiento</dt>
                <dd className="break-words font-semibold text-slate-800">{movement.movement_type}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Desde</dt>
                <dd className="break-words font-semibold text-slate-800">{fromDisplay}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Hacia</dt>
                <dd className="break-words font-semibold text-slate-800">{toDisplay}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Fecha</dt>
                <dd className="break-words font-semibold text-slate-800">{new Date(movement.created_at).toLocaleString("es-PE")}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Detalle completo</dt>
                <dd className="break-words font-semibold text-slate-800">{movement.notes || `${fromDisplay} → ${toDisplay}`}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Responsable actual</dt>
                <dd className="break-words font-semibold text-slate-800">{holderDisplay}</dd>
              </div>
            </dl>
          </article>
        ) : null}
      </section>
    </main>
  );
}