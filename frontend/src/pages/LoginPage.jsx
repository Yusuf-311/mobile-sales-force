import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, USERS } from '../context/AuthContext.jsx';

const ROLE_LABELS = { mr: 'Medical Rep', dm: 'District Manager', rsm: 'Regional Sales Manager', mm: 'Marketing Manager' };
const INITIALS = (name) => name.charAt(0).toUpperCase();

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate('/call-lists', { replace: true });
  }, [user, navigate]);

  function handleSelect(selectedUser) {
    login(selectedUser);
    navigate('/call-lists', { replace: true });
  }

  return (
    <main className="login-page" id="login-page">
      <div className="login-header">
        <div className="login-logo" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h1 className="login-title">Mobile Sales Force</h1>
        <p className="login-subtitle">PT Mersifarma — Pilih akun untuk melanjutkan</p>
      </div>

      <section aria-label="Pilih pengguna">
        <div className="user-card-grid">
          {USERS.map((u) => (
            <button
              key={u.token}
              className="user-card"
              onClick={() => handleSelect(u)}
              id={`user-card-${u.token}`}
              aria-label={`Masuk sebagai ${u.userName}, ${ROLE_LABELS[u.role] || u.role}`}
            >
              <div className="user-avatar" aria-hidden="true">
                {INITIALS(u.userName)}
              </div>
              <div>
                <div className="user-name">{u.userName}</div>
                <div className="user-role-badge" style={{ marginTop: '4px' }}>
                  {ROLE_LABELS[u.role] || u.role}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
