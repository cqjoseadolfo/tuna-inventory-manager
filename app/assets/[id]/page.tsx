"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type AssetType = "instrumento" | "reconocimiento" | "uniforme" | "otro";

interface AssetDetail {
  id: string;
  asset_type: AssetType;
  name: string;
  photo_url: string;
  fabrication_year: number | null;
  status: string;
  notes: string | null;
  created_at: string;
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
}

const statusLabel: Record<string, string> = {
  bajo_responsabilidad: "Bajo responsabilidad",
  en_reparacion: "En reparación",
  baja: "Baja",
  disponible: "Disponible",
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
    <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-semibold text-slate-800">{String(value)}</dd>
    </div>
  );
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/assets/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setAsset(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

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

  return (
    <main className="flex min-h-screen w-full items-start justify-center px-4 py-6">
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
        {asset.photo_url && (
          <div className="overflow-hidden rounded-[2rem] shadow-sm ring-1 ring-slate-100">
            <img src={asset.photo_url} alt="Foto del activo" className="h-64 w-full object-cover" />
          </div>
        )}

        {/* Main data */}
        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Ficha del activo</h2>
          <dl className="grid grid-cols-2 gap-3">
            <DetailRow label="Código" value={asset.name} />
            <DetailRow label="Estado" value={statusLabel[asset.status] || asset.status} />
            <DetailRow label="Responsable" value={holderDisplay} />
            <DetailRow label="Tipo" value={typeLabel[asset.asset_type]} />
            <DetailRow label="Año de fabricación" value={asset.fabrication_year} />
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

        {/* Historical info placeholder */}
        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-1 text-lg font-bold text-slate-900">Historial</h2>
          <p className="text-sm text-slate-500">
            Registrado el{" "}
            {asset.created_at
              ? new Date(asset.created_at).toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "numeric" })
              : "—"}
          </p>
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400 ring-1 ring-slate-100">
            El historial de cambios y transferencias estará disponible próximamente.
          </div>
        </div>

      </section>
    </main>
  );
}
