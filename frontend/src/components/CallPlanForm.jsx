import { useState, useEffect } from 'react';
import { useToast }     from '../context/ToastContext.jsx';
import { useCallLists } from '../hooks/useCallLists.js';
import { Spinner }      from './Spinner.jsx';
import axiosClient      from '../api/axiosClient.js';

/** Format Postgres DATE/TIMESTAMP to YYYY-MM */
function formatMonth(raw) {
  if (!raw) return '';
  return String(raw).substring(0, 7);
}

export default function CallPlanForm({ onRefresh }) {
  const { showToast } = useToast();
  const { data: callLists, loading: clLoading } = useCallLists();

  const approvedLists = callLists.filter((cl) => cl.status === 'approved');

  const [selectedListId, setSelectedListId] = useState('');
  const [doctors, setDoctors]               = useState([]);
  const [doctorId, setDoctorId]             = useState('');
  const [visitDate, setVisitDate]           = useState('');
  const [visitTime, setVisitTime]           = useState('');
  const [submitting, setSubmitting]         = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // When call list changes, fetch its doctors
  useEffect(() => {
    if (!selectedListId) { setDoctors([]); setDoctorId(''); return; }
    setLoadingDoctors(true);
    axiosClient.get(`/api/call-lists/${selectedListId}`)
      .then((res) => {
        setDoctors(res.data.data?.doctors || []);
        setDoctorId('');
      })
      .catch(() => showToast('Gagal memuat dokter dari call list ini', 'error'))
      .finally(() => setLoadingDoctors(false));
  }, [selectedListId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedListId) { showToast('Pilih Call List', 'error'); return; }
    if (!doctorId)        { showToast('Pilih Dokter', 'error'); return; }
    if (!visitDate)       { showToast('Pilih tanggal kunjungan', 'error'); return; }

    setSubmitting(true);
    try {
      await axiosClient.post('/api/call-plans', {
        call_list_id: Number(selectedListId),
        doctor_id:    Number(doctorId),
        visit_date:   visitDate,
        visit_time:   visitTime || null,
      });
      showToast('Call Plan berhasil dibuat');
      setSelectedListId('');
      setDoctorId('');
      setVisitDate('');
      setVisitTime('');
      setDoctors([]);
      onRefresh();
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message;
      if (status === 409) {
        showToast('Dokter sudah dijadwalkan pada tanggal ini', 'error');
      } else {
        showToast(msg || 'Gagal membuat Call Plan', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit} id="call-plan-form" aria-label="Form Call Plan">
      <h2 className="card-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        Buat Call Plan
      </h2>

      <div className="form-group" style={{ marginBottom: 'var(--sp-4)' }}>
        <label htmlFor="cp-list">Call List (Approved)</label>
        {clLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted"><Spinner /><span>Memuat...</span></div>
        ) : (
          <select
            id="cp-list"
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value)}
            required
            aria-required="true"
          >
            <option value="">— Pilih Call List —</option>
            {approvedLists.map((cl) => (
              <option key={cl.id} value={cl.id}>
                Bulan {formatMonth(cl.month)} (ID #{cl.id})
              </option>
            ))}
          </select>
        )}
        {!clLoading && approvedLists.length === 0 && (
          <p className="text-sm text-muted">Belum ada Call List yang disetujui.</p>
        )}
      </div>

      <div className="form-group" style={{ marginBottom: 'var(--sp-4)' }}>
        <label htmlFor="cp-doctor">Dokter</label>
        {loadingDoctors ? (
          <div className="flex items-center gap-2 text-sm text-muted"><Spinner /><span>Memuat dokter...</span></div>
        ) : (
          <select
            id="cp-doctor"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            disabled={!selectedListId}
            required
            aria-required="true"
          >
            <option value="">— Pilih Dokter —</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="form-group" style={{ marginBottom: 'var(--sp-4)' }}>
        <label htmlFor="cp-date">Tanggal Kunjungan</label>
        <input
          id="cp-date"
          type="date"
          className="input"
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          required
          aria-required="true"
        />
      </div>

      <div className="form-group" style={{ marginBottom: 'var(--sp-4)' }}>
        <label htmlFor="cp-time">Waktu Kunjungan</label>
        <input
          id="cp-time"
          type="time"
          className="input"
          value={visitTime}
          onChange={(e) => setVisitTime(e.target.value)}
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={submitting || clLoading}
        id="cp-submit-btn"
      >
        {submitting ? <><Spinner />Menyimpan...</> : 'Simpan Call Plan'}
      </button>
    </form>
  );
}
