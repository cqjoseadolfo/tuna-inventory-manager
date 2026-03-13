"use client";

import GoogleAuthButton from "../components/GoogleAuthButton";
import Dashboard from "../components/Dashboard";
import { useAuth } from "./context/AuthContext";

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  // If authenticated, show Dashboard
  if (user) {
    return <Dashboard />;
  }

  // If not authenticated, show Login View
  return (
    <>
      <div className="background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      
      <div className="container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Tuna Inventory</h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.8 }}>Acceso restringido al sistema de inventario</p>
        </header>

        <main className="card glass" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center', padding: '3rem 2rem' }}>
          <h2 style={{ marginBottom: '2rem' }}>Inicia Sesión</h2>
          <GoogleAuthButton />
        </main>
      </div>
    </>
  );
}
