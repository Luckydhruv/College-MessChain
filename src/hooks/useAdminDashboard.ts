import { useState, useEffect, useCallback } from 'react';
import { baseClient } from '../api/client';
import { triggerCron } from '../api/admin';

export interface AdminDashboardMetrics {
  pendingRebates: number;
  pendingMessChanges: number;
  openComplaints: number;
  totalStudents: number;
}

export function useAdminDashboard() {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rebatesRes, changesRes, complaintsRes, studentsRes] = await Promise.all([
        baseClient.get<{ rebates: any[] }>('/api/admin/rebates').catch(() => ({ rebates: [] })),
        baseClient.get<{ messChanges: any[] }>('/api/admin/mess-changes').catch(() => ({ messChanges: [] })),
        baseClient.get<{ complaints: any[] }>('/api/admin/complaints').catch(() => ({ complaints: [] })),
        baseClient.get<{ students: any[] }>('/api/admin/students').catch(() => ({ students: [] })),
      ]);

      const pendingRebates = (rebatesRes.rebates || []).filter((r: any) => r.status === 0).length;
      const pendingMessChanges = (changesRes.messChanges || []).filter((r: any) => r.status === 0).length;
      const openComplaints = (complaintsRes.complaints || []).length;
      const totalStudents = (studentsRes.students || []).length;

      setMetrics({
        pendingRebates,
        pendingMessChanges,
        openComplaints,
        totalStudents,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch admin metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const runCron = async () => {
    await triggerCron();
    await fetchMetrics();
  };

  return { metrics, loading, error, refetch: fetchMetrics, runCron };
}
