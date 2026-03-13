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
        <h2>Panel de Inventario</h2>
        
        <div className="dashboard-grid">
          {/* Mock stats cards, we will expand this */}
          <div className="stat-card glass">
            <h4>Total Instrumentos</h4>
            <span className="stat-value">24</span>
          </div>
          <div className="stat-card glass">
            <h4>En Préstamo</h4>
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
