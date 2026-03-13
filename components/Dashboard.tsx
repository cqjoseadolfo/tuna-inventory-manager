"use client";

import { useAuth } from "../app/context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();

  if (!user) return null;

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
      <header className="dashboard-header glass">
        <div className="logo-area">
          <h3>Tuna Inventory</h3>
          <p className="muted-text">Control de activos musicales</p>
        </div>
        <div className="user-profile">
          <div className="user-details">
            <span className="user-name">{user.name}</span>
            <span className="user-email">{user.email}</span>
          </div>
          <img src={user.picture} alt="Avatar" className="avatar-small" />
          <button className="btn-text logout" onClick={logout}>Salir</button>
        </div>
      </header>
      
      <main className="dashboard-content">
        <section className="actions-section">
          <h2>¿Qué deseas hacer hoy?</h2>
          <p className="placeholder-text">Elige una acción para comenzar a gestionar los activos.</p>

          <div className="action-grid">
            <button
              className="action-card glass"
              onClick={() => alert("Próximo paso: formulario para registrar activo")}
            >
              <span className="action-icon">➕</span>
              <h3>Registrar un activo</h3>
              <p>Crear una nueva ficha de instrumento o recurso del inventario.</p>
            </button>

            <button
              className="action-card glass"
              onClick={() => alert("Próximo paso: búsqueda y consulta de activos")}
            >
              <span className="action-icon">🔎</span>
              <h3>Consultar por un activo</h3>
              <p>Buscar por nombre, código o estado para ver su detalle.</p>
            </button>
          </div>
        </section>

        <section className="data-section">
          <div className="dashboard-grid">
            <div className="stat-card stat-total" style={{ flex: `${Math.max(totalAssets, 1)} 1 0` }}>
              <h4>Total activos</h4>
              <span className="stat-value">{totalAssets}</span>
            </div>
            <div className="stat-card stat-responsibility" style={{ flex: `${Math.max(onLoanAssets, 1)} 1 0` }}>
              <h4>Bajo responsabilidad</h4>
              <span className="stat-value">{onLoanAssets}</span>
            </div>
            <div className="stat-card stat-requested" style={{ flex: `${Math.max(availableAssets, 1)} 1 0` }}>
              <h4>Solicitados</h4>
              <span className="stat-value">{availableAssets}</span>
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
