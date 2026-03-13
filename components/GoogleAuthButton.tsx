"use client";

import { useEffect, useState } from "react";

// Mismo ID de demostración
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";

interface UserProfile {
  name: string;
  email: string;
  picture: string;
  token?: string;
}

export default function GoogleAuthButton() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [counter, setCounter] = useState(0);
  const [tokenClient, setTokenClient] = useState<any>(null);

  useEffect(() => {
    // Inicializar Google Auth
    const initGoogleAuth = () => {
      if (typeof window !== "undefined" && (window as any).google) {
        if (GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID") {
          console.warn("Por favor configura tu GOOGLE_CLIENT_ID");
        } else {
            const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
            callback: (tokenResponse: any) => {
              if (tokenResponse && tokenResponse.access_token) {
                fetchUserProfile(tokenResponse.access_token);
              }
            },
          });
          setTokenClient(client);
        }
      } else {
        setTimeout(initGoogleAuth, 500);
      }
    };
    initGoogleAuth();
  }, []);

  const fetchUserProfile = async (accessToken: string) => {
    try {
      const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      setCurrentUser({
        name: data.name || data.given_name || "Usuario",
        email: data.email,
        picture: data.picture,
        token: accessToken,
      });
      performAction();
    } catch (error) {
      console.error("Error obteniendo el perfil:", error);
      alert("Hubo un error al obtener los datos de la cuenta.");
    }
  };

  const performAction = () => {
    setCounter((prev) => prev + 1);
  };

  const handleActionClick = () => {
    if (GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID") {
      if (!currentUser) {
        alert("⚠️ MODO DEMO:\n\nComo no has configurado tu GOOGLE_CLIENT_ID aún, simularemos que iniciaste sesión con Google para ver cómo funciona el flujo.");
        setCurrentUser({
          name: "Tuno Demostrador",
          email: "demo@tuno.com",
          picture: "https://ui-avatars.com/api/?name=Tuno+Demo&background=3b82f6&color=fff&size=128",
        });
        performAction();
      } else {
        performAction();
      }
      return;
    }

    if (!currentUser) {
      if (tokenClient) {
          tokenClient.requestAccessToken();
      }
    } else {
      performAction();
    }
  };

  const handleLogout = () => {
    if (currentUser && currentUser.token) {
      if (typeof window !== "undefined" && (window as any).google) {
        (window as any).google.accounts.oauth2.revoke(currentUser.token, () => {
          console.log("Token revocado");
        });
      }
    }
    setCurrentUser(null);
  };

  return (
    <>
      <div id="user-info" className={`user-info ${!currentUser ? "hidden" : ""}`}>
         {currentUser && (
           <>
             <img id="user-avatar" src={currentUser.picture} alt="Avatar" className="avatar" />
             <p>Hola, <strong id="user-name">{currentUser.name}</strong>!</p>
             <button id="logout-btn" className="btn-text" onClick={handleLogout}>Cerrar sesión</button>
           </>
         )}
      </div>

      <div className="counter-display">
        <span id="counter-value">{counter}</span>
        <span className="counter-label">Votos Registrados</span>
      </div>

      <button id="action-btn" className="btn-primary" onClick={handleActionClick}>
        <svg viewBox="0 0 24 24" className="icon">
          <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        <span id="btn-text-content">{currentUser ? "Votar / Incrementar" : "Votar (Requiere Login)"}</span>
      </button>
    </>
  );
}
