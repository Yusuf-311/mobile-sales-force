import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_LABELS = { mr: 'MR', dm: 'DM', rsm: 'RSM', mm: 'MM' };

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const isMR = user.role === 'mr';

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <span className="navbar-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          MSF
        </span>

        {/* Navigation links */}
        <nav className="navbar-links" aria-label="Navigasi utama">
          <NavLink
            to="/call-lists"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            id="nav-call-lists"
          >
            Call List
          </NavLink>
          {isMR && (
            <NavLink
              to="/call-plans"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              id="nav-call-plans"
            >
              Call Plan
            </NavLink>
          )}
          {isMR && (
            <NavLink
              to="/call-actuals"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              id="nav-call-actuals"
            >
              Call Actual
            </NavLink>
          )}
        </nav>

        {/* User info + logout */}
        <div className="navbar-user">
          <div className="user-chip">
            <span>{user.userName}</span>
            <span className="user-role-badge">{ROLE_LABELS[user.role] || user.role}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout} id="btn-logout">
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
}
