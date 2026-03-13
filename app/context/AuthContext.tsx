"use client";

import { createContext, useContext, useEffect, useState } from "react";

const GOOGLE_CLIENT_ID = "328552101289-qp8k6lbe2n97svn17fga8bd8t2c19nq2.apps.googleusercontent.com";

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
  nickname?: string;
  isNewUser?: boolean;
  token?: string;
  sessionId?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  completeOnboarding: (nickname: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenClient, setTokenClient] = useState<any>(null);

  useEffect(() => {
    // Check local storage for persisted session
    const storedUser = localStorage.getItem("tuna-auth-user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Error parsing stored user", e);
      }
    }

    // Initialize Google Auth Token Client
    const initGoogleAuth = () => {
      if (typeof window !== "undefined" && (window as any).google) {
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
        setIsLoading(false);
      } else {
        setTimeout(initGoogleAuth, 500);
      }
    };

    initGoogleAuth();
  }, []);

  const fetchUserProfile = async (accessToken: string) => {
    try {
      // 1. Get data from Google
      const googleResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const googleData = await googleResponse.json();
      
      // 2. Sync with our D1 Database
      const syncResponse = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: googleData.name || googleData.given_name || "Usuario",
          email: googleData.email,
          picture: googleData.picture
        })
      });
      
      const syncData = await syncResponse.json();

      if (!syncData.success) {
        throw new Error(syncData.error || "Failed to sync user with database");
      }

      // 3. Set the combined profile
      const newUserProfile: UserProfile = {
        name: syncData.user.name,
        email: syncData.user.email,
        picture: syncData.user.picture,
        nickname: syncData.user.nickname,
        isNewUser: syncData.isNewUser || !syncData.user.nickname,
        sessionId: syncData.sessionId,
        token: accessToken,
      };

      setUser(newUserProfile);
      localStorage.setItem("tuna-auth-user", JSON.stringify(newUserProfile));
    } catch (error) {
      console.error("Error obteniendo el perfil:", error);
      alert("Hubo un error al iniciar sesión en el sistema.");
    }
  };

  const completeOnboarding = (nickname: string) => {
    if (!user) return;
    
    const updatedUser = { ...user, nickname, isNewUser: false };
    setUser(updatedUser);
    localStorage.setItem("tuna-auth-user", JSON.stringify(updatedUser));
  };

  const login = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    } else {
      console.warn("Google Auth Client not yet initialized.");
    }
  };

  const logout = () => {
    if (user && user.token && typeof window !== "undefined" && (window as any).google) {
      (window as any).google.accounts.oauth2.revoke(user.token, () => {
        console.log("Token revocado");
      });
    }
    setUser(null);
    localStorage.removeItem("tuna-auth-user");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
