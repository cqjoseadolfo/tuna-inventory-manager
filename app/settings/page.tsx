import Link from "next/link";
import AppHamburgerMenu from "@/components/AppHamburgerMenu";

export default function SettingsPage() {
  return (
    <main className="flex min-h-screen w-full items-start justify-center px-4 py-6 md:px-8">
      <AppHamburgerMenu />
      <section className="w-full max-w-5xl space-y-4">
        <header className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              aria-label="Volver al panel"
              className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-xl text-slate-700"
            >
              ‹
            </Link>
            <h1 className="text-xl font-black text-slate-900">Configuraciones</h1>
            <span className="h-10 w-10" aria-hidden="true"></span>
          </div>
        </header>

        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm text-slate-500">Aquí podrás personalizar preferencias del sistema en próximas versiones.</p>
        </div>
      </section>
    </main>
  );
}
