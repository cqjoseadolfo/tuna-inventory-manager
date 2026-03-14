"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../app/context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  if (!user) return null;

  const displayName = user.name?.trim() || "músico";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isMenuOpen) return;
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousOverflow || "";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  const tagSummary = [
    { tag: "#instrumentos", count: 14, color: "#60a5fa" },
    { tag: "#reconocimientos", count: 5, color: "#f59e0b" },
    { tag: "#trofeos", count: 3, color: "#a78bfa" },
    { tag: "#uniformes", count: 2, color: "#34d399" },
  ];

  const totalAssets = tagSummary.reduce((acc, item) => acc + item.count, 0);
  const onLoanAssets = 5;
  const availableAssets = Math.max(totalAssets - onLoanAssets, 0);

  const donutStops = tagSummary
    .map((item, index, arr) => {
      const start = arr.slice(0, index).reduce((acc, current) => acc + current.count, 0);
      const end = start + item.count;
      const startPct = ((start / totalAssets) * 100).toFixed(2);
      const endPct = ((end / totalAssets) * 100).toFixed(2);
      return `${item.color} ${startPct}% ${endPct}%`;
    })
    .join(", ");

  return (
    <div className="dashboard-container">
      <button
        type="button"
        className="hamburger-btn floating-menu-trigger"
        aria-label="Abrir menú"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((prev) => !prev)}
      >
        ☰
      </button>

      {isMenuOpen && <div className="menu-overlay" aria-hidden="true"></div>}

      <div className="menu-panel-drawer" ref={menuRef} aria-hidden={!isMenuOpen}>
        <aside className={`menu-panel glass ${isMenuOpen ? "menu-panel-open" : ""}`} role="menu" aria-label="Menú principal">
          <div className="menu-profile-block">
            <img src={user.picture} alt="Avatar" className="avatar-small" />
            <div className="user-details">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
          </div>

          <nav className="menu-nav" aria-label="Opciones de navegación">
            <Link href="/profile" className="menu-nav-item" role="menuitem" onClick={() => setIsMenuOpen(false)}>
              Perfil
            </Link>
            <Link href="/settings" className="menu-nav-item" role="menuitem" onClick={() => setIsMenuOpen(false)}>
              Configuraciones
            </Link>
            <button
              className="menu-nav-item menu-logout"
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false);
                logout();
              }}
            >
              Salir
            </button>
          </nav>
        </aside>
      </div>

      <section className="dashboard-intro">
        <p className="greeting-text">Hola, {displayName} 👋</p>
        <p className="muted-text">¿Qué deseas gestionar hoy?</p>
      </section>
      
      <main className="dashboard-content">
        <section className="actions-section">
          <div className="main-action-grid">
            <Link
              href="/assets/new"
              className="action-card glass action-card-primary"
            >
              <div className="action-title-wrap">
                <span className="action-icon">➕</span>
                <h3>Registrar activo</h3>
              </div>
            </Link>

            <Link
              href="/assets/search"
              className="action-card glass action-card-secondary"
            >
              <div className="action-title-wrap">
                <span className="action-icon">🔎</span>
                <h3>Consultar activo</h3>
              </div>
            </Link>
          </div>
        </section>

        <section className="data-section">
          <div className="dashboard-grid">
            <div className="stat-card stat-total" style={{ flex: `${Math.max(totalAssets, 1)} 1 0` }}>
              <span className="stat-value">{totalAssets}</span>
              <h4>Total activos</h4>
            </div>
            <div className="stat-card stat-responsibility" style={{ flex: `${Math.max(onLoanAssets, 1)} 1 0` }}>
              <span className="stat-value">{onLoanAssets}</span>
              <h4>En posesión</h4>
            </div>
            <div className="stat-card stat-requested" style={{ flex: `${Math.max(availableAssets, 1)} 1 0` }}>
              <span className="stat-value">{availableAssets}</span>
              <h4>Solicitados</h4>
            </div>
          </div>
        </section>

        <section className="tag-summary glass">
          <div className="tag-summary-header">
            <h3>Resumen gráfico por etiquetas</h3>
            <p className="placeholder-text">Distribución actual de activos del grupo por categorías.</p>
          </div>

          <div className="tag-summary-content">
            <div
              className="donut-chart"
              style={{
                background: `conic-gradient(${donutStops})`,
              }}
            >
              <div className="donut-center">
                <span>Total</span>
                <strong>{totalAssets}</strong>
              </div>
            </div>

            <div className="tag-legend">
              {tagSummary.map((item) => {
                const percentage = ((item.count / totalAssets) * 100).toFixed(1);
                return (
                  <div key={item.tag} className="tag-row">
                    <div className="tag-label-group">
                      <span className="tag-dot" style={{ backgroundColor: item.color }}></span>
                      <span className="tag-name">{item.tag}</span>
                    </div>
                    <div className="tag-values">
                      <strong>{item.count}</strong>
                      <span>{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="recent-activity glass">
          <h3>Actividad Reciente</h3>
          <p className="placeholder-text">El registro de movimientos se mostrará aquí pronto...</p>
        </div>
      </main>
    </div>
  );
}
