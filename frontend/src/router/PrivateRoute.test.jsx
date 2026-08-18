import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { PrivateRoute } from '../router/PrivateRoute.jsx';

function renderWithAuth(user, initialPath = '/protected') {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthContext.Provider value={{ user, login: vi.fn(), logout: vi.fn() }}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/protected"
            element={
              <PrivateRoute>
                <div>Protected Content</div>
              </PrivateRoute>
            }
          />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('PrivateRoute', () => {
  it('redirects unauthenticated user to /login', () => {
    renderWithAuth(null);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    const user = { token: 'token-mr1', role: 'mr', userName: 'Andi' };
    renderWithAuth(user);
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
