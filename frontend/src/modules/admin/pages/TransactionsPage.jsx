import React, { useEffect, useState } from 'react';
import { IndianRupee, Receipt, CheckCircle2, XCircle, Clock, Filter, FileText, ChevronLeft, ChevronRight, RotateCcw, Loader2 } from 'lucide-react';
import { Table, TableHead, TableRow, TableHeader, TableCell } from '../components/Table';
import adminApi from '../services/adminApi';
import { PageSpinner } from '../../../shared/components/ui/Spinner';

const STATUS_FILTERS = ['all', 'success', 'failed'];

const STATUS_STYLES = {
    success: { bg: 'bg-success-50 text-success-600', icon: CheckCircle2 },
    pending: { bg: 'bg-amber-100 text-amber-700', icon: Clock },
    failed: { bg: 'bg-danger-50 text-danger-600', icon: XCircle },
    refunded: { bg: 'bg-zinc-100 text-zinc-600', icon: RotateCcw },
};

const StatusBadge = ({ status }) => {
    const { bg, icon: Icon } = STATUS_STYLES[status] || STATUS_STYLES.pending;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase ${bg}`}>
            <Icon className="w-3 h-3" />
            {status}
        </span>
    );
};

const loadHtml2Pdf = () => {
    return new Promise((resolve, reject) => {
        if (window.html2pdf) return resolve(window.html2pdf);
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.crossOrigin = 'anonymous';
        script.referrerPolicy = 'no-referrer';
        script.onload = () => resolve(window.html2pdf);
        script.onerror = () => reject(new Error('Failed to load html2pdf script'));
        document.head.appendChild(script);
    });
};

const triggerPrintFallback = (transactions, pageRevenue, successCount, pendingCount, failedCount) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to download the PDF report');
        return;
    }
    const exportDateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
    const content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Hemsely_Transaction_Report_${new Date().toISOString().slice(0, 10)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #FFFFFF; color: #18181B; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 20px; border-bottom: 3px solid #733FE0; margin-bottom: 24px; }
    .brand { font-size: 28px; font-weight: 900; color: #733FE0; letter-spacing: -0.8px; }
    .report-title { font-size: 16px; font-weight: 700; color: #27272A; margin-top: 2px; }
    .meta-box { font-size: 11.5px; color: #71717A; text-align: right; line-height: 1.5; }
    .meta-val { font-weight: 700; color: #18181B; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
    .kpi-card { background: #FAF8FE; border: 1px solid #E4D1FF; padding: 14px 16px; border-radius: 14px; }
    .kpi-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #71717A; letter-spacing: 0.5px; margin-bottom: 4px; }
    .kpi-val { font-size: 22px; font-weight: 900; color: #18181B; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 12px; }
    th { background: #18181B; color: #FFFFFF; font-weight: 800; text-align: left; padding: 11px 12px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.6px; border: none; }
    td { padding: 12px; border-bottom: 1px solid #E4E4E7; vertical-align: top; }
    tr:nth-child(even) td { background: #FAF9FE; }
    .user-name { font-weight: 700; color: #09090B; font-size: 13px; }
    .user-sub { font-size: 11px; color: #71717A; margin-top: 1px; }
    .id-badge { font-family: monospace; font-size: 11px; font-weight: 800; color: #733FE0; background: #F3EAFF; border: 1px solid #E4D1FF; padding: 2px 7px; border-radius: 6px; display: inline-block; }
    .sub-badge { font-family: monospace; font-size: 11px; font-weight: 600; color: #52525B; background: #F4F4F5; border: 1px solid #E4E4E7; padding: 2px 7px; border-radius: 6px; display: inline-block; margin-top: 3px; }
    .badge { font-weight: 800; padding: 3px 10px; border-radius: 999px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; display: inline-block; }
    .badge-success { background: #DCFCE7; color: #15803D; border: 1px solid #BBF7D0; }
    .badge-pending { background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; }
    .badge-failed { background: #FEE2E2; color: #B91C1C; border: 1px solid #FECACA; }
    .footer { display: flex; justify-content: space-between; align-items: center; border-top: 1.5px solid #E4E4E7; padding-top: 16px; font-size: 11px; color: #A1A1AA; font-weight: 500; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Hemsely</div>
      <div class="report-title">Transaction History Report</div>
    </div>
    <div class="meta-box">
      <div>Export Date: <span class="meta-val">${exportDateStr}</span></div>
      <div>Total Records: <span class="meta-val">${transactions.length}</span></div>
    </div>
  </div>
  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-label">Total Revenue</div><div class="kpi-val">₹${pageRevenue.toLocaleString('en-IN')}</div></div>
    <div class="kpi-card"><div class="kpi-label">Successful</div><div class="kpi-val" style="color: #16A34A">${successCount}</div></div>
    <div class="kpi-card"><div class="kpi-label">Pending</div><div class="kpi-val" style="color: #D97706">${pendingCount}</div></div>
    <div class="kpi-card"><div class="kpi-label">Failed</div><div class="kpi-val" style="color: #DC2626">${failedCount}</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>User Details</th><th>Txn & Sub IDs</th><th>Plan</th><th>Amount</th><th>Gateway</th><th>Date</th><th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${transactions.map((t) => `
        <tr>
          <td>
            <div class="user-name">${t.user ? `${t.user.firstName || ''} ${t.user.lastName || ''}`.trim() || t.userName || 'User' : (t.userName || 'User')}</div>
            <div class="user-sub">${t.user?.email || t.userEmail || t.user?.phoneNumber || t.userPhone || ''}</div>
          </td>
          <td>
            <div class="id-badge">TXN: ${t.transactionId || t.gatewayPaymentId || (t._id ? String(t._id).slice(-8) : 'N/A')}</div>
            ${t.subscriptionId ? `<br/><div class="sub-badge">SUB: ${t.subscriptionId}</div>` : ''}
          </td>
          <td><strong>${t.plan?.name || t.planName || '—'}</strong></td>
          <td><strong>₹${t.amount.toLocaleString('en-IN')}</strong></td>
          <td style="text-transform: capitalize">${t.gateway || 'Razorpay'}</td>
          <td>${new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
          <td><span class="badge badge-${t.status}">${t.status}</span></td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="footer">
    <div>Hemsely Admin Panel • Financial Log</div>
    <div>Generated automatically</div>
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
</body>
</html>`;
    printWindow.document.write(content);
    printWindow.document.close();
};

const handleExportPdf = async (transactions, pageRevenue, successCount, pendingCount, failedCount, setExporting) => {
    setExporting(true);
    let container;
    try {
        const html2pdf = await loadHtml2Pdf();
        const exportDateStr = new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '-10000px';
        container.style.width = '750px';
        container.style.padding = '24px';
        container.style.background = '#FFFFFF';
        container.style.fontFamily = "'Inter', system-ui, sans-serif";
        container.style.color = '#18181B';
        // html2canvas (used internally by html2pdf) needs the node actually attached
        // to the document to measure/render it correctly - an off-DOM node can
        // silently produce a blank or mis-sized PDF. Positioned off-screen so it
        // never flashes on screen, and removed again once the export finishes.
        document.body.appendChild(container);

        container.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 16px; border-bottom: 3px solid #733FE0; margin-bottom: 20px;">
            <div>
              <div style="font-size: 26px; font-weight: 900; color: #733FE0; letter-spacing: -0.8px;">Hemsely</div>
              <div style="font-size: 15px; font-weight: 700; color: #27272A; margin-top: 2px;">Transaction History Report</div>
            </div>
            <div style="font-size: 11px; color: #71717A; text-align: right; line-height: 1.5;">
              <div>Export Date: <strong style="color: #18181B">${exportDateStr}</strong></div>
              <div>Total Records: <strong style="color: #18181B">${transactions.length}</strong></div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
            <div style="background: #FAF8FE; border: 1px solid #E4D1FF; padding: 10px 12px; border-radius: 10px;">
              <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #71717A; margin-bottom: 2px;">Total Revenue</div>
              <div style="font-size: 18px; font-weight: 900; color: #18181B;">₹${pageRevenue.toLocaleString('en-IN')}</div>
            </div>
            <div style="background: #FAF8FE; border: 1px solid #E4D1FF; padding: 10px 12px; border-radius: 10px;">
              <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #71717A; margin-bottom: 2px;">Successful</div>
              <div style="font-size: 18px; font-weight: 900; color: #16A34A;">${successCount}</div>
            </div>
            <div style="background: #FAF8FE; border: 1px solid #E4D1FF; padding: 10px 12px; border-radius: 10px;">
              <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #71717A; margin-bottom: 2px;">Pending</div>
              <div style="font-size: 18px; font-weight: 900; color: #D97706;">${pendingCount}</div>
            </div>
            <div style="background: #FAF8FE; border: 1px solid #E4D1FF; padding: 10px 12px; border-radius: 10px;">
              <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #71717A; margin-bottom: 2px;">Failed</div>
              <div style="font-size: 18px; font-weight: 900; color: #DC2626;">${failedCount}</div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
            <thead>
              <tr style="background: #18181B; color: #FFFFFF;">
                <th style="padding: 8px 10px; text-align: left; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">User Details</th>
                <th style="padding: 8px 10px; text-align: left; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">Txn & Sub IDs</th>
                <th style="padding: 8px 10px; text-align: left; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">Plan</th>
                <th style="padding: 8px 10px; text-align: left; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">Amount</th>
                <th style="padding: 8px 10px; text-align: left; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">Gateway</th>
                <th style="padding: 8px 10px; text-align: left; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">Date</th>
                <th style="padding: 8px 10px; text-align: left; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map((t, idx) => `
                <tr style="background: ${idx % 2 === 1 ? '#FAF9FE' : '#FFFFFF'}; border-bottom: 1px solid #E4E4E7;">
                  <td style="padding: 9px 10px;">
                    <div style="font-weight: 700; color: #09090B; font-size: 11.5px;">${t.user ? `${t.user.firstName || ''} ${t.user.lastName || ''}`.trim() || t.userName || 'User' : (t.userName || 'User')}</div>
                    <div style="font-size: 10px; color: #71717A; margin-top: 1px;">${t.user?.email || t.userEmail || t.user?.phoneNumber || t.userPhone || ''}</div>
                  </td>
                  <td style="padding: 9px 10px;">
                    <div style="font-family: monospace; font-size: 10px; font-weight: 800; color: #733FE0; background: #F3EAFF; border: 1px solid #E4D1FF; padding: 1px 5px; border-radius: 4px; display: inline-block;">TXN: ${t.transactionId || t.gatewayPaymentId || (t._id ? String(t._id).slice(-8) : 'N/A')}</div>
                    ${t.subscriptionId ? `<div style="font-family: monospace; font-size: 10px; font-weight: 600; color: #52525B; background: #F4F4F5; border: 1px solid #E4E4E7; padding: 1px 5px; border-radius: 4px; display: inline-block; margin-top: 2px;">SUB: ${t.subscriptionId}</div>` : ''}
                  </td>
                  <td style="padding: 9px 10px;"><strong>${t.plan?.name || t.planName || '—'}</strong></td>
                  <td style="padding: 9px 10px;"><strong>₹${t.amount.toLocaleString('en-IN')}</strong></td>
                  <td style="padding: 9px 10px; text-transform: capitalize;">${t.gateway || 'Razorpay'}</td>
                  <td style="padding: 9px 10px;">${new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td style="padding: 9px 10px;">
                    <span style="font-weight: 800; padding: 2px 7px; border-radius: 999px; font-size: 9px; text-transform: uppercase; ${
                      t.status === 'success' ? 'background: #DCFCE7; color: #15803D;' : t.status === 'pending' ? 'background: #FEF3C7; color: #B45309;' : 'background: #FEE2E2; color: #B91C1C;'
                    }">${t.status}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #E4E4E7; padding-top: 12px; font-size: 10px; color: #A1A1AA; font-weight: 500;">
            <div>Hemsely Admin Panel • Financial Log</div>
            <div>Generated automatically</div>
          </div>
        `;

        const opt = {
            margin: 8,
            filename: `Hemsely_Transaction_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        await html2pdf().set(opt).from(container).save();
    } catch (err) {
        console.error('PDF export fallback:', err);
        triggerPrintFallback(transactions, pageRevenue, successCount, pendingCount, failedCount);
    } finally {
        if (container) container.remove();
        setExporting(false);
    }
};

