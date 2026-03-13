import "./globals.css";

export const metadata = {
  title: "Demostración - Google Auth Contador",
  description: "Autenticación sin Registro con Google Identity Services",
};

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
      <body>{children}</body>
    </html>
  );
}
