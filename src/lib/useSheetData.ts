import { useState, useEffect } from 'react';
import { useApi } from './api';

export function useSheetData(sheetName: string, range = "A:Z") {
  const api = useApi();
  const [data, setData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await api.querySheet(sheetName, range);
      const rows = result.values || [];
      if (rows.length > 0) {
        setHeaders(rows[0]);
        setData(rows.slice(1).map((row: any[]) => {
          const obj: any = {};
          rows[0].forEach((header: string, i: number) => {
            obj[header] = row[i] || "";
          });
          return obj;
        }));
      } else {
        setData([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [sheetName, range]);

  return { data, headers, loading, error, refresh };
}
