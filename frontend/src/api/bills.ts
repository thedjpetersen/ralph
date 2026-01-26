const API_BASE = '/api';

// Bill types
export type BillStatus = 'upcoming' | 'due' | 'paid' | 'overdue' | 'cancelled';
export type BillFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'once';

export interface Bill {
  id: string;
  account_id: string;
  payee_name: string;
  description?: string;
  amount: number;
  currency: string;
  due_date: string;
  status: BillStatus;
  is_recurring: boolean;
  frequency?: BillFrequency;
  next_due_date?: string;
  last_paid_date?: string;
  reminder_days_before?: number;
  reminder_enabled: boolean;
  category?: string;
  notes?: string;
  auto_pay: boolean;
  payment_method?: string;
  created_at: string;
  updated_at: string;
}

export interface ListBillsResponse {
  bills: Bill[];
  total: number;
}

export interface ListBillsParams {
  status?: BillStatus;
  is_recurring?: boolean;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface CreateBillRequest {
  payee_name: string;
  description?: string;
  amount: number;
  currency?: string;
  due_date: string;
  is_recurring: boolean;
  frequency?: BillFrequency;
  reminder_days_before?: number;
  reminder_enabled?: boolean;
  category?: string;
  notes?: string;
  auto_pay?: boolean;
  payment_method?: string;
}

export interface UpdateBillRequest {
  payee_name?: string;
  description?: string;
  amount?: number;
  currency?: string;
  due_date?: string;
  status?: BillStatus;
  is_recurring?: boolean;
  frequency?: BillFrequency;
  reminder_days_before?: number;
  reminder_enabled?: boolean;
  category?: string;
  notes?: string;
  auto_pay?: boolean;
  payment_method?: string;
}

// Bills API methods
export const billsApi = {
  async list(accountId: string, params?: ListBillsParams): Promise<ListBillsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.is_recurring !== undefined) searchParams.set('is_recurring', params.is_recurring.toString());
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/bills${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch bills');
    }
    return response.json();
  },

  async get(accountId: string, id: string): Promise<Bill> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/bills/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch bill');
    }
    return response.json();
  },

  async create(accountId: string, data: CreateBillRequest): Promise<Bill> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/bills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create bill');
    }
    return response.json();
  },

  async update(accountId: string, id: string, data: UpdateBillRequest): Promise<Bill> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/bills/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update bill');
    }
    return response.json();
  },

  async delete(accountId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/bills/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete bill');
    }
  },

  async markAsPaid(accountId: string, id: string, paidDate?: string): Promise<Bill> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/bills/${id}/mark-paid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paid_date: paidDate || new Date().toISOString().split('T')[0] }),
    });
    if (!response.ok) {
      throw new Error('Failed to mark bill as paid');
    }
    return response.json();
  },

  async markAsUnpaid(accountId: string, id: string): Promise<Bill> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/bills/${id}/mark-unpaid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to mark bill as unpaid');
    }
    return response.json();
  },
};
