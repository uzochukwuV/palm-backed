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
  private baseUrl = 'https://api.kira-pay.com';

  constructor(apiKey: string = process.env.KIRA_PAY_API_KEY || '') {
    if (!apiKey) {
      console.warn('⚠️  Kira Pay API key not configured - cross-chain payments will not work');
    }
    this.apiKey = apiKey;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: Record<string, any>
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Kira Pay API key is not configured. Please set KIRA_PAY_API_KEY in your environment variables.');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'x-api-key': this.apiKey, // KiraPay uses x-api-key header
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
      console.log(`🔵 KiraPay API Request: ${method} ${url}`);
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ KiraPay API error (${response.status}):`, errorText);
        throw new Error(`Kira Pay API error (${response.status}): ${errorText}`);
      }

      const result = await response.json() as T;
      console.log('✅ KiraPay API Response:', result);
      return result;
    } catch (error) {
      console.error('❌ Kira Pay request failed:', error);
      throw error;
    }
  }

  /**
   * Create a payment link for cross-chain deposits
   * The payment link allows users to fund from any supported chain
   * API Docs: POST /api/link/generate
   */
  async createPaymentLink(params: KiraPaymentLinkParams): Promise<KiraPaymentLink> {
    // KiraPay expects tokenOut (destination chain/token), receiver (destination wallet),
    // originalPrice (in fiat), and fiatCurrency
    
    // For testing, use a known valid Ethereum address format
    // KiraPay might not support Solana addresses directly
    const receiverAddress = params.metadata?.creatorWallet || '';
    
    // Convert Solana address to Ethereum format for KiraPay (this is a workaround)
    // In production, you'd need to use KiraPay's Solana support or bridge
    const ethAddress = '0x' + receiverAddress.slice(0, 40).padEnd(40, '0');
    
    const payload = {
      tokenOut: {
        chainId: "8453", // Base chain (example from docs)
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" // USDC on Base
      },
      receiver: ethAddress, // Use Ethereum-format address
      originalPrice: Math.floor(params.amount * 100), // Convert to cents/smallest unit
      fiatCurrency: "USD", // Base currency
      name: params.description,
      customOrderId: params.metadata?.projectId || '',
      redirectUrl: params.redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/funding-success`,
      type: "single_use",
      isViewAsCrypto: true, // Show crypto amounts
      metadata: {
        ...params.metadata,
        solanaWallet: receiverAddress, // Store real Solana address in metadata
        source: 'backed-app',
        timestamp: new Date().toISOString(),
      },
    };

    console.log('📤 Creating KiraPay payment link with payload:', payload);

    const response = await this.request<{
      message: string;
      code: number;
      data: {
        url: string;
        price: number;
        originalPrice: number;
      };
    }>(
      'POST',
      '/api/link/generate',
      payload
    );

    if (response.code !== 201 || !response.data) {
      throw new Error(`KiraPay API error: ${response.message || 'Unknown error'}`);
    }

    return {
      code: payload.customOrderId,
      url: response.data.url,
      amount: response.data.price,
      currency: 'USD',
      status: 'pending',
      createdAt: new Date().toISOString(),
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
