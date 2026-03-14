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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-400/20 bg-slate-900/85 p-5 shadow-[0_20px_45px_rgba(2,8,25,0.5)] backdrop-blur-xl">
        <div className="mb-4">
          <h2 className="text-3xl font-bold text-white">¡Bienvenido a la Tuna!</h2>
          <p className="mt-1 text-slate-300">
            Hola {user.name.split(' ')[0]}. Para identificarte correctamente en el inventario, por favor ingresa tu "Chapa".
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <label htmlFor="nickname" className="mb-1 block text-sm text-slate-200">
              Tu Chapa
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ej. El Bardo"
              className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-3 text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-rose-300">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_12px_25px_rgba(37,99,235,0.45)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (
              "Guardando..."
            ) : "Comenzar"}
          </button>
        </form>
      </div>
    </div>
  );
}
