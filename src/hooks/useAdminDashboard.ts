import { useState, useEffect, useCallback } from 'react';
import { baseClient } from '../api/client';

export interface DashboardTile {
  label: string;
  value: string;
  loading: boolean;
  error: string | null;
}

export function useAdminDashboard() {
  const [tiles, setTiles] = useState<DashboardTile[]>([
    { label: 'Total Students', value: '—', loading: true, error: null },
    { label: 'Pending Rebates', value: '—', loading: true, error: null },
    { label: 'Pending Mess Changes', value: '—', loading: true, error: null },
    { label: 'Complaints', value: '—', loading: true, error: null },
    { label: 'Feedback Entries', value: '—', loading: true, error: null },
  ]);

  const updateTile = (index: number, update: Partial<DashboardTile>) => {
    setTiles(prev => prev.map((tile, i) => i === index ? { ...tile, ...update } : tile));
  };

  const fetchAll = useCallback(async () => {
    // Reset all tiles to loading
    setTiles(prev => prev.map(t => ({ ...t, loading: true, error: null })));

    // Load progressively — one failure doesn't blank the screen (5.1)
    baseClient.get<{ students: any[] }>('/api/admin/students')
      .then(res => updateTile(0, { value: String((res.students || []).length), loading: false }))
      .catch(err => updateTile(0, { error: err.message, loading: false }));

    baseClient.get<{ rebates: any[] }>('/api/admin/rebates')
      .then(res => {
        const pending = (res.rebates || []).filter((r: any) => r.status === 0).length;
        updateTile(1, { value: String(pending), loading: false });
      })
      .catch(err => updateTile(1, { error: err.message, loading: false }));

    baseClient.get<{ messChanges: any[] }>('/api/admin/mess-changes')
      .then(res => {
        const pending = (res.messChanges || []).filter((m: any) => m.status === 0).length;
        updateTile(2, { value: String(pending), loading: false });
      })
      .catch(err => updateTile(2, { error: err.message, loading: false }));

    baseClient.get<{ complaints: any[] }>('/api/admin/complaints')
      .then(res => updateTile(3, { value: String((res.complaints || []).length), loading: false }))
      .catch(err => updateTile(3, { error: err.message, loading: false }));

    baseClient.get<{ feedbacks: any[] }>('/api/admin/feedback-report')
      .then(res => updateTile(4, { value: String((res.feedbacks || []).length), loading: false }))
      .catch(err => updateTile(4, { error: err.message, loading: false }));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    tiles,
    refetch: fetchAll,
  };
}
