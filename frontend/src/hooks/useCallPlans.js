import { useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient.js';

export function useCallPlans() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosClient.get('/api/call-plans');
      setData(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat Call Plan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
