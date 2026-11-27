export async function downloadReportExport(
  companyId: string,
  reportKey: string,
  format: 'pdf' | 'xlsx' | 'html',
  params?: { fromDate?: string; toDate?: string; fileBase?: string; watermark?: string },
): Promise<void> {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('antigravity_access_token') : null;
  const sp = new URLSearchParams({ format });
  if (params?.fromDate) sp.set('fromDate', params.fromDate);
  if (params?.toDate) sp.set('toDate', params.toDate);
  if (params?.watermark) sp.set('watermark', params.watermark);

  const res = await fetch(
    `${base}/v1/companies/${companyId}/reports/${reportKey}/export?${sp.toString()}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!res.ok) {
    throw new Error(`Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${params?.fileBase || reportKey}_${new Date().toISOString().split('T')[0]}.${format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
