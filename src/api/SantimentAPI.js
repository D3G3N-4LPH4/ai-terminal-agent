// API_CONFIG should be imported or defined in consuming code
const getAPIConfig = () => {
  if (typeof window !== 'undefined' && window.API_CONFIG) {
    return window.API_CONFIG;
  }
  // Fallback for server-side usage
  return {
    santiment: {
      baseUrl: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001'
    }
  };
};

class SantimentAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    const apiConfig = getAPIConfig();
    this.baseUrl = apiConfig.santiment.baseUrl;
  }

  async makeRequest(query, variables = {}) {
    if (!this.apiKey) {
      throw new Error("Santiment API key not configured");
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Apikey ${this.apiKey}`,
        },
        body: JSON.stringify({
          query: query,
          variables: variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`Santiment API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      return data.data;
    } catch (error) {
      console.error("Santiment API error:", error);
      throw error;
    }
  }

  // Get social volume and sentiment for a cryptocurrency
  async getSocialMetrics(slug, days = 7) {
    const fromDate = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    ).toISOString();
    const toDate = new Date().toISOString();

    const query = `
      query($slug: String!, $from: DateTime!, $to: DateTime!) {
        getMetric(metric: "social_volume_total") {
          timeseriesData(
            slug: $slug
            from: $from
            to: $to
            interval: "1d"
          ) {
            datetime
            value
          }
        }
      }
    `;

    return await this.makeRequest(query, { slug, from: fromDate, to: toDate });
  }

  // Get development activity metrics
  async getDevActivity(slug, days = 30) {
    const fromDate = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    ).toISOString();
    const toDate = new Date().toISOString();

    const query = `
      query($slug: String!, $from: DateTime!, $to: DateTime!) {
        getMetric(metric: "dev_activity") {
          timeseriesData(
            slug: $slug
            from: $from
            to: $to
            interval: "1d"
          ) {
            datetime
            value
          }
        }
      }
    `;

    return await this.makeRequest(query, { slug, from: fromDate, to: toDate });
  }

  // Get MVRV (Market Value to Realized Value) ratio
  async getMVRV(slug, days = 30) {
    const fromDate = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    ).toISOString();
    const toDate = new Date().toISOString();

    const query = `
      query($slug: String!, $from: DateTime!, $to: DateTime!) {
        getMetric(metric: "mvrv_usd") {
          timeseriesData(
            slug: $slug
            from: $from
            to: $to
            interval: "1d"
          ) {
            datetime
            value
          }
        }
      }
    `;

    return await this.makeRequest(query, { slug, from: fromDate, to: toDate });
  }

  // Get daily active addresses
  async getActiveAddresses(slug, days = 30) {
    const fromDate = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    ).toISOString();
    const toDate = new Date().toISOString();

    const query = `
      query($slug: String!, $from: DateTime!, $to: DateTime!) {
        getMetric(metric: "daily_active_addresses") {
          timeseriesData(
            slug: $slug
            from: $from
            to: $to
            interval: "1d"
          ) {
            datetime
            value
          }
        }
      }
    `;

    return await this.makeRequest(query, { slug, from: fromDate, to: toDate });
  }

  // Get enriched analysis combining multiple metrics
  async getEnrichedAnalysis(slug) {
    const query = `
      query($slug: String!) {
        social: getMetric(metric: "social_volume_total") {
          aggregatedTimeseriesData(
            slug: $slug
            from: "utc_now-7d"
            to: "utc_now"
            aggregation: SUM
          )
        }
        dev: getMetric(metric: "dev_activity") {
          aggregatedTimeseriesData(
            slug: $slug
            from: "utc_now-30d"
            to: "utc_now"
            aggregation: AVG
          )
        }
        addresses: getMetric(metric: "daily_active_addresses") {
          aggregatedTimeseriesData(
            slug: $slug
            from: "utc_now-7d"
            to: "utc_now"
            aggregation: AVG
          )
        }
      }
    `;

    try {
      const result = await this.makeRequest(query, { slug });

      // MVRV requires paid tier for historical data, so we return without it
      return {
        social: result?.data?.social || 0,
        dev: result?.data?.dev || 0,
        mvrv: 0, // MVRV not available on free tier
        addresses: result?.data?.addresses || 0,
      };
    } catch (error) {
      // If error mentions subscription limits, return partial data
      if (error.message.includes("subscription")) {
        console.warn("Santiment free tier limitation, returning partial data");
        return {
          social: 0,
          dev: 0,
          mvrv: 0,
          addresses: 0,
        };
      }
      throw error;
    }
  }
}

export { SantimentAPI };
export default SantimentAPI;
