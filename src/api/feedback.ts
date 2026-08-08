import { baseClient } from './client';
import { getPublicMesses } from './public';

export interface FeedbackEntry {
  id: string;
  student: string;
  mess: string;
  cid: string;
  content: string | null;
  timestamp: string;
  parsed: { rating: number; window: string } | null;
}

export const getFeedbackReport = async (): Promise<FeedbackEntry[]> => {
  const response = await baseClient.get<{ feedbacks: any[] }>('/api/admin/feedback-report');
  const items = response.feedbacks || [];
  return items.map((item: any, idx: number) => {
    let parsed: { rating: number; window: string } | null = null;
    try {
      const content = item.content || item.text || '';
      const jsonData = JSON.parse(content);
      if (jsonData.rating && jsonData.window) {
        parsed = { rating: jsonData.rating, window: jsonData.window };
      }
    } catch {
      // Pre-schema entry — prose text, won't parse
    }
    return {
      id: String(item.id ?? idx),
      student: item.student || 'Unknown',
      mess: item.mess || '',
      cid: item.cid || item.ipfsHash || '',
      content: item.content || item.text || null,
      timestamp: item.timestamp ? new Date(item.timestamp * 1000).toLocaleDateString() : '',
      parsed,
    };
  });
};

/**
 * Submit feedback as structured JSON so the admin can aggregate.
 * The JSON schema: {"rating": 1-5, "window": "Breakfast|Lunch|Dinner", "comment": "optional text"}
 */
export const submitFeedback = async (
  rating: number,
  mealWindow: string,
  comment: string = '',
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

  // Send structured JSON as the text payload (Phase 3.4)
  const structuredPayload = JSON.stringify({
    rating,
    window: mealWindow,
    ...(comment.trim() ? { comment: comment.trim() } : {}),
  });

  return await baseClient.post('/api/student/file-feedback', {
    messId: targetMessId || undefined,
    text: structuredPayload,
  });
};