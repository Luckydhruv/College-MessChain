import { baseClient } from './client';
import { getPublicMesses } from './public';

export interface ComplaintEntry {
  id: string;
  student: string;
  mess: string;
  cid: string;
  content: string | null;
  timestamp: string;
}

/**
 * Fetch complaints. Read-only — no urgency, no status, no triage.
 * POST /api/admin/complaints/:id/status does not exist and won't.
 */
export const getComplaints = async (): Promise<ComplaintEntry[]> => {
  const response = await baseClient.get<{ complaints: any[] }>('/api/admin/complaints');
  return (response.complaints || []).map((item: any, idx: number) => ({
    id: String(item.id ?? idx),
    student: item.student || 'Unknown',
    mess: item.mess || '',
    cid: item.cid || item.ipfsHash || '',
    content: item.content || item.text || null,
    timestamp: item.timestamp ? new Date(item.timestamp * 1000).toLocaleDateString() : '',
  }));
};

/**
 * Submit a complaint with the student's real mess address.
 */
export const submitComplaint = async (
  title: string,
  body: string,
  customMessId?: string
): Promise<any> => {
  let targetMessId = customMessId;
  if (!targetMessId) {
    try {
      const profileRes = await baseClient.get<{ user: any }>('/api/student/profile');
      targetMessId = profileRes.user?.messId || profileRes.user?.mess?.id;
    } catch {}
  }
  if (!targetMessId) {
    try {
      const messes = await getPublicMesses();
      if (messes.length > 0) {
        targetMessId = messes[0].id;
      }
    } catch {}
  }

  const payloadText = `[Subject: ${title}] ${body}`;

  return await baseClient.post('/api/student/file-complaint', {
    messId: targetMessId || undefined,
    text: payloadText,
  });
};