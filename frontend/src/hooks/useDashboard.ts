import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import type {
  DashboardStats,
  MonthlyTrendPoint,
  ComplianceDistribution,
  DocumentStatusDistribution,
  RecentActivityItem,
  ExpiringDocument,
  Alert,
  Application,
} from '../types';

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trendData, setTrendData] = useState<MonthlyTrendPoint[]>([]);
  const [complianceData, setComplianceData] = useState<ComplianceDistribution[]>([]);
  const [docStatusData, setDocStatusData] = useState<DocumentStatusDistribution[]>([]);
  const [appStatusData, setAppStatusData] = useState<ComplianceDistribution[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<ExpiringDocument[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<Alert[]>([]);
  const [pendingApps, setPendingApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        statsRes,
        trendRes,
        compRes,
        docStatusRes,
        appStatusRes,
        activityRes,
        expiringRes,
        alertsRes,
        pendingRes,
      ] = await Promise.allSettled([
        api.get<DashboardStats>('/dashboard/stats'),
        api.get<MonthlyTrendPoint[]>('/dashboard/monthly-trends'),
        api.get<ComplianceDistribution[]>('/dashboard/compliance-overview'),
        api.get<DocumentStatusDistribution[]>('/dashboard/document-status-breakdown'),
        api.get<ComplianceDistribution[]>('/dashboard/application-status-distribution'),
        api.get<RecentActivityItem[]>('/dashboard/recent-activity'),
        api.get<ExpiringDocument[]>('/renewals/expiring?days=90'),
        api.get<Alert[]>('/dashboard/alerts-summary'),
        api.get('/applications?limit=6'),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (trendRes.status === 'fulfilled') setTrendData(trendRes.value.data);
      if (compRes.status === 'fulfilled') setComplianceData(compRes.value.data);
      if (docStatusRes.status === 'fulfilled') setDocStatusData(docStatusRes.value.data);
      if (appStatusRes.status === 'fulfilled') setAppStatusData(appStatusRes.value.data);
      if (activityRes.status === 'fulfilled') setRecentActivity(activityRes.value.data);
      if (expiringRes.status === 'fulfilled') setExpiringDocs(expiringRes.value.data);
      if (alertsRes.status === 'fulfilled') setCriticalAlerts(alertsRes.value.data ?? []);
      if (pendingRes.status === 'fulfilled') setPendingApps(pendingRes.value.data?.items ?? []);
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    stats,
    trendData,
    complianceData,
    docStatusData,
    appStatusData,
    recentActivity,
    expiringDocs,
    criticalAlerts,
    pendingApps,
    loading,
    error,
    refetch: fetchAll,
  };
}
