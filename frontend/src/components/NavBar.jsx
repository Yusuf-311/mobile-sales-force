import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_LABELS = { mr: 'MR', dm: 'DM', rsm: 'RSM', mm: 'MM' };

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

        {/* Hamburger Toggle */}
        <button className="navbar-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu" aria-expanded={isMenuOpen}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
            {isMenuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </>
            )}
          </svg>
        </button>

        {/* Navigation Wrapper */}
        <div className={`navbar-collapse ${isMenuOpen ? 'open' : ''}`}>
          {/* Navigation links */}
          <nav className="navbar-links" aria-label="Navigasi utama">
            <NavLink
              to="/call-lists"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              id="nav-call-lists"
              onClick={() => setIsMenuOpen(false)}
            >
              Call List
            </NavLink>
            {isMR && (
              <NavLink
                to="/call-plans"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                id="nav-call-plans"
                onClick={() => setIsMenuOpen(false)}
              >
                Call Plan
              </NavLink>
            )}
            {isMR && (
              <NavLink
                to="/call-actuals"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                id="nav-call-actuals"
                onClick={() => setIsMenuOpen(false)}
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
      </div>
    </header>
  );
}
