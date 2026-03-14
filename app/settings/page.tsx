import Link from "next/link";

export default function SettingsPage() {
  return (
    <main className="flex min-h-screen w-full items-start justify-center px-4 py-6 md:px-8">
      <section className="w-full max-w-5xl">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-400/20 bg-slate-900/70 p-4 shadow-[0_20px_40px_rgba(2,8,25,0.45)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-200">Configuraciones</p>
            <h1 className="mt-1 text-3xl font-bold text-white">Ajustes de la app</h1>
            <p className="mt-1 text-slate-300">Aquí podrás personalizar preferencias del sistema en próximas versiones.</p>
          </div>
          <Link href="/" className="font-semibold text-blue-200 transition hover:text-blue-100">
            ← Volver al inicio
          </Link>
        </header>
      </section>
    </main>
  );
}
