import { baseClient } from './client';

export interface PublicMess {
  id: string;
  name: string;
}

export const getPublicMesses = async (): Promise<PublicMess[]> => {
  const response = await baseClient.get<{ messes: PublicMess[] }>('/api/public/messes');
  return response.messes || [];
};
