import { useState, useEffect, useCallback } from 'react';
import {
  getConnectionsApi,
  connectPlatformApi,
  verifyConnectionApi,
  disconnectPlatformApi,
  type BackendConnectionItem,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

export function useConnections() {
  const { session, getToken } = useAuth();
  const [connections, setConnections] = useState<BackendConnectionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getActiveToken = useCallback(async (): Promise<string | null> => {
    return (await getToken?.()) || session?.token || null;
  }, [getToken, session?.token]);

  const fetchConnections = useCallback(async () => {
    const token = await getActiveToken();
    if (!token) {
      setConnections([
        { user_id: '', platform: 'Naukri', status: 'not_connected' },
        { user_id: '', platform: 'Internshala', status: 'not_connected' },
        { user_id: '', platform: 'Indeed', status: 'not_connected' },
      ]);
      setLoading(false);
      return;
    }

    try {
      const res = await getConnectionsApi(token);
      setConnections(res.connections || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch portal connections');
    } finally {
      setLoading(false);
    }
  }, [getActiveToken]);

  const connectPlatform = async (platform: string) => {
    const token = await getActiveToken();
    if (!token) throw new Error('Candidate is not authenticated.');

    try {
      setActionLoading(platform);
      setError(null);
      await connectPlatformApi(token, platform);
      await fetchConnections();
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to connect ${platform}`;
      setError(msg);
      throw new Error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const verifyConnection = async (platform: string) => {
    const token = await getActiveToken();
    if (!token) throw new Error('Candidate is not authenticated.');

    try {
      setActionLoading(platform);
      setError(null);
      const res = await verifyConnectionApi(token, platform);
      await fetchConnections();
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to verify ${platform}`;
      setError(msg);
      throw new Error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const disconnectPlatform = async (platform: string) => {
    const token = await getActiveToken();
    if (!token) throw new Error('Candidate is not authenticated.');

    try {
      setActionLoading(platform);
      setError(null);
      await disconnectPlatformApi(token, platform);
      await fetchConnections();
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to disconnect ${platform}`;
      setError(msg);
      throw new Error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  return {
    connections,
    loading,
    actionLoading,
    error,
    refreshConnections: fetchConnections,
    connectPlatform,
    verifyConnection,
    disconnectPlatform,
  };
}
