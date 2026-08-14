import { APP_CONFIG } from '../config/app';

export class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = APP_CONFIG.apiUrl) {
    this.baseUrl = baseUrl;
  }

  async get<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${endpoint}`);
    if (!res.ok) {
      throw new Error(`API GET request failed with status ${res.status}`);
    }
    return res.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`API POST request failed with status ${res.status}`);
    }
    return res.json();
  }
}

export const api = new ApiService();
