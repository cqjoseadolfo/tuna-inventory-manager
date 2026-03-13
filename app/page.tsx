"use client";

import GoogleAuthButton from "@/components/GoogleAuthButton";
import Dashboard from "@/components/Dashboard";
import OnboardingModal from "@/components/OnboardingModal";
import { useAuth } from "@/app/context/AuthContext";

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="loading-screen">
        <div className="loading-spinner"></div>
        <p className="muted-text">Cargando Tuna Inventory...</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      {user ? (
        <>
          <Dashboard />
          <OnboardingModal />
        </>
      ) : (
        <section className="auth-card">
          <p className="eyebrow">Sistema de inventario</p>
          <h1 className="section-title">Tuna Inventory</h1>
          <p className="muted-text">Inicia sesión con Google para entrar al panel.</p>
          <GoogleAuthButton />
        </section>
      )}
    </main>
  );
}
