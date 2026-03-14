"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../app/context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  if (!user) return null;

  const displayName = user.name?.trim() || "músico";

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

  const tagSummary = [
    { tag: "#instrumentos", count: 14, color: "#60a5fa" },
    { tag: "#reconocimientos", count: 5, color: "#f59e0b" },
    { tag: "#trofeos", count: 3, color: "#a78bfa" },
    { tag: "#uniformes", count: 2, color: "#34d399" },
  ];

  const totalAssets = tagSummary.reduce((acc, item) => acc + item.count, 0);
  const onLoanAssets = 5;
  const availableAssets = Math.max(totalAssets - onLoanAssets, 0);

  const donutStops = tagSummary
    .map((item, index, arr) => {
      const start = arr.slice(0, index).reduce((acc, current) => acc + current.count, 0);
      const end = start + item.count;
      const startPct = ((start / totalAssets) * 100).toFixed(2);
      const endPct = ((end / totalAssets) * 100).toFixed(2);
      return `${item.color} ${startPct}% ${endPct}%`;
    })
    .join(", ");

  return (
    <div className="relative w-full max-w-5xl">
      <button
        type="button"
        className="fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-slate-500/40 bg-slate-900/70 text-xl text-white shadow-lg backdrop-blur transition hover:bg-blue-900/40 md:right-6 md:top-5"
        aria-label="Abrir menú"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((prev) => !prev)}
      >
        ☰
      </button>

      {isMenuOpen && <div className="fixed inset-0 z-40 bg-slate-950/65 backdrop-blur-[2px]" aria-hidden="true"></div>}

      <div className="pointer-events-none fixed inset-0 z-50" ref={menuRef} aria-hidden={!isMenuOpen}>
        <aside
          className={`pointer-events-auto absolute right-0 top-0 grid h-dvh w-[82vw] max-w-[300px] content-start gap-2 rounded-l-2xl border-l border-slate-400/20 bg-slate-900/80 p-4 shadow-2xl backdrop-blur-xl transition-transform duration-200 ${
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          role="menu"
          aria-label="Menú principal"
        >
          <div className="mb-1 flex items-center gap-3 border-b border-slate-500/30 pb-3">
            <img
              src={user.picture}
              alt="Avatar"
              className="h-11 w-11 rounded-full border-2 border-white/20 object-cover"
            />
            <div className="min-w-0">
              <span className="block truncate text-lg font-semibold text-white">{user.name}</span>
              <span className="block truncate text-sm text-slate-300">{user.email}</span>
            </div>
          </div>

          <nav className="grid" aria-label="Opciones de navegación">
            <Link
              href="/profile"
              className="border-b border-slate-600/40 py-3 text-base font-medium text-slate-100 transition hover:text-blue-300"
              role="menuitem"
              onClick={() => setIsMenuOpen(false)}
            >
              Perfil
            </Link>
            <Link
              href="/settings"
              className="border-b border-slate-600/40 py-3 text-base font-medium text-slate-100 transition hover:text-blue-300"
              role="menuitem"
              onClick={() => setIsMenuOpen(false)}
            >
              Configuraciones
            </Link>
            <button
              className="border-b border-slate-600/40 py-3 text-left text-base font-medium text-rose-200 transition hover:text-rose-300"
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

      <section className="mb-2 pr-14 pt-1 md:pr-16">
        <p className="text-[clamp(1.6rem,5vw,2.2rem)] font-extrabold tracking-tight text-white">Hola, {displayName} 👋</p>
        <p className="text-[1.65rem] text-slate-300">¿Qué deseas gestionar hoy?</p>
      </section>

      <main className="grid gap-4">
        <section className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/assets/new"
              className="group flex min-h-28 items-center justify-center rounded-3xl border border-blue-300/30 bg-gradient-to-br from-blue-700/35 via-blue-700/20 to-slate-900/80 px-3 py-4 text-center shadow-[0_18px_35px_rgba(10,20,55,0.35)] backdrop-blur transition hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl leading-none">➕</span>
                <h3 className="text-base font-extrabold leading-tight text-white">Registrar activo</h3>
              </div>
            </Link>

            <Link
              href="/assets/search"
              className="group flex min-h-28 items-center justify-center rounded-3xl border border-cyan-300/30 bg-gradient-to-br from-cyan-700/30 via-blue-900/25 to-slate-900/85 px-3 py-4 text-center shadow-[0_18px_35px_rgba(4,24,49,0.38)] backdrop-blur transition hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl leading-none">🔎</span>
                <h3 className="text-base font-extrabold leading-tight text-white">Consultar activo</h3>
              </div>
            </Link>
          </div>
        </section>

        <section className="mt-3 border-t border-slate-500/30 pt-4">
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            <div className="rounded-2xl border border-blue-300/35 bg-gradient-to-br from-blue-600/30 to-slate-900/80 px-2 py-3 text-center">
              <span className="block text-3xl font-extrabold text-white">{totalAssets}</span>
              <h4 className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">Total activos</h4>
            </div>
            <div className="rounded-2xl border border-amber-300/35 bg-gradient-to-br from-amber-600/25 to-slate-900/80 px-2 py-3 text-center">
              <span className="block text-3xl font-extrabold text-white">{onLoanAssets}</span>
              <h4 className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">En posesión</h4>
            </div>
            <div className="rounded-2xl border border-emerald-300/35 bg-gradient-to-br from-emerald-600/25 to-slate-900/80 px-2 py-3 text-center">
              <span className="block text-3xl font-extrabold text-white">{availableAssets}</span>
              <h4 className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">Solicitados</h4>
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-3xl border border-slate-400/25 bg-slate-900/55 p-4 shadow-[0_20px_40px_rgba(2,8,25,0.45)] backdrop-blur-lg md:grid-cols-[auto,1fr] md:items-center">
          <div className="md:col-span-2">
            <h3 className="text-3xl font-bold text-white">Resumen gráfico por etiquetas</h3>
            <p className="text-2xl text-slate-300">Distribución actual de activos del grupo por categorías.</p>
          </div>

          <div className="grid gap-4 md:col-span-2 md:grid-cols-[auto,1fr] md:items-center">
            <div
              className="mx-auto grid aspect-square w-[min(240px,70vw)] place-items-center rounded-full"
              style={{
                background: `conic-gradient(${donutStops})`,
              }}
            >
              <div className="flex aspect-square w-[62%] flex-col items-center justify-center rounded-full border border-slate-400/30 bg-slate-800/85">
                <span className="text-sm text-slate-300">Total</span>
                <strong className="text-5xl font-black text-white">{totalAssets}</strong>
              </div>
            </div>

            <div className="grid gap-2">
              {tagSummary.map((item) => {
                const percentage = ((item.count / totalAssets) * 100).toFixed(1);
                return (
                  <div
                    key={item.tag}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-500/30 bg-slate-900/55 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                      <span className="font-semibold text-white">{item.tag}</span>
                    </div>
                    <div className="flex items-baseline gap-2 text-slate-300">
                      <strong className="text-white">{item.count}</strong>
                      <span>{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="rounded-2xl border border-slate-500/30 bg-slate-900/50 p-4 backdrop-blur">
          <h3 className="mb-1 text-xl font-bold text-white">Actividad Reciente</h3>
          <p className="text-slate-300">El registro de movimientos se mostrará aquí pronto...</p>
        </div>
      </main>
    </div>
  );
}
