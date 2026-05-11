/**
 * Kira Pay API Client
 * Handles cross-chain payment integration
 */

export interface KiraPaymentLinkParams {
  amount: number;
  currency: 'USDC' | 'USDT' | 'PUSD';
  description: string;
  email?: string;
  redirectUrl?: string;
  metadata?: Record<string, any>;
}

export interface KiraPaymentLink {
  code: string;
  url: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface KiraWebhookParams {
  url: string;
  events: string[];
}

export interface KiraTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  transactionHash?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

class KiraPayClient {
  private apiKey: string;
  private baseUrl = 'https://api.kira-pay.com/v1';

  constructor(apiKey: string = process.env.KIRA_PAY_API_KEY || '') {
    if (!apiKey) {
      console.warn('[v0] Kira Pay API key not configured');
    }
    this.apiKey = apiKey;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: Record<string, any>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`Kira Pay API error: ${response.statusText}`);
      }

      return await response.json() as T;
    } catch (error) {
      console.error('[v0] Kira Pay request failed:', error);
      throw error;
    }
  }

  /**
   * Create a payment link for cross-chain deposits
   * The payment link allows users to fund from any supported chain
   */
  async createPaymentLink(params: KiraPaymentLinkParams): Promise<KiraPaymentLink> {
    const payload = {
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      email: params.email,
      redirectUrl: params.redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/funding-success`,
      metadata: {
        ...params.metadata,
        source: 'backed-app',
        timestamp: new Date().toISOString(),
      },
    };

    const response = await this.request<any>(
      'POST',
      '/links',
      payload
    );

    return {
      code: response.code,
      url: response.url,
      amount: response.amount,
      currency: response.currency,
      status: response.status,
      createdAt: response.createdAt,
    };
  }

  /**
   * Get all payment links (with optional filters)
   */
  async getPaymentLinks(): Promise<KiraPaymentLink[]> {
    const response = await this.request<any[]>(
      'GET',
      '/links'
    );

    return response.map((link: any) => ({
      code: link.code,
      url: link.url,
      amount: link.amount,
      currency: link.currency,
      status: link.status,
      createdAt: link.createdAt,
    }));
  }

  /**
   * Get payment link by code
   */
  async getPaymentLinkByCode(code: string): Promise<KiraPaymentLink> {
    const response = await this.request<any>(
      'GET',
      `/links/${code}`
    );

    return {
      code: response.code,
      url: response.url,
      amount: response.amount,
      currency: response.currency,
      status: response.status,
      createdAt: response.createdAt,
    };
  }

  /**
   * Create or update a webhook for payment notifications
   * The off-chain backend will use this to listen for payment confirmations
   */
  async createOrUpdateWebhook(params: KiraWebhookParams): Promise<{ id: string; url: string }> {
    const payload = {
      url: params.url,
      events: params.events,
      active: true,
    };

    const response = await this.request<any>(
      'POST',
      '/webhooks',
      payload
    );

    return {
      id: response.id,
      url: response.url,
    };
  }

  /**
   * Get webhook configuration
   */
  async getWebhook(): Promise<{ id: string; url: string; events: string[] }> {
    const response = await this.request<any>(
      'GET',
      '/webhooks'
    );

    return {
      id: response.id,
      url: response.url,
      events: response.events,
    };
  }

  /**
   * Get wallet transactions
   * Used to verify payments and track transaction history
   */
  async getWalletTransactions(): Promise<KiraTransaction[]> {
    const response = await this.request<any[]>(
      'GET',
      '/transactions'
    );

    return response.map((tx: any) => ({
      id: tx.id,
      amount: tx.amount,
      currency: tx.currency,
      status: tx.status,
      transactionHash: tx.transactionHash,
      timestamp: tx.timestamp,
      metadata: tx.metadata,
    }));
  }
}

// Export singleton instance
export const kiraPayClient = new KiraPayClient();
