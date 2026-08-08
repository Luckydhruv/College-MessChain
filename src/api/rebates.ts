import { baseClient } from './client';

export interface RebateEntry {
  id: string;
  student: string;
  fromDate: string;
  toDate: string;
  days: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string;
}

export const getRebates = async (): Promise<RebateEntry[]> => {
  const response = await baseClient.get<{ rebates: any[] }>('/api/admin/rebates');
  const items = response.rebates || [];
  return items.map((r: any) => {
    const fromDate = r.fromDate ? new Date(r.fromDate * 1000).toLocaleDateString() : '';
    const toDate = r.toDate ? new Date(r.toDate * 1000).toLocaleDateString() : '';
    const days = r.fromDate && r.toDate ? Math.ceil((r.toDate - r.fromDate) / 86400) : 0;
    return {
      id: String(r.id),
      student: r.student || 'Unknown',
      fromDate,
      toDate,
      days,
      status: r.status === 1 ? 'Approved' as const : r.status === 2 ? 'Rejected' as const : 'Pending' as const,
      requestedAt: r.requestedAt ? new Date(r.requestedAt * 1000).toLocaleDateString() : '',
    };
  });
};

export const approveRebate = async (id: string): Promise<any> => {
  return await baseClient.post(`/api/admin/rebates/${parseInt(id, 10)}/approve`);
};

export const denyRebate = async (id: string): Promise<any> => {
  return await baseClient.post(`/api/admin/rebates/${parseInt(id, 10)}/reject`);
};