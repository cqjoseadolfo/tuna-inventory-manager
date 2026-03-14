"use client";

import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import AssetEntryForm from "@/components/AssetEntryForm";
import GoogleAuthButton from "@/components/GoogleAuthButton";

export default function NewAssetPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="loading-screen">
        <div className="loading-spinner"></div>
        <p className="muted-text">Cargando formulario...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app-shell">
        <section className="auth-card">
          <p className="eyebrow">Acceso requerido</p>
          <h1 className="section-title">Inicia sesión para registrar activos</h1>
          <p className="muted-text">Necesitas autenticarte para continuar con el registro.</p>
          <GoogleAuthButton />
          <Link href="/" className="text-link">Volver al inicio</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="page-shell">
        <div className="page-header glass">
          <div>
            <p className="eyebrow">Registro de activos</p>
            <h1 className="section-title">Nuevo activo</h1>
            <p className="muted-text">Primero registra la foto y luego completa los datos del activo.</p>
          </div>
          <Link href="/" className="text-link">← Volver al panel</Link>
        </div>

        <AssetEntryForm createdByEmail={user.email} createdByLabel={user.nickname || user.name} />
      </section>
    </main>
  );
}
