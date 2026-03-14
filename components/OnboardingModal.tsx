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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/35 p-4">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-[0_24px_50px_rgba(15,23,42,0.16)] ring-1 ring-slate-100">
        <div className="mb-4">
          <h2 className="text-3xl font-black text-slate-900">¡Bienvenido a la Tuna!</h2>
          <p className="mt-2 text-slate-500">
            Hola {user.name.split(' ')[0]}. Para identificarte correctamente en el inventario, por favor ingresa tu "Chapa".
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <label htmlFor="nickname" className="mb-1.5 block text-sm font-medium text-slate-700">
              Tu Chapa
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ej. El Bardo"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-lime-400 focus:bg-white focus:ring-2 focus:ring-lime-200"
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-rose-500">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-lime-400 px-4 py-3 text-base font-bold text-slate-900 transition hover:-translate-y-0.5 hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-70"
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
