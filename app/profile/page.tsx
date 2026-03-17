import PageHeader from "@/components/PageHeader";

export default function ProfilePage() {
  return (
    <main className="flex min-h-screen w-full items-start justify-center px-4 py-6 md:px-8">
      <section className="w-full max-w-5xl space-y-4">
        <PageHeader title="Perfil" backHref="/" backLabel="Volver al panel" />

        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm text-slate-500">Pronto verás aquí tu información personal y foto de usuario.</p>
        </div>
      </section>
    </main>
  );
}
