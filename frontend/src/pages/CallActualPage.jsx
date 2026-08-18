import { Navigate }    from 'react-router-dom';
import { useAuth }      from '../context/AuthContext.jsx';
import { useCallActuals } from '../hooks/useCallActuals.js';
import { Spinner }      from '../components/Spinner.jsx';
import CallActualForm   from '../components/CallActualForm.jsx';
import CallActualTable  from '../components/CallActualTable.jsx';

export default function CallActualPage() {
  const { user } = useAuth();

  // Only MR can access this page
  if (user.role !== 'mr') return <Navigate to="/call-lists" replace />;

  const { data, loading, error, refresh } = useCallActuals();

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Call Actual</h1>
          <p className="page-subtitle">Catat realisasi kunjungan — terencana, unplan, atau non target</p>
        </div>
      </div>

      <div className="section-grid section-grid-sidebar">
        <CallActualForm onRefresh={refresh} />

        <div>
          {loading && (
            <div className="loading-center">
              <Spinner large />
              <span>Memuat riwayat kunjungan...</span>
            </div>
          )}
          {error && <div className="error-banner" role="alert">{error}</div>}
          {!loading && !error && <CallActualTable data={data} />}
        </div>
      </div>
    </>
  );
}
