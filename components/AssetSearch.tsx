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
  }, [allItems, filterName, filterStatus, filterHolder, activeTags]);

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
    setFilterStatus("");
    setFilterHolder("");
    setTagQuery("");
    setActiveTags(new Set());
  };

  const hasFilters = !!(filterName || filterStatus || filterHolder || activeTags.size > 0);

  const isDirectRenderableUrl = (url: string) =>
    url.startsWith("/") || url.startsWith("data:") || url.startsWith("blob:");

  const resolveAssetImageUrl = (url?: string | null) => {
    const source = String(url || "").trim();
    if (!source) return "";
    if (isDirectRenderableUrl(source)) return source;
    return `/api/ui/asset-image?url=${encodeURIComponent(source)}`;
  };

  return (
    <section className="assets-datagrid">
      {/* Header */}
      <div className="assets-datagrid-toolbar">
        <div>
          <h3 className="assets-datagrid-title">Activos registrados</h3>
          <p className="assets-datagrid-meta">
            {isLoading ? "Cargando…" : `${filtered.length} de ${allItems.length} activos`}
          </p>
        </div>
        <div className="assets-datagrid-actions">
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

      {error && <p className="assets-grid-error">{error}</p>}

      {/* Grid table */}
      <div className="assets-table-wrap">
        <table className="assets-table">
          <colgroup>
            <col className="assets-col-photo" />
            <col className="assets-col-status" />
            <col className="assets-col-holder" />
            <col className="assets-col-description" />
          </colgroup>
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
                  placeholder="Filtrar chapa/responsable…"
                  value={filterHolder}
                  onChange={(e) => setFilterHolder(e.target.value)}
                />
              </th>
              <th>
                <input
                  className="col-filter-input"
                  placeholder="Filtrar descripción…"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                />
              </th>
            </tr>
            {/* Column headers */}
            <tr className="assets-table-head">
              <th className="col-th-photo">Foto</th>
              <th>Estado</th>
              <th>Responsable</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="table-placeholder">
                  <div className="loading-spinner" style={{ margin: "0 auto" }} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="table-placeholder">
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
                const resolvedPhotoUrl = resolveAssetImageUrl(item.photoUrl);
                const resolvedHolderPhotoUrl = resolveAssetImageUrl(item.holderPicture);
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
                      {resolvedPhotoUrl ? (
                        <img
                          src={resolvedPhotoUrl}
                          data-original-src={item.photoUrl}
                          alt={item.name}
                          className="grid-thumb"
                          onClick={(event) => {
                            event.stopPropagation();
                            setLightboxUrl(resolvedPhotoUrl);
                          }}
                          onError={(e) => {
                            const image = e.currentTarget as HTMLImageElement;
                            const originalSrc = image.dataset.originalSrc || "";
                            if (originalSrc && image.src !== originalSrc) {
                              image.src = originalSrc;
                              return;
                            }
                            image.style.display = "none";
                            const next = image.nextElementSibling as HTMLElement | null;
                            if (next) next.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="grid-thumb-empty"
                        style={{ display: resolvedPhotoUrl ? "none" : "flex" }}
                      >
                        📦
                      </div>
                    </td>

                    {/* Name + sub-description */}
                    <td>
                      <span className={`status-badge status-${item.status}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>

                    {/* Holder with avatar */}
                    <td className="col-holder">
                      <div className="holder-cell">
                        {resolvedHolderPhotoUrl ? (
                          <img
                            src={resolvedHolderPhotoUrl}
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

                    {/* Description */}
                    <td className="col-name">
                      <span className="asset-name">{item.name}</span>
                      <span className="result-badge mt-1 inline-block">
                        {TYPE_LABELS[item.assetType] || item.assetType}
                      </span>
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
                      <span className="sr-only">{(item.tags || []).join(" ")}</span>
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
            data-original-src={lightboxUrl}
            alt="Vista ampliada"
            className="lightbox-img"
            onClick={(e) => e.stopPropagation()}
            onError={(event) => {
              const image = event.currentTarget as HTMLImageElement;
              const originalSrc = image.dataset.originalSrc || "";
              if (originalSrc && image.src !== originalSrc) {
                image.src = originalSrc;
              }
            }}
          />
        </div>
      )}
    </section>
  );
}
