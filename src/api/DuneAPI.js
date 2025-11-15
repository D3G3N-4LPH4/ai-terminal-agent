// Dune Analytics API Client

export class DuneAPI {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async executeQuery(queryId, parameters = {}) {
    if (!this.apiKey) {
      throw new Error(
        "Dune API key not configured. Use 'apikeys' command to set it up."
      );
    }

    try {
      const response = await fetch(`${this.baseUrl}/query/${queryId}/execute`, {
        method: "POST",
        headers: {
          "X-Dune-API-Key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query_parameters: parameters }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Dune API error: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.execution_id;
    } catch (error) {
      // Only log actual errors, not configuration issues
      if (!error.message.includes("not configured")) {
        console.error("Dune execute error:", error);
      }
      throw error;
    }
  }

  async getExecutionStatus(executionId) {
    try {
      const response = await fetch(
        `${this.baseUrl}/execution/${executionId}/status`,
        {
          headers: {
            "X-Dune-API-Key": this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Dune API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Dune status error:", error);
      throw error;
    }
  }

  async getExecutionResults(executionId) {
    try {
      const response = await fetch(
        `${this.baseUrl}/execution/${executionId}/results`,
        {
          headers: {
            "X-Dune-API-Key": this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Dune API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Dune results error:", error);
      throw error;
    }
  }

  async queryAndWait(queryId, parameters = {}, maxWaitTime = 30000) {
    const executionId = await this.executeQuery(queryId, parameters);
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getExecutionStatus(executionId);

      if (status.state === "QUERY_STATE_COMPLETED") {
        return await this.getExecutionResults(executionId);
      } else if (status.state === "QUERY_STATE_FAILED") {
        throw new Error("Query execution failed");
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error("Query execution timeout");
  }
}

export default DuneAPI;
