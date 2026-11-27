'use client';
import { logger } from '@/lib/logger';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient, DEFAULT_COMPANY_ID } from './api-client';

export interface CompanyBranch {
  id: string;
  name: string;
  gstin?: string;
  stateCode: string;
  isHeadOffice: boolean;
}

export interface Company {
  id: string;
  legalName: string;
  tradeName?: string;
  pan?: string;
  defaultCurrency: string;
  branches: CompanyBranch[];
  financialYears: any[];
}

interface CompanyContextType {
  companies: Company[];
  activeCompany: Company | null;
  activeCompanyId: string;
  activeSettings: Record<string, any>;
  tallyEnabled: boolean;
  invoicingOnly: boolean;
  setActiveCompanyId: (id: string) => void;
  refreshCompanies: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  loading: boolean;
}

const CompanyContext = createContext<CompanyContextType>({
  companies: [],
  activeCompany: null,
  activeCompanyId: DEFAULT_COMPANY_ID,
  activeSettings: {},
  tallyEnabled: false,
  invoicingOnly: false,
  setActiveCompanyId: () => {},
  refreshCompanies: async () => {},
  refreshSettings: async () => {},
  loading: true,
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string>(DEFAULT_COMPANY_ID);
  const [activeSettings, setActiveSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Sync activeCompanyId from localStorage on mount to avoid hydration mismatches
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('antigravity_active_company_id');
      if (stored) {
        setActiveCompanyIdState(stored);
      }
    }
  }, []);

  const fetchSettings = useCallback(async (targetCompanyId: string) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('antigravity_access_token');
      const isAuthPage = window.location.pathname.startsWith('/auth');
      if (!token || isAuthPage) {
        setActiveSettings({});
        return;
      }
    }
    try {
      const settings = await apiClient.getCompanySettings(targetCompanyId);
      setActiveSettings(settings || {});
    } catch {
      setActiveSettings({});
    }
  }, []);

  const fetchCompanies = async () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('antigravity_access_token');
      const isAuthPage = window.location.pathname.startsWith('/auth');
      if (!token || isAuthPage) {
        setCompanies([]);
        setLoading(false);
        return;
      }
    }
    try {
      const data = await apiClient.listCompanies();
      const companyList = data || [];
      setCompanies(companyList);

      // If activeCompanyId not in list, fallback to first company or DEFAULT
      let currentId = activeCompanyId;
      if (companyList.length > 0) {
        const found = companyList.find((c: any) => c.id === activeCompanyId);
        if (!found) {
          currentId = companyList[0].id;
          setActiveCompanyIdState(currentId);
          if (typeof window !== 'undefined') {
            localStorage.setItem('antigravity_active_company_id', currentId);
          }
        }
      }
      await fetchSettings(currentId);
    } catch (err: unknown) {
      logger.error('Failed to load companies in CompanyProvider', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (activeCompanyId) {
      fetchSettings(activeCompanyId);
    }
  }, [activeCompanyId, fetchSettings]);

  const setActiveCompanyId = (id: string) => {
    setActiveCompanyIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('antigravity_active_company_id', id);
    }
  };

  const activeCompany = companies.find((c) => c.id === activeCompanyId) || companies[0] || null;
  const tallyEnabled = Boolean(activeSettings['integration.tally_enabled']);
  const invoicingOnly = Boolean(activeSettings['portal.invoicing_only']);

  return (
    <CompanyContext.Provider
      value={{
        companies,
        activeCompany,
        activeCompanyId,
        activeSettings,
        tallyEnabled,
        invoicingOnly,
        setActiveCompanyId,
        refreshCompanies: fetchCompanies,
        refreshSettings: () => fetchSettings(activeCompanyId),
        loading,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
