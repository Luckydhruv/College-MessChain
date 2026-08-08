import { baseClient } from './client';
import { getPublicMesses } from './staff';

export interface MessChangeRequest {
  id: number;
  student: string;
  toMess: string;
  status: number;
}

export interface StudentEntry {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  walletAddress: string;
  messId: string;
  messName: string;
}

export const getMessChanges = async (): Promise<MessChangeRequest[]> => {
  const response = await baseClient.get<{ messChanges: any[] }>('/api/admin/mess-changes');
  return (response.messChanges || []).map((item: any) => ({
    id: item.id,
    student: item.student || '',
    toMess: item.toMess || '',
    status: item.status,
  }));
};

export const approveMessChange = async (id: number): Promise<any> => {
  return await baseClient.post(`/api/admin/mess-changes/${id}/approve`);
};

export const rejectMessChange = async (id: number): Promise<any> => {
  return await baseClient.post(`/api/admin/mess-changes/${id}/reject`);
};

export const getStudents = async (): Promise<StudentEntry[]> => {
  const [studentsRes, messesRes] = await Promise.all([
    baseClient.get<{ students: any[] }>('/api/admin/students'),
    getPublicMesses().catch(() => []),
  ]);

  const messMap = new Map((messesRes || []).map((m: any) => [m.id, m.name]));

  return (studentsRes.students || []).map((s: any) => ({
    id: s.id || '',
    name: s.name || 'Student',
    email: s.email || '',
    rollNumber: s.rollNumber || '',
    walletAddress: s.walletAddress || '',
    messId: s.messId || '',
    messName: messMap.get(s.messId) || 'Unassigned',
  }));
};

export const mintTokens = async (rollNumber: string, amount: number): Promise<any> => {
  return await baseClient.post('/api/admin/mint-tokens', { rollNumber, amount });
};

export const triggerCron = async (): Promise<any> => {
  return await baseClient.post('/api/admin/trigger-cron');
};

export { getPublicMesses } from './staff';
