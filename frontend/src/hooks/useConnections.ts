import { useState, useEffect, useCallback } from 'react';
import {
  getConnectionsApi,
  openPlatformPortalApi,
  connectPlatformApi,
  connectAllPortalsApi,
  verifyConnectionApi,
  retryConnectionApi,
  disconnectPlatformApi,
  syncEnvConnectionsApi,
  type BackendConnectionItem,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const DEFAULT_PORTALS: BackendConnectionItem[] = [
  { user_id: '', platform: 'Naukri.com', portal_id: 'naukri', status: 'not_connected', website_url: 'https://www.naukri.com' },
  { user_id: '', platform: 'Internshala', portal_id: 'internshala', status: 'not_connected', website_url: 'https://internshala.com' },
  { user_id: '', platform: 'Indeed', portal_id: 'indeed', status: 'not_connected', website_url: 'https://in.indeed.com' },
  { user_id: '', platform: 'LinkedIn Jobs', portal_id: 'linkedin', status: 'not_connected', website_url: 'https://www.linkedin.com' },
  { user_id: '', platform: 'Foundit', portal_id: 'foundit', status: 'not_connected', website_url: 'https://www.foundit.in' },
  { user_id: '', platform: 'Wellfound', portal_id: 'wellfound', status: 'not_connected', website_url: 'https://wellfound.com' },
  { user_id: '', platform: 'Glassdoor', portal_id: 'glassdoor', status: 'not_connected', website_url: 'https://www.glassdoor.co.in' },
  { user_id: '', platform: 'Cutshort', portal_id: 'cutshort', status: 'not_connected', website_url: 'https://cutshort.io' },
];

let cachedConnectionsData: BackendConnectionItem[] | null = null;

export function useConnections() {
  const { session, getToken } = useAuth();
  const [connections, setConnections] = useState<BackendConnectionItem[]>(() => cachedConnectionsData || DEFAULT_PORTALS);
  const [loading, setLoading] = useState<boolean>(!cachedConnectionsData);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getActiveToken = useCallback(async (): Promise<string | null> => {
    return (await getToken?.()) || session?.token || null;
  }, [getToken, session?.token]);

  const fetchConnections = useCallback(async () => {
    const token = await getActiveToken();
    if (!token) {
      setConnections(DEFAULT_PORTALS);
      setLoading(false);
      return;
    }

    try {
      if (!cachedConnectionsData) {
        setLoading(true);
      }
      const res = await getConnectionsApi(token);
      if (res.connections && res.connections.length > 0) {
        cachedConnectionsData = res.connections;
        setConnections(res.connections);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch portal connections');
    } finally {
      setLoading(false);
    }
  }, [getActiveToken]);

  const openPortal = async (platform: string) => {
    const token = await getActiveToken();
    if (!token) throw new Error('Candidate is not authenticated.');

    try {
      setActionLoading(platform);
      setError(null);
      await openPlatformPortalApi(token, platform);
      await fetchConnections();
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to open ${platform}`;
      setError(msg);
      throw new Error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const connectPlatform = async (
    platform: string,
    payload?: {
      account_email?: string;
      account_password?: string;
      permission_granted?: boolean;
      launch_browser?: boolean;
    }
  ) => {
    const token = await getActiveToken();
    if (!token) throw new Error('Candidate is not authenticated.');

    try {
      setActionLoading(platform);
      setError(null);
      const res = payload
        ? await connectPlatformApi(token, platform, payload)
        : await connectPlatformApi(token, platform);
      await fetchConnections();
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to connect ${platform}`;
      setError(msg);
      throw new Error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const connectAllPlatforms = async (payload?: {
    permission_granted?: boolean;
    account_email?: string;
  }) => {
    const token = await getActiveToken();
    if (!token) throw new Error('Candidate is not authenticated.');

    try {
      setActionLoading('all');
      setError(null);
      const res = await connectAllPortalsApi(token, payload);
      if (res.connections) {
        cachedConnectionsData = res.connections;
        setConnections(res.connections);
      }
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect all platforms';
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

  const retryConnection = async (platform: string) => {
    const token = await getActiveToken();
    if (!token) throw new Error('Candidate is not authenticated.');

    try {
      setActionLoading(platform);
      setError(null);
      const res = await retryConnectionApi(token, platform);
      await fetchConnections();
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to retry verification for ${platform}`;
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

  const syncFromEnv = async () => {
    const token = await getActiveToken();
    if (!token) throw new Error('Candidate is not authenticated.');

    try {
      setActionLoading('all');
      setError(null);
      const res = await syncEnvConnectionsApi(token);
      if (res.connections) {
        cachedConnectionsData = res.connections;
        setConnections(res.connections);
      }
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to sync credentials from .env';
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
    openPortal,
    connectPlatform,
    connectAllPlatforms,
    syncFromEnv,
    verifyConnection,
    retryConnection,
    disconnectPlatform,
  };
}
