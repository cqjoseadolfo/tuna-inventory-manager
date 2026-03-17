"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import PageHeader from "@/components/PageHeader";

type MovementItem = {
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
};

type EditLogItem = {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  edited_at: string;
  editor_nickname: string | null;
  editor_name: string | null;
  editor_email: string | null;
};

type PaginatedResponse = {
  id: string;
  name: string;
  movements: MovementItem[];
  editLogs: EditLogItem[];
  movementPagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  editLogsPagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

const PAGE_SIZE = 20;

export default function AssetHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [assetName, setAssetName] = useState("");

  const [movements, setMovements] = useState<MovementItem[]>([]);
  const [movementPage, setMovementPage] = useState(1);
  const [movementTotal, setMovementTotal] = useState(0);
  const [movementFilter, setMovementFilter] = useState("");

  const [editLogs, setEditLogs] = useState<EditLogItem[]>([]);
  const [editPage, setEditPage] = useState(1);
  const [editTotal, setEditTotal] = useState(0);
  const [editFilter, setEditFilter] = useState("");

  const loadHistory = async () => {
    if (!id) return;
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (user?.email) params.set("viewerEmail", user.email);
      params.set("movementLimit", String(PAGE_SIZE));
      params.set("movementOffset", String((movementPage - 1) * PAGE_SIZE));
      params.set("editLimit", String(PAGE_SIZE));
      params.set("editOffset", String((editPage - 1) * PAGE_SIZE));

      const response = await fetch(`/api/assets/${id}?${params.toString()}`);
      const data = (await response.json()) as PaginatedResponse & { error?: string };

      if (!response.ok || data?.error) {
        throw new Error(data?.error || "No se pudo cargar el histórico.");
      }

      setAssetName(String(data.name || "Activo"));
      setMovements(Array.isArray(data.movements) ? data.movements : []);
      setEditLogs(Array.isArray(data.editLogs) ? data.editLogs : []);
      setMovementTotal(Number(data.movementPagination?.total || 0));
      setEditTotal(Number(data.editLogsPagination?.total || 0));
    } catch (loadError: any) {
      setError(loadError?.message || "No se pudo cargar el histórico.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [id, user?.email, movementPage, editPage]);

  const movementPages = Math.max(1, Math.ceil(movementTotal / PAGE_SIZE));
  const editPages = Math.max(1, Math.ceil(editTotal / PAGE_SIZE));

  const movementRows = useMemo(() => {
    const q = movementFilter.trim().toLowerCase();
    if (!q) return movements;
    return movements.filter((item) => {
      const from = item.from_nickname || item.from_name || item.from_email || "";
      const to = item.to_nickname || item.to_name || item.to_email || "";
      return (
        String(item.movement_type || "").toLowerCase().includes(q)
        || String(item.notes || "").toLowerCase().includes(q)
        || from.toLowerCase().includes(q)
        || to.toLowerCase().includes(q)
      );
    });
  }, [movements, movementFilter]);

  const editRows = useMemo(() => {
    const q = editFilter.trim().toLowerCase();
    if (!q) return editLogs;
    return editLogs.filter((item) => {
      const editor = item.editor_nickname || item.editor_name || item.editor_email || "";
      return (
        String(item.field_name || "").toLowerCase().includes(q)
        || String(item.new_value || "").toLowerCase().includes(q)
        || String(item.old_value || "").toLowerCase().includes(q)
        || editor.toLowerCase().includes(q)
      );
    });
  }, [editLogs, editFilter]);

  return (
    <main className="flex min-h-screen w-full items-start justify-center px-4 py-6">
      <section className="w-full max-w-6xl space-y-4">
        <PageHeader
          title={`Histórico: ${assetName}`}
          backHref={`/assets/${id}`}
          backLabel="Volver a la ficha del activo"
        />

        {error ? (
          <div className="rounded-[2rem] bg-rose-50 p-4 text-sm font-medium text-rose-700 ring-1 ring-rose-200">{error}</div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900">Registro de movimientos</h2>
              <input
                value={movementFilter}
                onChange={(event) => setMovementFilter(event.target.value)}
                placeholder="Filtrar en esta página"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-base text-slate-900 sm:w-64 md:text-sm"
              />
            </div>

            <div className="max-h-[420px] w-full overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-[24%] px-3 py-2">Tipo</th>
                    <th className="w-[48%] px-3 py-2">Detalle</th>
                    <th className="w-[28%] px-3 py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td className="px-3 py-3 text-slate-500" colSpan={3}>Cargando...</td></tr>
                  ) : movementRows.length === 0 ? (
                    <tr><td className="px-3 py-3 text-slate-500" colSpan={3}>Sin resultados en esta página.</td></tr>
                  ) : movementRows.map((row) => {
                    const from = row.from_nickname || row.from_name || row.from_email || "sin responsable";
                    const to = row.to_nickname || row.to_name || row.to_email || "sin responsable";
                    const label = `${from} → ${to}`;
                    return (
                      <tr
                        key={row.id}
                        className="cursor-pointer border-t border-slate-100 align-top transition hover:bg-slate-50 focus-within:bg-slate-50"
                        tabIndex={0}
                        role="button"
                        aria-label={`Ver detalle del movimiento ${row.movement_type}`}
                        onClick={() => router.push(`/assets/${id}/history/movements/${row.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(`/assets/${id}/history/movements/${row.id}`);
                          }
                        }}
                      >
                        <td className="px-3 py-2 font-semibold text-slate-700">
                          <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap" title={row.movement_type}>{row.movement_type}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          <p className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-medium" title={row.notes || label}>{row.notes || label}</p>
                          <p className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-500" title={label}>{label}</p>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">
                          <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap" title={new Date(row.created_at).toLocaleString("es-PE")}>{new Date(row.created_at).toLocaleString("es-PE")}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">Toca un registro para ver el detalle completo.</p>

            <div className="mt-3 flex items-center justify-between gap-2 text-sm">
              <span className="text-slate-500">Página {movementPage} de {movementPages}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={movementPage <= 1}
                  onClick={() => setMovementPage((prev) => Math.max(1, prev - 1))}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={movementPage >= movementPages}
                  onClick={() => setMovementPage((prev) => Math.min(movementPages, prev + 1))}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </article>

          <article className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900">Historial de cambios</h2>
              <input
                value={editFilter}
                onChange={(event) => setEditFilter(event.target.value)}
                placeholder="Filtrar en esta página"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-base text-slate-900 sm:w-64 md:text-sm"
              />
            </div>

            <div className="max-h-[420px] w-full overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-[22%] px-3 py-2">Campo</th>
                    <th className="w-[30%] px-3 py-2">Nuevo valor</th>
                    <th className="w-[22%] px-3 py-2">Editor</th>
                    <th className="w-[26%] px-3 py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td className="px-3 py-3 text-slate-500" colSpan={4}>Cargando...</td></tr>
                  ) : editRows.length === 0 ? (
                    <tr><td className="px-3 py-3 text-slate-500" colSpan={4}>Sin resultados en esta página.</td></tr>
                  ) : editRows.map((row) => {
                    const editor = row.editor_nickname || row.editor_name || row.editor_email || "Usuario";
                    return (
                      <tr
                        key={row.id}
                        className="cursor-pointer border-t border-slate-100 align-top transition hover:bg-slate-50 focus-within:bg-slate-50"
                        tabIndex={0}
                        role="button"
                        aria-label={`Ver detalle del cambio en ${row.field_name}`}
                        onClick={() => router.push(`/assets/${id}/history/${row.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(`/assets/${id}/history/${row.id}`);
                          }
                        }}
                      >
                        <td className="px-3 py-2 font-semibold text-slate-700">
                          <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap" title={row.field_name}>{row.field_name}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap" title={row.new_value || "(vacío)"}>{row.new_value || "(vacío)"}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap" title={editor}>{editor}</span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">
                          <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap" title={new Date(row.edited_at).toLocaleString("es-PE")}>{new Date(row.edited_at).toLocaleString("es-PE")}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">Toca un registro para ver el detalle completo.</p>

            <div className="mt-3 flex items-center justify-between gap-2 text-sm">
              <span className="text-slate-500">Página {editPage} de {editPages}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={editPage <= 1}
                  onClick={() => setEditPage((prev) => Math.max(1, prev - 1))}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={editPage >= editPages}
                  onClick={() => setEditPage((prev) => Math.min(editPages, prev + 1))}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}