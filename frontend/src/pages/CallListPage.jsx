import { useCallLists } from '../hooks/useCallLists.js';
import { useAuth }       from '../context/AuthContext.jsx';
import { Spinner }       from '../components/Spinner.jsx';
import CallListForm      from '../components/CallListForm.jsx';
import CallListTable     from '../components/CallListTable.jsx';

export default function CallListPage() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useCallLists();

  const isMR = user.role === 'mr';

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Call List</h1>
          <p className="page-subtitle">
            {isMR
              ? 'Kelola daftar dokter yang akan dikunjungi per bulan'
              : 'Review dan setujui call list dari tim Anda'}
          </p>
        </div>
      </div>

      <div className={isMR ? 'section-grid section-grid-sidebar' : 'section-grid'}>
        {isMR && <CallListForm onRefresh={refresh} />}

        <div>
          {loading && (
            <div className="loading-center">
              <Spinner large />
              <span>Memuat Call List...</span>
            </div>
          )}
          {error && <div className="error-banner" role="alert">{error}</div>}
          {!loading && !error && (
            <CallListTable data={data} onRefresh={refresh} />
          )}
        </div>
      </div>
    </>
  );
}
