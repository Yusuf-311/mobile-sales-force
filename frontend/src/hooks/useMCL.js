import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient.js';

export function useMCL() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    axiosClient.get('/api/mcl')
      .then((res) => setData(res.data.data || []))
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat MCL'))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
