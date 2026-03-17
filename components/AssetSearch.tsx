"use client";

import { useState, useEffect, useMemo, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

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
  holderPicture?: string | null;
  notes?: string | null;
  tags: string[];
  createdAt?: string;
  instrument?: { instrumentType?: string; brand?: string; fabricationYear?: number | null } | null;
  recognition?: { issuer?: string; issueDate?: string | null; documentType?: string | null } | null;
  uniform?: { size?: string | null; hasCinta?: boolean; hasJubon?: boolean; hasGreguesco?: boolean } | null;
};

const STATUS_LABELS: Record<string, string> = {
  disponible: "Disponible",
  en_uso: "En uso",
  bajo_responsabilidad: "En uso",
  solicitado: "Solicitado",
  mantenimiento: "Mantenim.",
  en_reparacion: "Mantenim.",
  pendiente_recepcion: "Pend. recepción",
  baja: "Baja",
};

const TYPE_LABELS: Record<string, string> = {
  instrumento: "Instrumento",
  reconocimiento: "Reconocimiento",
  uniforme: "Uniforme",
  otro: "Otro",
};

export default function AssetSearch() {
  const router = useRouter();
  const [allItems, setAllItems] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Column filters
  const [filterName, setFilterName] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterHolder, setFilterHolder] = useState("");
  const [tagQuery, setTagQuery] = useState("");
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

  const tagSuggestions = useMemo(() => {
    const query = tagQuery.trim().toLowerCase();
    return allTags
      .filter((tag) => {
        if (activeTags.has(tag)) return false;
        if (!query) return true;
        return tag.toLowerCase().includes(query);
      })
      .slice(0, 8);
  }, [allTags, activeTags, tagQuery]);

  // Client-side filtering
  const filtered = useMemo(() => {
    return allItems.filter((item) => {
      if (filterName && !item.name.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (filterType && item.assetType !== filterType) return false;
      if (filterStatus) {
        const normalizedStatus = item.status === "bajo_responsabilidad"
          ? "en_uso"
          : item.status === "en_reparacion"
            ? "mantenimiento"
            : item.status;
        if (normalizedStatus !== filterStatus) return false;
      }
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

  const addTagFilter = (tag: string) => {
    const normalized = String(tag || "").trim();
    if (!normalized) return;
    if (!allTags.includes(normalized)) return;
    setActiveTags((prev) => new Set(prev).add(normalized));
    setTagQuery("");
  };

  const removeTagFilter = (tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      next.delete(tag);
      return next;
    });
  };

  const handleTagSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const query = tagQuery.trim();
    if (!query) return;

    const exactMatch = allTags.find((tag) => tag.toLowerCase() === query.toLowerCase());
    if (exactMatch) {
      addTagFilter(exactMatch);
      return;
    }

    if (tagSuggestions.length > 0) {
      addTagFilter(tagSuggestions[0]);
    }
  };

  const clearFilters = () => {
    setFilterName("");
    setFilterType("");
    setFilterStatus("");
    setFilterHolder("");
    setTagQuery("");
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

      {/* Grid table */}
      <div className="assets-table-wrap">
        <table className="assets-table">
          <thead>
            {/* Filter row */}
            <tr className="assets-table-filters">
              <th>
                {allTags.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <input
                      className="col-filter-input"
                      type="text"
                      list="asset-search-tag-list"
                      value={tagQuery}
                      onChange={(event) => setTagQuery(event.target.value)}
                      onKeyDown={handleTagSearchKeyDown}
                      placeholder="Buscar tag + Enter"
                    />
                    {activeTags.size > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {Array.from(activeTags).map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => removeTagFilter(tag)}
                            className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white"
                          >
                            {tag} ×
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <datalist id="asset-search-tag-list">
                      {tagSuggestions.map((tag) => (
                        <option key={tag} value={tag} />
                      ))}
                    </datalist>
                  </div>
                ) : null}
              </th>
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
                  <option value="en_uso">En uso</option>
                  <option value="solicitado">Solicitado</option>
                  <option value="mantenimiento">Mantenim.</option>
                  <option value="pendiente_recepcion">Pend. recepción</option>
                  <option value="baja">Baja</option>
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
                  <tr
                    key={item.id}
                    className="assets-table-row"
                    role="button"
                    tabIndex={0}
                    aria-label={`Ver detalle de ${item.name}`}
                    onClick={() => router.push(`/assets/${item.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/assets/${item.id}`);
                      }
                    }}
                  >
                    {/* Asset photo — click to enlarge */}
                    <td className="col-photo">
                      {item.photoUrl ? (
                        <img
                          src={item.photoUrl}
                          alt={item.name}
                          className="grid-thumb"
                          onClick={(event) => {
                            event.stopPropagation();
                            setLightboxUrl(item.photoUrl);
                          }}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                            const next = e.currentTarget.nextElementSibling as HTMLElement | null;
                            if (next) next.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="grid-thumb-empty"
                        style={{ display: item.photoUrl ? "none" : "flex" }}
                      >
                        📦
                      </div>
                    </td>

                    {/* Name + sub-description */}
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

                    {/* Type badge */}
                    <td>
                      <span className="result-badge">
                        {TYPE_LABELS[item.assetType] || item.assetType}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td>
                      <span className={`status-badge status-${item.status}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>

                    {/* Holder with avatar */}
                    <td className="col-holder">
                      <div className="holder-cell">
                        {item.holderPicture ? (
                          <img
                            src={item.holderPicture}
                            alt={holder}
                            className="holder-avatar"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="holder-avatar-placeholder">
                            {holder.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span>{holder}</span>
                      </div>
                    </td>

                    {/* Tags — clickable pills */}
                    <td className="col-tags">
                      <div className="row-tags">
                        {item.tags?.map((t) => (
                          <button
                            key={t}
                            className={`result-tag tag-btn${activeTags.has(t) ? " tag-pill-active" : ""}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleTag(t);
                            }}
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

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="photo-lightbox"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <button className="lightbox-close" onClick={() => setLightboxUrl(null)}>✕</button>
          <img
            src={lightboxUrl}
            alt="Vista ampliada"
            className="lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
