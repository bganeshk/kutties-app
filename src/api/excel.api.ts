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

  async listRows(sheet: string, sinceDate?: string): Promise<RemoteRow[]> {
    const params = sinceDate ? { sinceDate } : undefined;
    const { data } = await client.get<ListResponse>(`/api/${sheet}`, { params });
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

  /**
   * Upload a single file attachment for an activity.
   * POST /api/:sheet/:id/attachments (multipart/form-data)
   * Returns the stored URL.
   */
  async uploadAttachment(
    sheet: string,
    id: string,
    fileUri: string,
    fileName: string,
    mimeType: string,
  ): Promise<string> {
    const formData = new FormData();
    formData.append('file', { uri: fileUri, name: fileName, type: mimeType } as any);
    const { data } = await client.post<{ success: boolean; data: { url: string } }>(
      `/api/${sheet}/${id}/attachments`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 30000 },
    );
    return data.data.url;
  },

  /**
   * Remove one attachment URL from an activity's SubmissionAttachments.
   * DELETE /api/:sheet/:id/attachments  body: { url }
   */
  async removeAttachment(sheet: string, id: string, url: string): Promise<void> {
    await client.delete(`/api/${sheet}/${id}/attachments`, { data: { url } });
  },

  /**
   * Seed the sheet with headers if it doesn't already have them.
   * Idempotent — safe to call on every app launch.
   * Returns true if headers were written, false if they already existed.
   */
  async initSheet(sheet: string, headers: string[]): Promise<boolean> {
    const { data } = await client.post<{ success: boolean; data: { written: boolean } }>(
      `/api/${sheet}/init`,
      { headers },
    );
    return data.data.written;
  },

  /**
   * Add a column to an existing sheet if it is not already present.
   * POST /api/:sheet/add-column  body: { column: string }
   * Returns true if the column was added, false if it already existed.
   */
  async addColumn(sheet: string, column: string): Promise<boolean> {
    try {
      const { data } = await client.post<{ success: boolean; data: { added: boolean } }>(
        `/api/${sheet}/add-column`,
        { column },
      );
      return data.data.added;
    } catch (e: any) {
      // 404 means the server doesn't support this endpoint yet — treat as no-op
      if (e?.response?.status === 404) return false;
      throw e;
    }
  },
};
