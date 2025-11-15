// API_CONFIG should be imported or defined in consuming code
const getAPIConfig = () => {
  if (typeof window !== 'undefined' && window.API_CONFIG) {
    return window.API_CONFIG;
  }
  // Fallback for server-side usage
  return {
    helius: {
      baseUrl: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001',
      rpcUrl: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001'
    }
  };
};

class HeliusAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    const apiConfig = getAPIConfig();
    this.baseUrl = apiConfig.helius.baseUrl;
    this.rpcUrl = apiConfig.helius.rpcUrl;
  }

  async callRPC(method, params = []) {
    if (!this.apiKey) {
      throw new Error(
        "Helius API key not configured. Use 'apikeys' command to set it up."
      );
    }

    try {
      const response = await fetch(`${this.rpcUrl}/?api-key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: method,
          params: params,
        }),
      });

      if (!response.ok) {
        throw new Error(`Helius RPC error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`RPC Error: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      console.error("Helius RPC error:", error);
      throw error;
    }
  }

  async getBalance(address) {
    try {
      const balance = await this.callRPC("getBalance", [address]);
      return balance.value / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error("Get balance error:", error);
      throw error;
    }
  }

  async getTokenAccounts(address) {
    try {
      const response = await this.callRPC("getTokenAccountsByOwner", [
        address,
        { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { encoding: "jsonParsed" },
      ]);
      return response.value;
    } catch (error) {
      console.error("Get token accounts error:", error);
      throw error;
    }
  }

  async getNFTs(address) {
    if (!this.apiKey) {
      throw new Error(
        "Helius API key not configured. Use 'apikeys' command to set it up."
      );
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/addresses/${address}/nfts?api-key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Helius API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Get NFTs error:", error);
      throw error;
    }
  }

  async getTransactionHistory(address, limit = 10) {
    if (!this.apiKey) {
      throw new Error(
        "Helius API key not configured. Use 'apikeys' command to set it up."
      );
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/addresses/${address}/transactions?api-key=${this.apiKey}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`Helius API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Get transaction history error:", error);
      throw error;
    }
  }

  async parseTransaction(signature) {
    if (!this.apiKey) {
      throw new Error(
        "Helius API key not configured. Use 'apikeys' command to set it up."
      );
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/transactions?api-key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transactions: [signature],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Helius API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data[0];
    } catch (error) {
      console.error("Parse transaction error:", error);
      throw error;
    }
  }

  async getAssetsByOwner(address, page = 1, limit = 10) {
    if (!this.apiKey) {
      throw new Error(
        "Helius API key not configured. Use 'apikeys' command to set it up."
      );
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/addresses/${address}/balances?api-key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Helius API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Get assets error:", error);
      throw error;
    }
  }

  async getWebhooks() {
    if (!this.apiKey) {
      throw new Error(
        "Helius API key not configured. Use 'apikeys' command to set it up."
      );
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/webhooks?api-key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Helius API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Get webhooks error:", error);
      throw error;
    }
  }
}

export { HeliusAPI };
export default HeliusAPI;
