import GoogleAuthButton from "../components/GoogleAuthButton";

export default function Home() {
  return (
    <>
      <div className="background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      
      <div className="container">
        <header>
          <h1>Autenticación sin Registro</h1>
          <p>Haz clic en el botón. Si no estás identificado, se te pedirá iniciar sesión con Google antes de realizar la acción.</p>
        </header>

        <main className="card glass">
          <GoogleAuthButton />
          
          <div id="setup-warning" className="warning-box">
            <p><strong>⚠️ Atención:</strong> Debes reemplazar <code>YOUR_GOOGLE_CLIENT_ID</code> en <code>components/GoogleAuthButton.tsx</code> por un ID de cliente válido de Google Cloud Console para ver el pop-up real de Google. Por ahora funciona en "Modo Demo".</p>
          </div>
        </main>
      </div>
    </>
  );
}
