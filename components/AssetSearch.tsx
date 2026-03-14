"use client";

import { useState } from "react";

type SearchResult = {
  id: string;
  assetType: string;
  name: string;
  photoUrl: string;
  currentValue: number;
  status: string;
  notes?: string | null;
  tags: string[];
  instrument?: { instrumentType?: string; brand?: string; fabricationYear?: number | null } | null;
  recognition?: { issuer?: string; issueDate?: string | null; documentType?: string | null } | null;
  uniform?: { size?: string | null; hasCinta?: boolean; hasJubon?: boolean; hasGreguesco?: boolean } | null;
};

export default function AssetSearch() {
  const [q, setQ] = useState("");
  const [assetType, setAssetType] = useState("");
  const [status, setStatus] = useState("");
  const [tag, setTag] = useState("");
  const [items, setItems] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (assetType) params.set("assetType", assetType);
      if (status) params.set("status", status);
      if (tag.trim()) params.set("tag", tag.trim());

      const response = await fetch(`/api/assets?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "No se pudo consultar activos.");
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || "Error inesperado.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="asset-panel glass">
      <h3>Consultar activos</h3>
      <p className="placeholder-text">Busca por código, tipo, estado o etiqueta.</p>

      <form className="asset-form" onSubmit={search}>
        <div className="asset-form-grid">
          <div>
            <label className="input-label">Búsqueda</label>
            <input className="input-text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código o descripción" />
          </div>

          <div>
            <label className="input-label">Tipo</label>
            <select className="input-text" value={assetType} onChange={(e) => setAssetType(e.target.value)}>
              <option value="">Todos</option>
              <option value="instrumento">Instrumento</option>
              <option value="reconocimiento">Reconocimiento</option>
              <option value="uniforme">Uniforme</option>
            </select>
          </div>

          <div>
            <label className="input-label">Estado</label>
            <select className="input-text" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="disponible">Disponible</option>
              <option value="bajo_responsabilidad">Bajo responsabilidad</option>
              <option value="solicitado">Solicitado</option>
              <option value="mantenimiento">Mantenimiento</option>
            </select>
          </div>

          <div>
            <label className="input-label">Tag</label>
            <input className="input-text" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="#instrumentos" />
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button className="btn-primary" type="submit" disabled={isLoading}>
          {isLoading ? "Buscando..." : "Buscar"}
        </button>
      </form>

      <div className="search-results">
        {items.length === 0 ? (
          <p className="placeholder-text">Sin resultados aún. Ejecuta una búsqueda.</p>
        ) : (
          items.map((item) => (
            <article key={item.id} className="result-card">
              <img src={item.photoUrl} alt={item.name} className="result-thumb" />
              <div className="result-content">
                <div className="result-top">
                  <h4>{item.name}</h4>
                  <span className="result-badge">{item.assetType}</span>
                </div>

                <p className="placeholder-text">Estado: {item.status} · Valor: S/ {Number(item.currentValue || 0).toFixed(2)}</p>

                {item.assetType === "instrumento" && item.instrument && (
                  <p className="placeholder-text">{item.instrument.instrumentType} · {item.instrument.brand}{item.instrument.fabricationYear ? ` · ${item.instrument.fabricationYear}` : ""}</p>
                )}

                {item.assetType === "reconocimiento" && item.recognition && (
                  <p className="placeholder-text">Emitido por: {item.recognition.issuer || "N/D"}</p>
                )}

                {item.assetType === "uniforme" && item.uniform && (
                  <p className="placeholder-text">Talla: {item.uniform.size || "N/D"} · Cinta: {item.uniform.hasCinta ? "Sí" : "No"} · Jubón: {item.uniform.hasJubon ? "Sí" : "No"} · Gregüesco: {item.uniform.hasGreguesco ? "Sí" : "No"}</p>
                )}

                {item.tags?.length > 0 && (
                  <div className="result-tags">
                    {item.tags.map((t) => (
                      <span key={`${item.id}-${t}`} className="result-tag">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
