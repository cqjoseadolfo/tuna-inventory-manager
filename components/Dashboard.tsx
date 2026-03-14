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

        <section className="grid gap-3">
          <div className="rounded-[2rem] bg-slate-900 px-5 py-5 text-white shadow-[0_18px_30px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-3xl font-black">Sigue así</p>
                <p className="mt-1 max-w-[14rem] text-sm text-slate-300">Gestiona los activos del grupo de forma rápida y ordenada.</p>
              </div>
              <span className="rounded-full bg-lime-300 px-3 py-1 text-xs font-bold text-slate-900">Top</span>
            </div>
            <div className="mt-5 flex items-end justify-between">
              <div className="flex gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-lime-300"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-lime-300/70"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-white/30"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-white/20"></span>
              </div>
              <span className="text-6xl">🏆</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[1.6rem] bg-white px-3 py-4 text-center shadow-sm ring-1 ring-slate-100">
              <span className="block text-3xl font-black text-slate-900">{totalAssets}</span>
              <h4 className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Activos</h4>
            </div>
            <div className="rounded-[1.6rem] bg-white px-3 py-4 text-center shadow-sm ring-1 ring-slate-100">
              <span className="block text-3xl font-black text-slate-900">{onLoanAssets}</span>
              <h4 className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">En posesión</h4>
            </div>
            <div className="rounded-[1.6rem] bg-white px-3 py-4 text-center shadow-sm ring-1 ring-slate-100">
              <span className="block text-3xl font-black text-slate-900">{availableAssets}</span>
              <h4 className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Solicitados</h4>
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 md:grid-cols-[auto,1fr] md:items-center">
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold text-slate-900">Resumen gráfico por etiquetas</h3>
            <p className="text-base text-slate-500">Distribución actual de activos del grupo por categorías.</p>
          </div>

          <div className="grid gap-4 md:col-span-2 md:grid-cols-[auto,1fr] md:items-center">
            <div
              className="mx-auto grid aspect-square w-[min(240px,70vw)] place-items-center rounded-full"
              style={{
                background: `conic-gradient(${donutStops})`,
              }}
            >
              <div className="flex aspect-square w-[62%] flex-col items-center justify-center rounded-full border border-slate-200 bg-white">
                <span className="text-sm text-slate-500">Total</span>
                <strong className="text-5xl font-black text-slate-900">{totalAssets}</strong>
              </div>
            </div>

            <div className="grid gap-2">
              {tagSummary.map((item) => {
                const percentage = ((item.count / totalAssets) * 100).toFixed(1);
                return (
                  <div
                    key={item.tag}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                      <span className="font-semibold text-slate-800">{item.tag}</span>
                    </div>
                    <div className="flex items-baseline gap-2 text-slate-500">
                      <strong className="text-slate-900">{item.count}</strong>
                      <span>{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
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
