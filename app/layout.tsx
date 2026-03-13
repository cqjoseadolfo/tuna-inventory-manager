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
      <body className="flex flex-col min-h-screen">
        <AuthProvider>
          <div className="flex-grow">
            {children}
          </div>
        </AuthProvider>
        <footer className="w-full text-center p-3 text-xs text-gray-500 bg-gray-900 border-t border-gray-800">
          version: {process.env.NEXT_PUBLIC_GIT_COMMIT || 'local-dev'}
        </footer>
      </body>
    </html>
  );
}
