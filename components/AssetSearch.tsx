"use client";

import { useState, useEffect, useMemo } from "react";

type SearchResult = {
  id: string;
  assetType: string;
  name: string;
  photoUrl: string;
  currentValue: number;
  status: string;
  holderDisplayName?: string | null;
  holderNickname?: string | null;
  holderEmail?: string | null;
  holderName?: string | null;
  notes?: string | null;
  tags: string[];
  createdAt?: string;
  instrument?: { instrumentType?: string; brand?: string; fabricationYear?: number | null } | null;
  recognition?: { issuer?: string; issueDate?: string | null; documentType?: string | null } | null;
  uniform?: { size?: string | null; hasCinta?: boolean; hasJubon?: boolean; hasGreguesco?: boolean } | null;
};

const STATUS_LABELS: Record<string, string> = {
  disponible: "Disponible",
  bajo_responsabilidad: "Bajo resp.",
  solicitado: "Solicitado",
  mantenimiento: "Mantenim.",
};

const TYPE_LABELS: Record<string, string> = {
  instrumento: "Instrumento",
  reconocimiento: "Reconocimiento",
  uniforme: "Uniforme",
  otro: "Otro",
};

export default function AssetSearch() {
  const [allItems, setAllItems] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Column filters
  const [filterName, setFilterName] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterHolder, setFilterHolder] = useState("");
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/assets?limit=100");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error cargando activos");
      setAllItems(data.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Collect all unique tags from loaded assets
  const allTags = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((item) => item.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [allItems]);

  // Client-side filtering
  const filtered = useMemo(() => {
    return allItems.filter((item) => {
      if (filterName && !item.name.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (filterType && item.assetType !== filterType) return false;
      if (filterStatus && item.status !== filterStatus) return false;
      const holder = item.holderDisplayName || item.holderNickname || item.holderName || item.holderEmail || "";
      if (filterHolder && !holder.toLowerCase().includes(filterHolder.toLowerCase())) return false;
      if (activeTags.size > 0) {
        const itemTagSet = new Set(item.tags || []);
        for (const t of activeTags) {
          if (!itemTagSet.has(t)) return false;
        }
      }
      return true;
    });
  }, [allItems, filterName, filterType, filterStatus, filterHolder, activeTags]);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const clearFilters = () => {
    setFilterName("");
    setFilterType("");
    setFilterStatus("");
    setFilterHolder("");
    setActiveTags(new Set());
  };

  const hasFilters = !!(filterName || filterType || filterStatus || filterHolder || activeTags.size > 0);

  return (
    <section className="asset-panel glass">
      {/* Header */}
      <div className="assets-grid-header">
        <div>
          <h3>Activos registrados</h3>
          <p className="muted-text">
            {isLoading ? "Cargando…" : `${filtered.length} de ${allItems.length} activos`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {hasFilters && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              Limpiar filtros
            </button>
          )}
          <button className="btn-icon" onClick={loadAll} title="Recargar" disabled={isLoading}>
            {isLoading ? "⏳" : "↻"}
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div className="tag-filter-row">
          <span className="tag-filter-label">Tags:</span>
          <div className="tag-filter-pills">
            {allTags.map((tag) => (
              <button
                key={tag}
                className={`tag-pill${activeTags.has(tag) ? " tag-pill-active" : ""}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid table */}
      <div className="assets-table-wrap">
        <table className="assets-table">
          <thead>
            {/* Filter row */}
            <tr className="assets-table-filters">
              <th />
              <th>
                <input
                  className="col-filter-input"
                  placeholder="Filtrar nombre…"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                />
              </th>
              <th>
                <select
                  className="col-filter-input"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="instrumento">Instrumento</option>
                  <option value="reconocimiento">Reconocimiento</option>
                  <option value="uniforme">Uniforme</option>
                  <option value="otro">Otro</option>
                </select>
              </th>
              <th>
                <select
                  className="col-filter-input"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="disponible">Disponible</option>
                  <option value="bajo_responsabilidad">Bajo resp.</option>
                  <option value="solicitado">Solicitado</option>
                  <option value="mantenimiento">Mantenim.</option>
                </select>
              </th>
              <th>
                <input
                  className="col-filter-input"
                  placeholder="Filtrar responsable…"
                  value={filterHolder}
                  onChange={(e) => setFilterHolder(e.target.value)}
                />
              </th>
              <th />
            </tr>
            {/* Column headers */}
            <tr className="assets-table-head">
              <th className="col-th-photo">Foto</th>
              <th>Nombre / Descripción</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Responsable</th>
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="table-placeholder">
                  <div className="loading-spinner" style={{ margin: "0 auto" }} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-placeholder">
                  {hasFilters
                    ? "Ningún activo coincide con los filtros."
                    : "Sin activos registrados aún."}
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const holder =
                  item.holderDisplayName ||
                  item.holderNickname ||
                  item.holderName ||
                  item.holderEmail ||
                  "—";
                return (
                  <tr key={item.id} className="assets-table-row">
                    <td className="col-photo">
                      {item.photoUrl ? (
                        <img src={item.photoUrl} alt={item.name} className="grid-thumb" />
                      ) : (
                        <div className="grid-thumb-empty">📦</div>
                      )}
                    </td>
                    <td className="col-name">
                      <span className="asset-name">{item.name}</span>
                      {item.notes && <span className="asset-notes">{item.notes}</span>}
                      {item.assetType === "instrumento" && item.instrument && (
                        <span className="asset-notes">
                          {[
                            item.instrument.instrumentType,
                            item.instrument.brand,
                            item.instrument.fabricationYear,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="result-badge">
                        {TYPE_LABELS[item.assetType] || item.assetType}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${item.status}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td className="col-holder">{holder}</td>
                    <td>
                      <div className="result-tags">
                        {item.tags?.map((t) => (
                          <button
                            key={t}
                            className={`result-tag tag-btn${activeTags.has(t) ? " tag-pill-active" : ""}`}
                            onClick={() => toggleTag(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
