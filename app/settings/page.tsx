import Link from "next/link";

export default function SettingsPage() {
  return (
    <main className="app-shell">
      <section className="page-shell">
        <header className="page-header glass">
          <div>
            <p className="eyebrow">Configuraciones</p>
            <h1 className="section-title">Ajustes de la app</h1>
            <p className="muted-text">Aquí podrás personalizar preferencias del sistema en próximas versiones.</p>
          </div>
          <Link href="/" className="text-link">
            ← Volver al inicio
          </Link>
        </header>
      </section>
    </main>
  );
}
