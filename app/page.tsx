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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-lime-500"></div>
        <p className="text-slate-500">Cargando Tuna Inventory...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center px-4 py-6 md:px-8">
      {user ? (
        <>
          <Dashboard />
          <OnboardingModal />
        </>
      ) : (
        <section className="w-full max-w-md rounded-[2rem] bg-white p-6 text-center shadow-[0_24px_50px_rgba(15,23,42,0.10)] ring-1 ring-slate-100">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-lime-600">Sistema de inventario</p>
          <h1 className="mt-2 text-4xl font-black text-slate-900">Tuna Inventory</h1>
          <p className="mt-2 text-slate-500">Inicia sesión con Google para entrar al panel.</p>
          <GoogleAuthButton />
        </section>
      )}
    </main>
  );
}
