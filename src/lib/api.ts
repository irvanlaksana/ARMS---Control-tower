import { useAuth } from "../auth/AuthProvider";

export const useApi = () => {
  const { googleToken, spreadsheetId } = useAuth();

  const request = async (endpoint: string, body?: any) => {
    if (!googleToken) throw new Error("Not authenticated");
    const res = await fetch(`/api${endpoint}`, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${googleToken}`
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "API Request failed");
    }
    return res.json();
  };

  const initDb = async () => {
    const data = await request("/init-db", {});
    return data.spreadsheetId;
  };

  const querySheet = async (sheetName: string, range = "A:Z") => {
    if (!spreadsheetId) throw new Error("No spreadsheet configured");
    return request("/query", { spreadsheetId, range: `${sheetName}!${range}` });
  };

  const appendRow = async (sheetName: string, values: any[][]) => {
    if (!spreadsheetId) throw new Error("No spreadsheet configured");
    return request("/append", { spreadsheetId, range: `${sheetName}!A1`, values });
  };

  return { initDb, querySheet, appendRow };
};
