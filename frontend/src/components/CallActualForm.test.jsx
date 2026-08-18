import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { ToastContext } from '../context/ToastContext.jsx';
import CallActualForm from '../components/CallActualForm.jsx';

// Mock all hooks that make API calls
vi.mock('../hooks/useCallPlans.js', () => ({
  useCallPlans: () => ({
    data: [
      { id: 1, doctor_id: 10, doctor_name: 'Dr. Ahmad', visit_date: '2026-08-15' },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock('../hooks/useMCL.js', () => ({
  useMCL: () => ({
    data: [
      { id: 10, name: 'Dr. Ahmad Santoso', specialization: 'Umum' },
      { id: 11, name: 'Dr. Budi Prasetyo', specialization: 'Jantung' },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock('../hooks/useProducts.js', () => ({
  useProducts: () => ({
    data: [
      { id: 1, name: 'CardioMax', category: 'Kardiovaskular' },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock('../api/axiosClient.js', () => ({
  default: { post: vi.fn().mockResolvedValue({ data: { status: 'success', data: {} } }) },
}));

function renderForm() {
  const mrUser = { token: 'token-mr1', role: 'mr', userName: 'Andi' };
  const showToast = vi.fn();

  render(
    <MemoryRouter>
      <ToastContext.Provider value={{ showToast }}>
        <AuthContext.Provider value={{ user: mrUser, login: vi.fn(), logout: vi.fn() }}>
          <CallActualForm onRefresh={vi.fn()} />
        </AuthContext.Provider>
      </ToastContext.Provider>
    </MemoryRouter>
  );
}

describe('CallActualForm — mode switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('default mode is Terencana — shows Call Plan dropdown, doctor field is read-only', () => {
    renderForm();

    // Mode tab "Terencana" should be active
    expect(screen.getByRole('button', { name: 'Terencana' })).toBeInTheDocument();

    // Call Plan select should be present
    expect(screen.getByLabelText('Call Plan')).toBeInTheDocument();

    // Doctor field should be read-only
    const doctorField = screen.getByLabelText('Dokter');
    expect(doctorField).toHaveAttribute('readonly');
  });

  it('switching to Unplan hides Call Plan dropdown and shows MCL Doctor dropdown', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Unplan' }));

    // Call Plan dropdown should be gone
    expect(screen.queryByLabelText('Call Plan')).not.toBeInTheDocument();

    // MCL Doctor dropdown should be present (editable select)
    const doctorSelect = screen.getByLabelText('Dokter');
    expect(doctorSelect.tagName).toBe('SELECT');
    expect(doctorSelect).not.toHaveAttribute('readonly');
  });

  it('switching to Non Target shows MCL Doctor dropdown', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Non Target' }));

    // Call Plan dropdown should be gone
    expect(screen.queryByLabelText('Call Plan')).not.toBeInTheDocument();

    // Doctor dropdown from MCL should appear
    const doctorSelect = screen.getByLabelText('Dokter');
    expect(doctorSelect.tagName).toBe('SELECT');
  });
});
