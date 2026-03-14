"use client";

import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import AssetEntryForm from "@/components/AssetEntryForm";
import GoogleAuthButton from "@/components/GoogleAuthButton";

export default function NewAssetPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center gap-3 px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-lime-500"></div>
        <p className="text-slate-500">Cargando formulario...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center px-4 py-6">
        <section className="w-full max-w-md rounded-[2rem] bg-white p-6 text-center shadow-[0_24px_50px_rgba(15,23,42,0.10)] ring-1 ring-slate-100">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-lime-600">Acceso requerido</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Inicia sesión para registrar activos</h1>
          <p className="mt-2 text-slate-500">Necesitas autenticarte para continuar con el registro.</p>
          <GoogleAuthButton />
          <Link href="/" className="mt-4 inline-block font-semibold text-slate-600">Volver al inicio</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full items-start justify-center px-4 py-6">
      <section className="w-full max-w-xl space-y-4">
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-lime-600">Registro de activos</p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">Nuevo activo</h1>
            <Link href="/" className="mt-2 inline-block text-sm font-semibold text-slate-500 hover:text-slate-700">← Volver al panel</Link>
          </div>
        </div>

        <AssetEntryForm createdByEmail={user.email} createdByLabel={user.nickname || user.name} />
      </section>
    </main>
  );
}
