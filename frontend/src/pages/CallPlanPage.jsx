import { Navigate } from 'react-router-dom';
import { useAuth }   from '../context/AuthContext.jsx';
import { useCallPlans } from '../hooks/useCallPlans.js';
import { Spinner }   from '../components/Spinner.jsx';
import CallPlanForm  from '../components/CallPlanForm.jsx';
import CallPlanTable from '../components/CallPlanTable.jsx';

export default function CallPlanPage() {
  const { user } = useAuth();

  // Only MR can access this page
  if (user.role !== 'mr') return <Navigate to="/call-lists" replace />;

  const { data, loading, error, refresh } = useCallPlans();

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Call Plan</h1>
          <p className="page-subtitle">Rencanakan jadwal kunjungan dokter dari Call List yang sudah disetujui</p>
        </div>
      </div>

      <div className="section-grid section-grid-sidebar">
        <CallPlanForm onRefresh={refresh} />

        <div>
          {loading && (
            <div className="loading-center">
              <Spinner large />
              <span>Memuat Call Plan...</span>
            </div>
          )}
          {error && <div className="error-banner" role="alert">{error}</div>}
          {!loading && !error && <CallPlanTable data={data} />}
        </div>
      </div>
    </>
  );
}
