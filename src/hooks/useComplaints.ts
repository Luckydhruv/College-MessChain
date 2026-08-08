import { useState, useEffect, useCallback } from 'react';
import { getComplaints, submitComplaint, ComplaintEntry } from '../api/complaints';

export function useComplaints() {
  const [complaints, setComplaints] = useState<ComplaintEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getComplaints();
      setComplaints(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const fileComplaint = async (title: string, body: string) => {
    return await submitComplaint(title, body);
  };

  return {
    complaints,
    loading,
    error,
    refetch: fetchComplaints,
    fileComplaint,
  };
}