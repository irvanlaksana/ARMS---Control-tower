/**
 * Utility for exporting dataset to CSV and triggering direct browser download.
 * Adds UTF-8 BOM for seamless Microsoft Excel & Google Sheets compatibility.
 */

export interface CSVColumn<T> {
  header: string;
  accessor: (item: T, index: number) => string | number | boolean | null | undefined;
}

export function downloadCSV<T>(
  filename: string,
  data: T[],
  columns: CSVColumn<T>[]
) {
  if (!data || data.length === 0) {
    alert('Tidak ada data untuk diunduh (Data Kosong).');
    return;
  }

  // Create header line
  const headers = columns.map(c => escapeCSV(c.header)).join(';');

  // Create data rows
  const rows = data.map((item, idx) => {
    return columns
      .map(col => {
        const val = col.accessor(item, idx);
        return escapeCSV(val);
      })
      .join(';');
  });

  // Combine with UTF-8 BOM
  const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');

  // Create Blob & Trigger Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', cleanFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  // If string contains semicolon, comma, quotes, or newline, wrap in quotes and escape quotes
  if (str.includes(';') || str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export function formatRupiahNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}
