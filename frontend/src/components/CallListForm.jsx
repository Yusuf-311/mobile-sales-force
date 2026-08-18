import { useState } from 'react';
import { useAuth }   from '../context/AuthContext.jsx';
import { useMCL }    from '../hooks/useMCL.js';
import { useToast }  from '../context/ToastContext.jsx';
import { Spinner }   from './Spinner.jsx';
import axiosClient   from '../api/axiosClient.js';

export default function CallListForm({ onRefresh }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { data: doctors, loading: mclLoading } = useMCL();

  const [month, setMonth]             = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [submitting, setSubmitting]   = useState(false);

  // Only MR can submit call lists
  if (user.role !== 'mr') return null;

  function toggleDoctor(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!month) { showToast('Pilih bulan terlebih dahulu', 'error'); return; }
    if (selectedIds.length === 0) { showToast('Pilih minimal satu dokter', 'error'); return; }

    setSubmitting(true);
    try {
      await axiosClient.post('/api/call-lists', {
        month,
        doctor_ids: selectedIds,
      });
      showToast('Call List berhasil disimpan');
      setMonth('');
      setSelectedIds([]);
      onRefresh();
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal menyimpan Call List';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit} id="call-list-form" aria-label="Form Call List">
      <h2 className="card-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        Buat Call List
      </h2>

      <div className="form-group" style={{ marginBottom: 'var(--sp-4)' }}>
        <label htmlFor="cl-month">Bulan</label>
        <input
          id="cl-month"
          type="month"
          className="input"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          required
          aria-required="true"
        />
      </div>

      <div className="form-group" style={{ marginBottom: 'var(--sp-4)' }}>
        <label id="cl-doctors-label">
          Pilih Dokter ({selectedIds.length} dipilih)
        </label>
        {mclLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted" style={{ padding: 'var(--sp-3)' }}>
            <Spinner /><span>Memuat daftar dokter...</span>
          </div>
        ) : (
          <div
            className="checkbox-list"
            role="group"
            aria-labelledby="cl-doctors-label"
          >
            {doctors.map((doc) => (
              <label key={doc.id} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(doc.id)}
                  onChange={() => toggleDoctor(doc.id)}
                  aria-label={`Pilih ${doc.name}`}
                />
                <span>
                  <strong>{doc.name}</strong>
                  {doc.specialization && (
                    <span className="text-muted text-sm"> — {doc.specialization}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={submitting || mclLoading}
        id="cl-submit-btn"
      >
        {submitting ? <><Spinner />Menyimpan...</> : 'Simpan Call List'}
      </button>
    </form>
  );
}
