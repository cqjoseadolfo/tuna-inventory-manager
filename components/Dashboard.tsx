"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../app/context/AuthContext";

type AssetItem = {
  id: string;
  status: string;
  tags: string[];
  holderEmail?: string | null;
};

type DashboardFilter = "all" | "mine" | "requested";

const DONUT_COLORS = ["#84cc16", "#06b6d4", "#f59e0b", "#8b5cf6", "#f43f5e", "#14b8a6", "#3b82f6"];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [planImageBroken, setPlanImageBroken] = useState(false);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>("all");
  const menuRef = useRef<HTMLDivElement | null>(null);

  if (!user) return null;

  const displayName = user.name?.trim() || "músico";
  const plan2026ImageUrl = "/api/ui/newsletter-image";

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

  useEffect(() => {
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

    loadDashboardAssets();
  }, []);

  const isMine = (item: AssetItem) => {
    const holder = String(item.holderEmail || "").toLowerCase().trim();
    return item.status === "bajo_responsabilidad" && holder === user.email.toLowerCase().trim();
  };

  const totalAssets = assets.length;
  const inPossessionCount = assets.filter(isMine).length;
  const requestedCount = assets.filter((item: AssetItem) => item.status === "solicitado").length;

  const filteredAssets =
    activeFilter === "mine"
      ? assets.filter(isMine)
      : activeFilter === "requested"
        ? assets.filter((item: AssetItem) => item.status === "solicitado")
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
    activeFilter === "mine" ? "En posesión" : activeFilter === "requested" ? "Solicitados" : "Activos";

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
      </button>

      {isMenuOpen && <div className="fixed inset-0 z-40 bg-slate-950/55" aria-hidden="true"></div>}

      <div className="pointer-events-none fixed inset-0 z-50" ref={menuRef} aria-hidden={!isMenuOpen}>
        <aside
          className={`pointer-events-auto absolute right-0 top-0 grid h-dvh w-[82vw] max-w-[300px] content-start gap-2 rounded-l-2xl border-l border-slate-200 bg-white p-4 shadow-2xl transition-transform duration-200 ${
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          role="menu"
          aria-label="Menú principal"
        >
          <div className="mb-1 flex items-center gap-3 border-b border-slate-200 pb-3">
            <img
              src={user.picture}
              alt="Avatar"
              className="h-11 w-11 rounded-full border-2 border-slate-200 object-cover"
            />
            <div className="min-w-0">
              <span className="block truncate text-lg font-semibold text-slate-900">{user.name}</span>
              <span className="block truncate text-sm text-slate-500">{user.email}</span>
            </div>
          </div>

          <nav className="grid" aria-label="Opciones de navegación">
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

      <section className="mb-5 pr-14 pt-4 md:pr-16">
        <p className="text-base font-medium text-slate-600">Buenos días,</p>
        <p className="text-[clamp(1.9rem,6vw,2.7rem)] font-black tracking-tight text-slate-900">{displayName} 👋</p>
      </section>

      <main className="grid gap-5">
        <section className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/assets/new"
              className="group flex min-h-44 items-center justify-center rounded-[2rem] bg-gradient-to-br from-fuchsia-500 to-pink-500 px-4 py-5 text-center shadow-[0_16px_30px_rgba(217,70,239,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(217,70,239,0.32)]"
            >
              <div className="flex flex-col items-center justify-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-white/25 text-2xl leading-none text-white">➕</span>
                <h3 className="text-base font-extrabold leading-tight text-white">Registrar activo</h3>
              </div>
            </Link>

            <Link
              href="/assets/search"
              className="group flex min-h-44 items-center justify-center rounded-[2rem] bg-gradient-to-br from-sky-500 to-blue-600 px-4 py-5 text-center shadow-[0_16px_30px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(14,165,233,0.32)]"
            >
              <div className="flex flex-col items-center justify-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-white/25 text-2xl leading-none text-white">🔎</span>
                <h3 className="text-base font-extrabold leading-tight text-white">Consultar activo</h3>
              </div>
            </Link>
          </div>
        </section>

        <section>
          <article className="flex min-h-[174px] items-stretch justify-between gap-4 rounded-[2rem] bg-[#0b1338] px-6 py-6 text-white shadow-[0_18px_30px_rgba(15,23,42,0.20)]">
            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lime-300">Newsletter</p>
                <h3 className="mt-2 text-[48px] font-black leading-[0.95]">Plan 2026</h3>
              </div>
              <p className="max-w-[18rem] text-[18px] leading-[1.25] text-slate-300">Sigue los ultimos cambios de los estatutos publicados.</p>
            </div>

            {!planImageBroken ? (
              <div className="flex w-[132px] flex-shrink-0 flex-col items-center justify-between rounded-2xl border border-white/15 px-2 py-2">
                <span className="text-[44px] font-light leading-none text-slate-300">T</span>
                <img
                  src={plan2026ImageUrl}
                  alt="Plan 2026"
                  className="h-[78px] w-[96px] rounded-xl object-cover"
                  onError={() => setPlanImageBroken(true)}
                />
              </div>
            ) : (
              <div className="grid w-[132px] flex-shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-center">
                <span className="text-xs text-slate-300">No se pudo cargar imagen</span>
              </div>
            )}
          </article>
        </section>

        <section className="grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`rounded-[1.6rem] px-3 py-4 text-center ring-1 transition ${
                activeFilter === "all"
                  ? "bg-slate-900 text-white ring-slate-900 shadow-md"
                  : "bg-white text-slate-900 ring-slate-100 shadow-sm"
              }`}
            >
              <span className="block text-3xl font-black">{totalAssets}</span>
              <h4 className={`mt-1 text-[11px] font-semibold uppercase tracking-wide ${activeFilter === "all" ? "text-slate-300" : "text-slate-500"}`}>
                Activos
              </h4>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("mine")}
              className={`rounded-[1.6rem] px-3 py-4 text-center ring-1 transition ${
                activeFilter === "mine"
                  ? "bg-slate-900 text-white ring-slate-900 shadow-md"
                  : "bg-white text-slate-900 ring-slate-100 shadow-sm"
              }`}
            >
              <span className="block text-3xl font-black">{inPossessionCount}</span>
              <h4 className={`mt-1 text-[11px] font-semibold uppercase tracking-wide ${activeFilter === "mine" ? "text-slate-300" : "text-slate-500"}`}>
                En posesión
              </h4>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("requested")}
              className={`rounded-[1.6rem] px-3 py-4 text-center ring-1 transition ${
                activeFilter === "requested"
                  ? "bg-slate-900 text-white ring-slate-900 shadow-md"
                  : "bg-white text-slate-900 ring-slate-100 shadow-sm"
              }`}
            >
              <span className="block text-3xl font-black">{requestedCount}</span>
              <h4 className={`mt-1 text-[11px] font-semibold uppercase tracking-wide ${activeFilter === "requested" ? "text-slate-300" : "text-slate-500"}`}>
                Solicitados
              </h4>
            </button>
          </div>

          {statsError && (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-100">{statsError}</p>
          )}
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

        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h3 className="mb-1 text-xl font-bold text-slate-900">Actividad Reciente</h3>
          <p className="text-slate-500">El registro de movimientos se mostrará aquí pronto...</p>
        </div>
      </main>
    </div>
  );
}