const TransactionsPage = () => {
    const [transactions, setTransactions] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalTransactions: 0 });
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        setLoading(true);
        setLoadError('');
        const query = new URLSearchParams({ page: String(page), limit: '10' });
        if (statusFilter !== 'all') query.set('status', statusFilter);
        if (dateFrom) query.set('startDate', dateFrom);
        if (dateTo) query.set('endDate', dateTo);

        adminApi.get(`/admin/transactions?${query.toString()}`).then(({ data, ok }) => {
            if (ok && data.success) {
                setTransactions(data.transactions);
                setPagination(data.pagination);
            } else {
                setLoadError(data?.message || 'Could not load transactions.');
            }
            setLoading(false);
        }).catch(() => {
            setLoadError('Could not load transactions. Please try again.');
            setLoading(false);
        });
    }, [page, statusFilter, dateFrom, dateTo]);

    // The visible table is paginated to 10 rows - exporting should reflect every
    // transaction matching the current filters, not just what's on screen. The
    // backend caps `limit` at 50 per request regardless of what's asked for, so
    // fetch every page at that cap and concatenate rather than a single request.
    const handleExportClick = async () => {
        setExporting(true);
        try {
            const EXPORT_PAGE_SIZE = 50;
            const baseParams = {};
            if (statusFilter !== 'all') baseParams.status = statusFilter;
            if (dateFrom) baseParams.startDate = dateFrom;
            if (dateTo) baseParams.endDate = dateTo;

            let fullSet = [];
            let exportPage = 1;
            let totalExportPages = 1;
            do {
                const query = new URLSearchParams({ ...baseParams, page: String(exportPage), limit: String(EXPORT_PAGE_SIZE) });
                const { data, ok } = await adminApi.get(`/admin/transactions?${query.toString()}`);
                if (!ok || !data.success) break;
                fullSet = fullSet.concat(data.transactions);
                totalExportPages = data.pagination?.totalPages || 1;
                exportPage += 1;
            } while (exportPage <= totalExportPages);

            if (fullSet.length === 0) fullSet = transactions;

            const fullSuccessCount = fullSet.filter((t) => t.status === 'success').length;
            const fullPendingCount = fullSet.filter((t) => t.status === 'pending').length;
            const fullFailedCount = fullSet.filter((t) => t.status === 'failed').length;
            const fullRevenue = fullSet.filter((t) => t.status === 'success').reduce((sum, t) => sum + t.amount, 0);

            await handleExportPdf(fullSet, fullRevenue, fullSuccessCount, fullPendingCount, fullFailedCount, setExporting);
        } catch {
            // Fall back to exporting just what's currently loaded rather than failing outright.
            await handleExportPdf(transactions, pageRevenue, successCount, pendingCount, failedCount, setExporting);
        }
    };

    const successCount = transactions.filter((t) => t.status === 'success').length;
    const pendingCount = transactions.filter((t) => t.status === 'pending').length;
    const failedCount = transactions.filter((t) => t.status === 'failed').length;
    const pageRevenue = transactions.filter((t) => t.status === 'success').reduce((sum, t) => sum + t.amount, 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-medium text-zinc-900 tracking-tight">Transaction History</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Read-only log of all subscription payments and their statuses.
                </p>
            </div>

            {/* Compact Toolbar Row: Stats Cards + Filters + Export PDF */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-3.5 flex flex-wrap items-center justify-between gap-3">
                {/* Stats Cards */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl px-3 py-1.5 flex items-center gap-2.5 shadow-2xs">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100/70 flex items-center justify-center shrink-0">
                            <IndianRupee className="w-3.5 h-3.5 text-emerald-700" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider leading-none">Revenue (This Page)</p>
                            <p className="text-sm font-extrabold text-zinc-900 leading-tight mt-0.5">₹{pageRevenue.toLocaleString('en-IN')}</p>
                        </div>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl px-3 py-1.5 flex items-center gap-2.5 shadow-2xs">
                        <div className="w-7 h-7 rounded-lg bg-blue-100/70 flex items-center justify-center shrink-0">
                            <Receipt className="w-3.5 h-3.5 text-blue-700" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider leading-none">Successful (This Page)</p>
                            <p className="text-sm font-extrabold text-zinc-900 leading-tight mt-0.5">{successCount}</p>
                        </div>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl px-3 py-1.5 flex items-center gap-2.5 shadow-2xs">
                        <div className="w-7 h-7 rounded-lg bg-red-100/70 flex items-center justify-center shrink-0">
                            <XCircle className="w-3.5 h-3.5 text-red-700" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider leading-none">Failed (This Page)</p>
                            <p className="text-sm font-extrabold text-zinc-900 leading-tight mt-0.5">{failedCount}</p>
                        </div>
                    </div>
                </div>

                {/* Filters & Export PDF on same line */}
                <div className="flex flex-wrap items-center gap-2.5 ml-auto">
                    <div className="flex items-center gap-1.5">
                        <label htmlFor="txn-status-filter" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status:</label>
                        <select
                            id="txn-status-filter"
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-900 outline-none focus:border-purple-600 capitalize font-semibold shadow-2xs"
                        >
                            {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <label htmlFor="date-from" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">From:</label>
                        <input
                            id="date-from"
                            type="date"
                            value={dateFrom}
                            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                            className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 outline-none focus:border-purple-600 font-medium shadow-2xs"
                        />
                    </div>

                    <div className="flex items-center gap-1.5">
                        <label htmlFor="date-to" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">To:</label>
                        <input
                            id="date-to"
                            type="date"
                            value={dateTo}
                            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                            className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 outline-none focus:border-purple-600 font-medium shadow-2xs"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleExportClick}
                        disabled={transactions.length === 0 || exporting}
                        className="px-3.5 py-1.5 rounded-lg bg-[#703DE2] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#5C32BD] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                    >
                        {exporting ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Downloading...
                            </>
                        ) : (
                            <>
                                <FileText className="w-3.5 h-3.5" />
                                Export PDF
                            </>
                        )}
                    </button>
                </div>
            </div>

            {loadError && (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold px-4 py-3">
                    {loadError}
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl bg-white border border-zinc-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
                {loading ? (
                    <PageSpinner />
                ) : transactions.length === 0 ? (
                    <div className="p-10 text-center text-sm font-medium text-zinc-500">
                        No transactions match the selected filters.
                    </div>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow hover={false}>
                                <TableHeader>User</TableHeader>
                                <TableHeader>Txn & Sub IDs</TableHeader>
                                <TableHeader>Plan</TableHeader>
                                <TableHeader>Amount</TableHeader>
                                <TableHeader>Gateway</TableHeader>
                                <TableHeader>Date</TableHeader>
                                <TableHeader>Status</TableHeader>
                            </TableRow>
                        </TableHead>
                        <tbody>
                            {transactions.map((txn) => (
                                <TableRow key={txn._id}>
                                    <TableCell>
                                        <div className="text-sm font-semibold text-zinc-900 leading-tight">{txn.user ? `${txn.user.firstName || ''} ${txn.user.lastName || ''}`.trim() || txn.userName || 'User' : (txn.userName || 'User')}</div>
                                        <div className="text-xs text-zinc-500 mt-0.5">{txn.user?.email || txn.userEmail || txn.user?.phoneNumber || txn.userPhone}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#703DE2] bg-[#F5EEFF] border border-[#E4D1FF] px-2 py-0.5 rounded-md w-fit" title="Transaction ID">
                                                <span className="text-[10px] text-[#703DE2]/70 font-sans font-semibold uppercase">TXN:</span>
                                                {txn.transactionId || txn.gatewayPaymentId || (txn._id ? String(txn._id).slice(-8) : 'N/A')}
                                            </div>
                                            {txn.subscriptionId && (
                                                <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-zinc-600 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-md w-fit" title="Subscription ID">
                                                    <span className="text-[10px] text-zinc-400 font-sans uppercase font-semibold">SUB:</span>
                                                    {txn.subscriptionId}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm font-medium text-zinc-700">{txn.plan?.name || txn.planName || '—'}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm font-semibold text-zinc-900">₹{txn.amount.toLocaleString('en-IN')}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs font-medium text-zinc-600 capitalize">{txn.gateway}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs font-medium text-zinc-600">
                                            {new Date(txn.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={txn.status} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </tbody>
                    </Table>
                )}

                {/* Pagination */}
                {transactions.length > 0 && (
                    <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-5 py-3.5">
                        <span className="text-xs font-semibold text-zinc-500">
                            {pagination.totalTransactions} transaction{pagination.totalTransactions !== 1 ? 's' : ''} found
                        </span>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                                disabled={pagination.page <= 1}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 transition-colors shadow-sm"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Prev
                            </button>
                            <span className="text-xs font-semibold text-zinc-600">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                                disabled={pagination.page >= pagination.totalPages}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 transition-colors shadow-sm"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TransactionsPage;
