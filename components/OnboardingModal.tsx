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
    <div className="onboarding-overlay">
      <div className="onboarding-modal glass">
        <div className="onboarding-header">
          <h2>¡Bienvenido a la Tuna!</h2>
          <p className="muted-text">
            Hola {user.name.split(' ')[0]}. Para identificarte correctamente en el inventario, por favor ingresa tu "Chapa".
          </p>
        </div>

        <form onSubmit={handleSubmit} className="onboarding-form">
          <div>
            <label htmlFor="nickname" className="input-label">
              Tu Chapa
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ej. El Bardo"
              className="input-text"
              autoFocus
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
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
