"use client";

import GoogleAuthButton from "@/components/GoogleAuthButton";
import Dashboard from "@/components/Dashboard";
import OnboardingModal from "@/components/OnboardingModal";
import { useAuth } from "@/app/context/AuthContext";

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center gap-3 px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-400/30 border-t-blue-500"></div>
        <p className="text-slate-300">Cargando Tuna Inventory...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center px-4 py-4 md:px-8">
      {user ? (
        <>
          <Dashboard />
          <OnboardingModal />
        </>
      ) : (
        <section className="w-full max-w-md rounded-2xl border border-slate-400/20 bg-slate-900/75 p-6 text-center shadow-[0_20px_45px_rgba(2,8,23,0.45)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-200">Sistema de inventario</p>
          <h1 className="mt-2 text-4xl font-bold text-white">Tuna Inventory</h1>
          <p className="mt-2 text-slate-300">Inicia sesión con Google para entrar al panel.</p>
          <GoogleAuthButton />
        </section>
      )}
    </main>
  );
}
