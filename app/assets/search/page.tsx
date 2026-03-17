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
    <main className="app-shell">
      <AppHamburgerMenu />
      <section className="page-shell">
        <div className="page-header glass">
          <div>
            <p className="eyebrow">Consulta de activos</p>
            <h1 className="section-title">Buscar activo</h1>
          </div>
          <Link href="/" className="text-link">← Volver al panel</Link>
        </div>

        <AssetSearch />
      </section>
    </main>
  );
}
