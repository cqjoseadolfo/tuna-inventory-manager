"use client";

import GoogleAuthButton from "@/components/GoogleAuthButton";
import Dashboard from "@/components/Dashboard";
import OnboardingModal from "@/components/OnboardingModal";
import { useAuth } from "@/app/context/AuthContext";

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900">
      {user ? (
        <>
          <Dashboard />
          <OnboardingModal />
        </>
      ) : (
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-gray-700">
          <h1 className="text-3xl font-bold mb-6 text-white">Tuna Inventory</h1>
          <p className="text-gray-400 mb-8">Inicia sesión para acceder.</p>
          <GoogleAuthButton />
        </div>
      )}
    </main>
  );
}
