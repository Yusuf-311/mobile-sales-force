import { useState } from 'react';
import { useAuth }  from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Spinner }  from './Spinner.jsx';
import axiosClient  from '../api/axiosClient.js';

/** Format Postgres DATE/TIMESTAMP to YYYY-MM for display */
function formatMonth(raw) {
  if (!raw) return '—';
  return String(raw).substring(0, 7); // "2026-08-01T..." → "2026-08"
}

const STATUS_BADGE = {
  draft:     'badge-draft',
  submitted: 'badge-submitted',
  pending_approval: 'badge-submitted',
  approved:  'badge-approved',
  rejected:  'badge-rejected',
};

const STATUS_LABELS = {
  draft:     'Draft',
  submitted: 'Diajukan',
  pending_approval: 'Menunggu Persetujuan',
  approved:  'Disetujui',
  rejected:  'Ditolak',
};

function RejectDialog({ callListId, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function handleReject() {
    if (!reason.trim()) { showToast('Masukkan alasan penolakan', 'error'); return; }
    setLoading(true);
    try {
      await axiosClient.patch(`/api/call-lists/${callListId}/approve`, {
        status: 'rejected',
        reason: reason.trim(),
      });
      showToast('Call List ditolak');
      onDone();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menolak', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="Dialog Penolakan">
      <div className="dialog">
        <h3 className="dialog-title">Alasan Penolakan</h3>
        <div className="form-group">
          <label htmlFor="reject-reason">Alasan (wajib)</label>
          <textarea
            id="reject-reason"
            className="input"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Tuliskan alasan penolakan..."
            autoFocus
          />
        </div>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Batal</button>
          <button className="btn btn-danger" onClick={handleReject} disabled={loading} id="confirm-reject-btn">
            {loading ? <Spinner /> : 'Tolak'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CallListTable({ data, onRefresh }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loadingId, setLoadingId]   = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  const isMR         = user.role === 'mr';
  const isSupervisor = ['dm', 'rsm', 'mm'].includes(user.role);

  async function handleSubmit(cl) {
    if (!window.confirm(`Submit Call List bulan ${cl.month}?`)) return;
    setLoadingId(cl.id);
    try {
      await axiosClient.patch(`/api/call-lists/${cl.id}/submit`);
      showToast('Call List berhasil disubmit');
      onRefresh();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal submit', 'error');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleApprove(cl) {
    if (!window.confirm(`Setujui Call List bulan ${cl.month}?`)) return;
    setLoadingId(cl.id);
    try {
      await axiosClient.patch(`/api/call-lists/${cl.id}/approve`, { status: 'approved' });
      showToast('Call List disetujui');
      onRefresh();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menyetujui', 'error');
    } finally {
      setLoadingId(null);
    }
  }

  if (data.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8M12 8v8"/></svg>
          <p className="empty-state-title">Belum ada Call List</p>
          <p className="empty-state-body">{isMR ? 'Buat Call List pertama Anda di atas.' : 'Belum ada call list yang disubmit bawahan.'}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {rejectTarget && (
        <RejectDialog
          callListId={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onDone={() => { setRejectTarget(null); onRefresh(); }}
        />
      )}
      <section aria-label="Daftar Call List">
        <div className="table-wrapper">
          <table role="region" aria-label="Tabel Call List">
            <thead>
              <tr>
                <th scope="col">ID</th>
                {isSupervisor && <th scope="col">MR</th>}
                <th scope="col">Bulan</th>
                <th scope="col">Status</th>
                <th scope="col">Dokter</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((cl) => (
                <tr key={cl.id}>
                  <td data-label="ID" style={{ color: 'var(--ink-muted)', fontFamily: 'monospace', fontSize: '0.8125rem' }}>#{cl.id}</td>
                  {isSupervisor && <td data-label="MR">{cl.user_name || '—'}</td>}
                  <td data-label="Bulan">{formatMonth(cl.month)}</td>
                  <td data-label="Status">
                    <span className={`badge ${STATUS_BADGE[cl.status] || ''}`}>
                      {STATUS_LABELS[cl.status] || cl.status}
                    </span>
                    {cl.status === 'rejected' && cl.reason && (
                      <div className="text-sm text-muted" style={{ marginTop: 'var(--sp-1)' }}>
                        Alasan: {cl.reason}
                      </div>
                    )}
                  </td>
                  <td data-label="Dokter">{cl.doctor_count ?? '—'}</td>
                  <td data-label="Aksi">
                    <div className="table-actions">
                      {/* MR: submit draft */}
                      {isMR && cl.status === 'draft' && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleSubmit(cl)}
                          disabled={loadingId === cl.id}
                          id={`submit-cl-${cl.id}`}
                          aria-label={`Submit call list bulan ${cl.month}`}
                        >
                          {loadingId === cl.id ? <Spinner /> : 'Submit'}
                        </button>
                      )}
                      {/* Supervisor: approve/reject submitted or pending_approval */}
                      {isSupervisor && (cl.status === 'submitted' || cl.status === 'pending_approval') && (
                        <>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleApprove(cl)}
                            disabled={loadingId === cl.id}
                            id={`approve-cl-${cl.id}`}
                            aria-label={`Setujui call list`}
                          >
                            {loadingId === cl.id ? <Spinner /> : 'Setujui'}
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => setRejectTarget(cl.id)}
                            disabled={loadingId === cl.id}
                            id={`reject-cl-${cl.id}`}
                            aria-label={`Tolak call list`}
                          >
                            Tolak
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
