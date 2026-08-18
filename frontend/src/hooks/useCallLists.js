import { useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient.js';

export function useCallLists() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosClient.get('/api/call-lists');
      setData(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat Call List');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
