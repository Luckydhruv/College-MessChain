import { baseClient } from './client';

export const getStudentProfile = async () => {
  const profileResponse = await baseClient.get<{ user: any }>('/api/student/profile');
  const balanceResponse = await baseClient.get<{ balance: string }>('/api/student/balance').catch(() => ({ balance: '0' }));

  const userData = profileResponse.user || {};
  const wallet = userData.walletAddress || '';
  const balance = parseInt(balanceResponse.balance || '0', 10);
  const dailyRate = 27; // tokens per day
  const daysRemaining = dailyRate > 0 ? Math.floor(balance / dailyRate) : 0;

  return {
    user: userData,
    messId: userData.messId || userData.mess?.id || null,
    name: userData.name || 'Student',
    rollNumber: userData.rollNumber || 'Unassigned',
    role: `Roll: ${userData.rollNumber || 'Unassigned'}`,
    passStatus: userData.mess ? `Active: ${userData.mess.name}` : 'No Assigned Mess Unit Found',
    walletStatus: wallet ? `Wallet: ${wallet.slice(0, 6)}...${wallet.slice(-4)}` : 'No Wallet',
    balance,
    balanceDisplay: `${balance} Tokens`,
    daysRemaining,
    daysRemainingDisplay: `≈ ${daysRemaining} days remaining`,
  };
};

/**
 * Scan a mess QR code and verify the meal.
 * The QR payload is expected to be JSON: {"type":"MESS_VERIFICATION","messId":"0x..."}
 * We parse it, validate the type, and send only the messId to the backend.
 */
export const scanQrCode = async (rawQrData: string): Promise<any> => {
  let parsed: any;
  try {
    parsed = JSON.parse(rawQrData);
  } catch {
    throw new Error("That's not a mess QR code. Please scan the QR displayed at the mess counter.");
  }

  if (!parsed || parsed.type !== 'MESS_VERIFICATION') {
    throw new Error("That's not a mess QR code. Please scan the QR displayed at the mess counter.");
  }

  if (!parsed.messId) {
    throw new Error("Invalid mess QR code — no mess identifier found.");
  }

  try {
    return await baseClient.post('/api/student/verify-meal', {
      scannedMessId: parsed.messId,
    });
  } catch (err: any) {
    // Map backend error messages to user-friendly copy
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('already verified') || msg.includes('already claimed')) {
      throw new Error("You've already claimed today's meal.");
    }
    if (msg.includes('cron') || msg.includes('charge') || msg.includes('no active')) {
      throw new Error("Today's meal hasn't been posted yet. Check with the mess counter.");
    }
    if (msg.includes('different mess') || msg.includes('not enrolled') || err.status === 403) {
      throw new Error("This QR is for a different mess than the one you're enrolled in.");
    }
    if (msg.includes('insufficient') || msg.includes('balance')) {
      throw new Error("Your token balance is too low to claim this meal.");
    }
    throw new Error(err.message || 'Failed to verify meal. Please try again.');
  }
};

export const requestRebate = async (fromDate: number, toDate: number): Promise<any> => {
  return await baseClient.post('/api/student/request-rebate', {
    fromDate,
    toDate,
  });
};

export const requestMessChange = async (toMessId: string): Promise<any> => {
  return await baseClient.post('/api/student/request-mess-change', {
    toMessId,
  });
};