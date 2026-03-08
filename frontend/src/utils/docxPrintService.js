// Example frontend integration for DOCX printing
// This can be integrated into your existing React components

class DocxPrintService {
  static async downloadLedgerReport(farmerId, fromDate, toDate, commissionPct = 12.0) {
    try {
      // Get auth token
      const token = localStorage.getItem('skfs_auth_token');
      
      // Make API request
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/print-docx/ledger-report?` + 
        new URLSearchParams({
          farmer_id: farmerId,
          from_date: fromDate,
          to_date: toDate,
          commission_pct: commissionPct
        }),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Get filename from response headers or create default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'ledger_report.docx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      return { success: true, filename };
      
    } catch (error) {
      console.error('DOCX download failed:', error);
      throw error;
    }
  }
  
  static async downloadGroupPattiReport(groupId, fromDate, toDate, commissionPct = 12.0) {
    try {
      const token = localStorage.getItem('skfs_auth_token');
      
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/print-docx/group-patti-report?` + 
        new URLSearchParams({
          group_id: groupId,
          from_date: fromDate,
          to_date: toDate,
          commission_pct: commissionPct
        }),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'group_patti_report.docx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      return { success: true, filename };
      
    } catch (error) {
      console.error('DOCX download failed:', error);
      throw error;
    }
  }
  
  // Alternative: Open in new tab instead of downloading
  static async openLedgerReportInNewTab(farmerId, fromDate, toDate, commissionPct = 12.0) {
    try {
      const token = localStorage.getItem('skfs_auth_token');
      
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/print-docx/ledger-report?` + 
        new URLSearchParams({
          farmer_id: farmerId,
          from_date: fromDate,
          to_date: toDate,
          commission_pct: commissionPct
        }),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Open in new tab
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        // Fallback to download if popup blocked
        const a = document.createElement('a');
        a.href = url;
        a.download = `ledger_report_${farmerId}_${Date.now()}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      
      // Clean up URL object after some time
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      
      return { success: true };
      
    } catch (error) {
      console.error('DOCX open failed:', error);
      throw error;
    }
  }
}

// Usage examples:

// 1. Download ledger report
// DocxPrintService.downloadLedgerReport(123, '2026-01-01', '2026-01-31', 12.0)
//   .then(result => console.log('Downloaded:', result.filename))
//   .catch(error => console.error('Failed:', error));

// 2. Open in new tab
// DocxPrintService.openLedgerReportInNewTab(123, '2026-01-01', '2026-01-31')
//   .then(result => console.log('Opened in new tab'))
//   .catch(error => console.error('Failed:', error));

// 3. React component integration example:
/*
function PrintButton({ farmerId, fromDate, toDate }) {
  const [loading, setLoading] = useState(false);
  
  const handlePrint = async () => {
    setLoading(true);
    try {
      await DocxPrintService.downloadLedgerReport(farmerId, fromDate, toDate);
      // Show success message
    } catch (error) {
      // Show error message
      console.error('Print failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <button 
      onClick={handlePrint} 
      disabled={loading}
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? 'Generating...' : 'Print Ledger Report'}
    </button>
  );
}
*/

export default DocxPrintService;