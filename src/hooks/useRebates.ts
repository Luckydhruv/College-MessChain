import { useState, useEffect, useCallback } from 'react';
import { getRebates, RebateEntry, approveRebate, denyRebate } from '../api/rebates';
import { useUiState } from '../context/UiStateContext';

export function useRebates() {
  const [rebates, setRebates] = useState<RebateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { launchProcessing } = useUiState();

  const fetchRebates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRebates();
      setRebates(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load rebates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRebates();
  }, [fetchRebates]);

  const triggerApprove = async (id: string | number) => {
    await launchProcessing(`rebate-${id}`, async () => {
      await approveRebate(String(id));
      // Refetch after approval to get updated status
      await fetchRebates();
    });
  };

  const triggerDeny = async (id: string | number) => {
    await launchProcessing(`deny-${id}`, async () => {
      await denyRebate(String(id));
      // Refetch after rejection to get updated status
      await fetchRebates();
    });
  };

  return {
    rebates,
    loading,
    error,
    refetch: fetchRebates,
    triggerApprove,
    triggerDeny,
  };
}