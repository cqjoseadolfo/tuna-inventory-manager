import "./globals.css";

export const metadata = {
  title: "Demostración - Google Auth Contador",
  description: "Autenticación sin Registro con Google Identity Services",
};

import { AuthProvider } from "./context/AuthContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body className="min-h-screen bg-[radial-gradient(circle_at_15%_20%,#1d4ed8_0%,transparent_30%),radial-gradient(circle_at_85%_80%,#7c3aed_0%,transparent_30%),#0f172a] text-white antialiased">
        <AuthProvider>
          <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
            {children}
          </div>
        </AuthProvider>
        <footer className="w-full border-t border-slate-700/50 bg-slate-950/50 p-3 text-center text-xs text-slate-400 backdrop-blur">
          version: {process.env.NEXT_PUBLIC_GIT_COMMIT || 'local-dev'}
        </footer>
      </body>
    </html>
  );
}
