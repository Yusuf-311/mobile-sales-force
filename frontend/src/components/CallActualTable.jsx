const VISIT_TYPE_LABELS = {
  plan:       'Terencana',
  unplan:     'Unplan',
  non_target: 'Non Target',
};

const STATUS_BADGE = {
  in_progress: 'badge-in_progress',
  completed:   'badge-completed',
};

const STATUS_LABELS = {
  in_progress: 'In Progress',
  completed:   'Selesai',
};

export default function CallActualTable({ data }) {
  if (data.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
          <p className="empty-state-title">Belum ada kunjungan</p>
          <p className="empty-state-body">Catat kunjungan pertama Anda menggunakan form di atas.</p>
        </div>
      </div>
    );
  }

  return (
    <section aria-label="Daftar Call Actual">
      <div className="table-wrapper">
        <table role="region" aria-label="Tabel Call Actual">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Dokter</th>
              <th scope="col">Tanggal</th>
              <th scope="col">Tipe</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((ca) => (
              <tr key={ca.id}>
                <td style={{ color: 'var(--ink-muted)', fontFamily: 'monospace', fontSize: '0.8125rem' }}>#{ca.id}</td>
                <td>{ca.doctor_name || `Dokter #${ca.doctor_id}`}</td>
                <td>{ca.visit_date}</td>
                <td>
                  <span className="text-sm">{VISIT_TYPE_LABELS[ca.visit_type] || ca.visit_type}</span>
                </td>
                <td>
                  <span className={`badge ${STATUS_BADGE[ca.status] || ''}`}>
                    {STATUS_LABELS[ca.status] || ca.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
