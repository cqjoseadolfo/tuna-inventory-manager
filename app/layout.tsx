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
      <body className="min-h-screen bg-[linear-gradient(180deg,#f7f8f2_0%,#eef3e7_100%)] text-slate-900 antialiased">
        <AuthProvider>
          <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
            {children}
          </div>
        </AuthProvider>
        <footer className="w-full border-t border-slate-200 bg-white/80 p-3 text-center text-xs text-slate-500">
          version: {process.env.NEXT_PUBLIC_GIT_COMMIT || 'local-dev'}
        </footer>
      </body>
    </html>
  );
}
