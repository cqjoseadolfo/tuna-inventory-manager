"use client";

import { useAuth } from "../app/context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();

  if (!user) return null;

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

        <div className="dashboard-grid">
          <div className="stat-card glass">
            <h4>Total activos</h4>
            <span className="stat-value">24</span>
          </div>
          <div className="stat-card glass">
            <h4>En préstamo</h4>
            <span className="stat-value text-accent">5</span>
          </div>
          <div className="stat-card glass">
            <h4>Disponibles</h4>
            <span className="stat-value text-success">19</span>
          </div>
        </div>

        <div className="recent-activity glass">
          <h3>Actividad Reciente</h3>
          <p className="placeholder-text">El registro de movimientos se mostrará aquí pronto...</p>
        </div>
      </main>
    </div>
  );
}
