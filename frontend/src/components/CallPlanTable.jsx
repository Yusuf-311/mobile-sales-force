export default function CallPlanTable({ data }) {
  if (data.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          <p className="empty-state-title">Belum ada Call Plan</p>
          <p className="empty-state-body">Buat jadwal kunjungan dari form di atas.</p>
        </div>
      </div>
    );
  }

  return (
    <section aria-label="Daftar Call Plan">
      <div className="table-wrapper">
        <table role="region" aria-label="Tabel Call Plan">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Call List</th>
              <th scope="col">Dokter</th>
              <th scope="col">Tanggal</th>
              <th scope="col">Waktu</th>
            </tr>
          </thead>
          <tbody>
            {data.map((cp) => (
              <tr key={cp.id}>
                <td style={{ color: 'var(--ink-muted)', fontFamily: 'monospace', fontSize: '0.8125rem' }}>#{cp.id}</td>
                <td>#{cp.call_list_id}</td>
                <td>{cp.doctor_name || cp.doctor_id}</td>
                <td>{cp.visit_date}</td>
                <td>{cp.visit_time || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
