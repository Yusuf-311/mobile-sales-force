import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { ToastContext } from '../context/ToastContext.jsx';
import LoginPage from '../pages/LoginPage.jsx';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderLoginPage(user = null) {
  const login = vi.fn();
  const showToast = vi.fn();

  render(
    <MemoryRouter>
      <ToastContext.Provider value={{ showToast }}>
        <AuthContext.Provider value={{ user, login, logout: vi.fn() }}>
          <LoginPage />
        </AuthContext.Provider>
      </ToastContext.Provider>
    </MemoryRouter>
  );

  return { login, mockNavigate };
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders all 5 user cards', () => {
    renderLoginPage();
    expect(screen.getByText('Andi')).toBeInTheDocument();
    expect(screen.getByText('Sari')).toBeInTheDocument();
    expect(screen.getByText('Doni')).toBeInTheDocument();
    expect(screen.getByText('Citra')).toBeInTheDocument();
    expect(screen.getByText('Budi')).toBeInTheDocument();
  });

  it('clicking Andi card calls login with correct token and navigates to /call-lists', async () => {
    const user = userEvent.setup();
    const { login } = renderLoginPage();

    const andiCard = screen.getByRole('button', { name: /Masuk sebagai Andi/i });
    await user.click(andiCard);

    expect(login).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'token-mr1', role: 'mr', userName: 'Andi' })
    );
    expect(mockNavigate).toHaveBeenCalledWith('/call-lists', { replace: true });
  });

  it('clicking Budi (MM) card calls login with mm role', async () => {
    const user = userEvent.setup();
    const { login } = renderLoginPage();

    const budiCard = screen.getByRole('button', { name: /Masuk sebagai Budi/i });
    await user.click(budiCard);

    expect(login).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'token-mm', role: 'mm', userName: 'Budi' })
    );
  });

  it('redirects to /call-lists if already logged in', () => {
    renderLoginPage({ token: 'token-mr1', role: 'mr', userName: 'Andi' });
    expect(mockNavigate).toHaveBeenCalledWith('/call-lists', { replace: true });
  });
});
