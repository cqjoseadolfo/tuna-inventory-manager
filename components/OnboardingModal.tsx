"use client";

import { useState } from "react";
import { useAuth } from "../app/context/AuthContext";

export default function OnboardingModal() {
  const { user, completeOnboarding } = useAuth();
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!user || (!user.isNewUser && user.nickname)) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError("Por favor, ingresa tu chapa.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, nickname: nickname.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        completeOnboarding(nickname.trim());
      } else {
        throw new Error(data.error || "Ocurrió un error al guardar tu chapa.");
      }
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">¡Bienvenido a la Tuna!</h2>
          <p className="text-gray-400">
            Hola {user.name.split(' ')[0]}. Para identificarte correctamente en el inventario, por favor ingresa tu "Chapa".
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-300 mb-1">
              Tu Chapa
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ej. El Bardo"
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              autoFocus
            />
          </div>

          {error && <p className="text-red-400 text-sm animate-pulse">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3 px-4 rounded-lg transition-all transform active:scale-[0.98] disabled:opacity-70 flex items-center justify-center"
          >
            {isSubmitting ? (
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : "Comenzar"}
          </button>
        </form>
      </div>
    </div>
  );
}
