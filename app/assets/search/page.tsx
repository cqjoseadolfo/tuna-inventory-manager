"use client";

import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import AssetSearch from "@/components/AssetSearch";
import AppHamburgerMenu from "@/components/AppHamburgerMenu";
import GoogleAuthButton from "@/components/GoogleAuthButton";

export default function SearchAssetsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="loading-screen">
        <div className="loading-spinner"></div>
        <p className="muted-text">Cargando buscador...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app-shell">
        <section className="auth-card">
          <p className="eyebrow">Acceso requerido</p>
          <h1 className="section-title">Inicia sesión para consultar activos</h1>
          <p className="muted-text">Necesitas autenticarte para continuar con la búsqueda.</p>
          <GoogleAuthButton />
          <Link href="/" className="text-link">Volver al inicio</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full items-start justify-center px-4 py-6">
      <AppHamburgerMenu />
      <section className="w-full max-w-5xl space-y-4">
        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              aria-label="Volver al panel"
              className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-xl text-slate-700"
            >
              ‹
            </Link>
            <h1 className="text-xl font-black text-slate-900">Consultar activo</h1>
            <span className="h-10 w-10" aria-hidden="true"></span>
          </div>
        </div>

        <AssetSearch />
      </section>
    </main>
  );
}
