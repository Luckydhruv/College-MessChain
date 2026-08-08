import { useState, useEffect, useCallback } from 'react';
import { getFeedbackReport, FeedbackEntry } from '../api/feedback';

export function useFeedback() {
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFeedbackReport();
      setFeedbacks(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load feedback report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  // Compute aggregate stats from structured entries
  const parsedEntries = feedbacks.filter(f => f.parsed !== null);
  const totalEntries = feedbacks.length;
  const parsedCount = parsedEntries.length;

  let averageRating = 0;
  if (parsedCount > 0) {
    const totalRating = parsedEntries.reduce((sum, f) => sum + (f.parsed?.rating || 0), 0);
    averageRating = totalRating / parsedCount;
  }

  return {
    feedbacks,
    loading,
    error,
    refetch: fetchFeedback,
    stats: {
      totalEntries,
      parsedCount,
      averageRating,
      coverageLabel: totalEntries > 0 ? `Aggregated from ${parsedCount} of ${totalEntries} responses` : 'No feedback entries yet',
    },
  };
}
