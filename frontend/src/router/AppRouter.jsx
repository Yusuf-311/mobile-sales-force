import { Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute.jsx';
import LoginPage      from '../pages/LoginPage.jsx';
import CallListPage   from '../pages/CallListPage.jsx';
import CallPlanPage   from '../pages/CallPlanPage.jsx';
import CallActualPage from '../pages/CallActualPage.jsx';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/call-lists" element={
        <PrivateRoute><CallListPage /></PrivateRoute>
      } />

      <Route path="/call-plans" element={
        <PrivateRoute><CallPlanPage /></PrivateRoute>
      } />

      <Route path="/call-actuals" element={
        <PrivateRoute><CallActualPage /></PrivateRoute>
      } />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/call-lists" replace />} />
    </Routes>
  );
}
