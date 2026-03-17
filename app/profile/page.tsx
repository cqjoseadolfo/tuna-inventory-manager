import Link from "next/link";
import AppHamburgerMenu from "@/components/AppHamburgerMenu";

export default function ProfilePage() {
  return (
    <main className="flex min-h-screen w-full items-start justify-center px-4 py-6 md:px-8">
      <AppHamburgerMenu />
      <section className="w-full max-w-5xl">
        <header className="flex flex-col gap-4 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-lime-600">Perfil</p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">Tu perfil</h1>
            <p className="mt-1 text-slate-500">Pronto verás aquí tu información personal y foto de usuario.</p>
          </div>
          <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-slate-700">
            ← Volver al panel
          </Link>
        </header>
      </section>
    </main>
  );
}
