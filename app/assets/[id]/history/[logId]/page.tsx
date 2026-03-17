"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import AppHamburgerMenu from "@/components/AppHamburgerMenu";

type AssetSummary = {
  id: string;
  asset_type: string;
  name: string;
  status: string;
  notes: string | null;
  photo_url: string | null;
  fabrication_year: number | null;
  current_value: number | null;
  holder_nickname: string | null;
  holder_name: string | null;
  holder_email: string | null;
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
};

type LogDetail = {
  id: string;
  asset_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  edited_at: string;
  editor_nickname: string | null;
  editor_name: string | null;
  editor_email: string | null;
};

export default function AssetEditLogDetailPage() {
  const { id, logId } = useParams<{ id: string; logId: string }>();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [asset, setAsset] = useState<AssetSummary | null>(null);
  const [log, setLog] = useState<LogDetail | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id || !logId) return;
      setIsLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (user?.email) params.set("viewerEmail", user.email);
        const response = await fetch(`/api/assets/${id}/edit-logs/${logId}?${params.toString()}`);
        const data = await response.json();
        if (!response.ok || data?.error) {
          throw new Error(data?.error || "No se pudo cargar el detalle del cambio.");
        }
        setAsset(data.asset || null);
        setLog(data.log || null);
      } catch (loadError: any) {
        setError(loadError?.message || "No se pudo cargar el detalle del cambio.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id, logId, user?.email]);

  const editorDisplay = useMemo(() => {
    if (!log) return "Usuario";
    return log.editor_nickname || log.editor_name || log.editor_email || "Usuario";
  }, [log]);

  const oldLines = useMemo(() => {
    const value = String(log?.old_value || "").trim();
    if (!value) return ["(vacío)"];
    return value.split(/\r?\n/);
  }, [log?.old_value]);

  const newLines = useMemo(() => {
    const value = String(log?.new_value || "").trim();
    if (!value) return ["(vacío)"];
    return value.split(/\r?\n/);
  }, [log?.new_value]);

  return (
    <main className="flex min-h-screen w-full items-start justify-center px-4 py-6">
      <AppHamburgerMenu />
      <section className="w-full max-w-4xl space-y-4">
        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between gap-3">
            <Link
              href={`/assets/${id}/history`}
              aria-label="Volver al histórico"
              className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-xl text-slate-700"
            >
              ‹
            </Link>
            <h1 className="truncate text-xl font-black text-slate-900">Detalle del cambio</h1>
            <span className="h-10 w-10" aria-hidden="true"></span>
          </div>
        </div>

        {error ? (
          <div className="rounded-[2rem] bg-rose-50 p-4 text-sm font-medium text-rose-700 ring-1 ring-rose-200">{error}</div>
        ) : null}

        {isLoading ? (
          <div className="rounded-[2rem] bg-white p-8 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-100">Cargando detalle...</div>
        ) : null}

        {!isLoading && asset && log ? (
          <>
            <article className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-lime-600">Activo</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">{asset.name}</h2>
              <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Campo editado</dt>
                  <dd className="font-semibold text-slate-800">{log.field_name}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Editado por</dt>
                  <dd className="font-semibold text-slate-800">{editorDisplay}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Fecha</dt>
                  <dd className="font-semibold text-slate-800">{new Date(log.edited_at).toLocaleString("es-PE")}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Responsable actual</dt>
                  <dd className="truncate font-semibold text-slate-800">{asset.holder_nickname || asset.holder_name || asset.holder_email || "—"}</dd>
                </div>
              </dl>
            </article>

            <article className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Diff del cambio</h3>
              <p className="mt-1 text-sm text-slate-500">Visualización tipo git: rojo lo removido, verde lo agregado.</p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="overflow-hidden rounded-xl border border-rose-200 bg-rose-50">
                  <div className="border-b border-rose-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700">- Antes</div>
                  <div className="max-h-[360px] overflow-auto p-3 font-mono text-sm text-rose-800">
                    {oldLines.map((line, index) => (
                      <p key={`${index}-${line}`} className="break-words">- {line}</p>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-lime-200 bg-lime-50">
                  <div className="border-b border-lime-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-lime-700">+ Después</div>
                  <div className="max-h-[360px] overflow-auto p-3 font-mono text-sm text-lime-800">
                    {newLines.map((line, index) => (
                      <p key={`${index}-${line}`} className="break-words">+ {line}</p>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </>
        ) : null}
      </section>
    </main>
  );
}