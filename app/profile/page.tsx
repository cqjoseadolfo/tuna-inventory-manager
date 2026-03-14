import Link from "next/link";

export default function ProfilePage() {
  return (
    <main className="app-shell">
      <section className="page-shell">
        <header className="page-header glass">
          <div>
            <p className="eyebrow">Perfil</p>
            <h1 className="section-title">Tu perfil</h1>
            <p className="muted-text">Pronto verás aquí tu información personal y foto de usuario.</p>
          </div>
          <Link href="/" className="text-link">
            ← Volver al inicio
          </Link>
        </header>
      </section>
    </main>
  );
}
