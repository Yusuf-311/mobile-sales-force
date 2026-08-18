import { useState } from 'react';
import { useToast }    from '../context/ToastContext.jsx';
import { useCallPlans } from '../hooks/useCallPlans.js';
import { useMCL }      from '../hooks/useMCL.js';
import { useProducts } from '../hooks/useProducts.js';
import { Spinner }     from './Spinner.jsx';
import axiosClient     from '../api/axiosClient.js';

const MODES = [
  { key: 'plan',       label: 'Terencana'  },
  { key: 'unplan',     label: 'Unplan'     },
  { key: 'non_target', label: 'Non Target' },
];

export default function CallActualForm({ onRefresh }) {
  const { showToast }  = useToast();
  const { data: plans, loading: plansLoading } = useCallPlans();
  const { data: mcl,   loading: mclLoading }   = useMCL();
  const { data: products, loading: prodsLoading } = useProducts();

  const [mode, setMode]               = useState('plan');
  const [planId, setPlanId]           = useState('');
  const [doctorId, setDoctorId]       = useState('');
  const [visitDate, setVisitDate]     = useState('');
  const [checkIn, setCheckIn]         = useState('');
  const [checkOut, setCheckOut]       = useState('');
  const [photoUrl, setPhotoUrl]       = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [submitting, setSubmitting]   = useState(false);

  // Auto-fill doctor from selected plan
  const selectedPlan = plans.find((p) => String(p.id) === String(planId));

  function toggleProduct(id) {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function resetForm() {
    setPlanId(''); setDoctorId(''); setVisitDate('');
    setCheckIn(''); setCheckOut('');
    setPhotoUrl(''); setSignatureUrl('');
    setSelectedProducts([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const effectiveDoctorId = mode === 'plan'
      ? (selectedPlan?.doctor_id ?? null)
      : Number(doctorId) || null;

    if (!effectiveDoctorId)           { showToast('Pilih dokter', 'error'); return; }
    if (!visitDate)                   { showToast('Masukkan tanggal kunjungan', 'error'); return; }
    if (!photoUrl.trim())             { showToast('Masukkan URL foto', 'error'); return; }
    if (!signatureUrl.trim())         { showToast('Masukkan URL tanda tangan', 'error'); return; }
    if (selectedProducts.length === 0){ showToast('Pilih minimal satu produk', 'error'); return; }

    const payload = {
      doctor_id:      effectiveDoctorId,
      visit_date:     visitDate,
      check_in_time:  checkIn   || null,
      check_out_time: checkOut  || null,
      photo_url:      photoUrl.trim(),
      signature_url:  signatureUrl.trim(),
      detailing:      selectedProducts.map((id) => ({ product_id: id })),
      plan_id:        mode === 'plan' ? (Number(planId) || null) : null,
    };

    setSubmitting(true);
    try {
      await axiosClient.post('/api/call-actuals', payload);
      showToast('Call Actual berhasil dicatat');
      resetForm();
      onRefresh();
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message;
      if (status === 409) {
        showToast('Sudah ada kunjungan ke dokter ini pada tanggal tersebut', 'error');
      } else {
        showToast(msg || 'Gagal menyimpan Call Actual', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit} id="call-actual-form" aria-label="Form Call Actual">
      <h2 className="card-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
        Catat Kunjungan
      </h2>

      {/* Mode selector */}
      <div role="group" aria-label="Mode kunjungan" style={{ marginBottom: 'var(--sp-4)' }}>
        <div className="mode-tabs">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`mode-tab${mode === m.key ? ' active' : ''}`}
              onClick={() => { setMode(m.key); setPlanId(''); setDoctorId(''); }}
              id={`mode-${m.key}`}
              aria-pressed={mode === m.key}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Terencana: pick plan → doctor auto-fill */}
      {mode === 'plan' && (
        <>
          <div className="form-group" style={{ marginBottom: 'var(--sp-4)' }}>
            <label htmlFor="ca-plan">Call Plan</label>
            {plansLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted"><Spinner /><span>Memuat...</span></div>
            ) : (
              <select id="ca-plan" value={planId} onChange={(e) => setPlanId(e.target.value)} required>
                <option value="">— Pilih Call Plan —</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id} — {p.doctor_name || `Dokter #${p.doctor_id}`} ({p.visit_date})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="form-group" style={{ marginBottom: 'var(--sp-4)' }}>
            <label htmlFor="ca-doctor-readonly">Dokter</label>
            <input
              id="ca-doctor-readonly"
              type="text"
              className="input"
              value={selectedPlan ? (selectedPlan.doctor_name || `#${selectedPlan.doctor_id}`) : ''}
              readOnly
              aria-readonly="true"
              placeholder="Otomatis dari Call Plan"
            />
          </div>
        </>
      )}

      {/* Unplan / Non Target: pick doctor from MCL */}
      {(mode === 'unplan' || mode === 'non_target') && (
        <div className="form-group" style={{ marginBottom: 'var(--sp-4)' }}>
          <label htmlFor="ca-doctor">Dokter</label>
          {mclLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted"><Spinner /><span>Memuat dokter...</span></div>
          ) : (
            <select id="ca-doctor" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
              <option value="">— Pilih Dokter —</option>
              {mcl.map((d) => (
                <option key={d.id} value={d.id}>{d.name} — {d.specialization}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Shared fields */}
      <div className="form-group" style={{ marginBottom: 'var(--sp-4)' }}>
        <label htmlFor="ca-date">Tanggal Kunjungan</label>
        <input id="ca-date" type="date" className="input" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} required aria-required="true" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
        <div className="form-group">
          <label htmlFor="ca-checkin">Check-in</label>
          <input id="ca-checkin" type="time" className="input" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="ca-checkout">Check-out</label>
          <input id="ca-checkout" type="time" className="input" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 'var(--sp-4)' }}>
        <label htmlFor="ca-photo">URL Foto</label>
        <input
          id="ca-photo"
          type="text"
          className="input"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          placeholder="https://storage.example.com/photo.jpg"
          required
          aria-required="true"
        />
      </div>

      <div className="form-group" style={{ marginBottom: 'var(--sp-4)' }}>
        <label htmlFor="ca-signature">URL Tanda Tangan</label>
        <input
          id="ca-signature"
          type="text"
          className="input"
          value={signatureUrl}
          onChange={(e) => setSignatureUrl(e.target.value)}
          placeholder="https://storage.example.com/signature.png"
          required
          aria-required="true"
        />
      </div>

      <div className="form-group" style={{ marginBottom: 'var(--sp-4)' }}>
        <label id="ca-products-label">Produk Detailing ({selectedProducts.length} dipilih)</label>
        {prodsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted"><Spinner /><span>Memuat produk...</span></div>
        ) : (
          <div className="checkbox-list" role="group" aria-labelledby="ca-products-label">
            {products.map((p) => (
              <label key={p.id} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(p.id)}
                  onChange={() => toggleProduct(p.id)}
                  aria-label={`Pilih ${p.name}`}
                />
                <span>
                  <strong>{p.name}</strong>
                  {p.category && <span className="text-muted text-sm"> — {p.category}</span>}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={submitting}
        id="ca-submit-btn"
      >
        {submitting ? <><Spinner />Menyimpan...</> : 'Catat Kunjungan'}
      </button>
    </form>
  );
}
