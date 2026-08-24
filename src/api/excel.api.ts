import axios from 'axios';

// Point this at your running excel-api server
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const client = axios.create({ baseURL: BASE_URL, timeout: 10000 });

export interface RemoteRow {
  id: string;
  [key: string]: unknown;
}

export interface ListResponse {
  success: boolean;
  data: RemoteRow[];
  total: number;
}

export const ExcelApi = {
  async listSheets(): Promise<string[]> {
    const { data } = await client.get<{ success: boolean; data: string[] }>('/api/sheets');
    return data.data;
  },

  async listRows(sheet: string): Promise<RemoteRow[]> {
    const { data } = await client.get<ListResponse>(`/api/${sheet}`);
    return data.data;
  },

  async createRow(sheet: string, payload: Record<string, unknown>): Promise<RemoteRow> {
    const { data } = await client.post<{ success: boolean; data: RemoteRow }>(`/api/${sheet}`, payload);
    return data.data;
  },

  async updateRow(sheet: string, id: string, payload: Record<string, unknown>): Promise<RemoteRow> {
    const { data } = await client.put<{ success: boolean; data: RemoteRow }>(`/api/${sheet}/${id}`, payload);
    return data.data;
  },

  async deleteRow(sheet: string, id: string): Promise<void> {
    await client.delete(`/api/${sheet}/${id}`);
  },
};
