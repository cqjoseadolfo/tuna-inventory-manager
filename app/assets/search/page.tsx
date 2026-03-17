"use client";

import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import AssetSearch from "@/components/AssetSearch";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import PageHeader from "@/components/PageHeader";

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
      <section className="w-full max-w-5xl space-y-4">
        <PageHeader title="Consultar activo" backHref="/" backLabel="Volver al panel" />

        <AssetSearch />
      </section>
    </main>
  );
}
