"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

type AppHamburgerMenuProps = {
  inline?: boolean;
};

export default function AppHamburgerMenu({ inline = false }: AppHamburgerMenuProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen || !menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = isOpen ? "hidden" : previousOverflow || "";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        className={
          inline
            ? "z-50 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-xl text-slate-900 shadow-sm transition hover:shadow-md"
            : "fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-xl text-slate-900 shadow-sm transition hover:shadow-md md:right-6 md:top-5"
        }
        aria-label="Abrir menú"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        ☰
      </button>

      {isOpen ? <div className="fixed inset-0 z-40 bg-slate-950/55" aria-hidden="true"></div> : null}

      <div className="pointer-events-none fixed inset-0 z-50" ref={menuRef} aria-hidden={!isOpen}>
        <aside
          className={`pointer-events-auto absolute right-0 top-0 grid h-dvh w-[82vw] max-w-[340px] content-start gap-2 overflow-y-auto rounded-l-2xl border-l border-slate-200 bg-white p-4 shadow-2xl transition-transform duration-200 ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
          role="menu"
          aria-label="Menú principal"
        >
          <div className="mb-1 flex items-center gap-3 border-b border-slate-200 pb-3">
            <img
              src={user.picture}
              alt="Avatar"
              className="h-11 w-11 rounded-full border-2 border-slate-200 object-cover"
            />
            <div className="min-w-0">
              <span className="block truncate text-lg font-semibold text-slate-900">{user.name}</span>
              <span className="block truncate text-sm text-slate-500">{user.email}</span>
            </div>
          </div>

          <nav className="grid" aria-label="Opciones de navegación">
            <Link href="/" className="border-b border-slate-200 py-3 text-base font-medium text-slate-700 transition hover:text-blue-600" role="menuitem">Home</Link>
            <Link href="/assets/new" className="border-b border-slate-200 py-3 text-base font-medium text-slate-700 transition hover:text-blue-600" role="menuitem">Nuevo activo</Link>
            <Link href="/assets/search" className="border-b border-slate-200 py-3 text-base font-medium text-slate-700 transition hover:text-blue-600" role="menuitem">Consultar activo</Link>
            <Link href="/requests" className="border-b border-slate-200 py-3 text-base font-medium text-slate-700 transition hover:text-blue-600" role="menuitem">Solicitudes</Link>
            <Link href="/profile" className="border-b border-slate-200 py-3 text-base font-medium text-slate-700 transition hover:text-blue-600" role="menuitem">Perfil</Link>
            <Link href="/settings" className="border-b border-slate-200 py-3 text-base font-medium text-slate-700 transition hover:text-blue-600" role="menuitem">Configuraciones</Link>
            <button
              className="border-b border-slate-200 py-3 text-left text-base font-medium text-rose-500 transition hover:text-rose-600"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
            >
              Salir
            </button>
          </nav>
        </aside>
      </div>
    </>
  );
}