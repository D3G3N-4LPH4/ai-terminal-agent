// ==================== ADVANCED VISUALIZATION DASHBOARD ====================
// Interactive dashboard with real-time charts and market insights

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { X, RefreshCw, TrendingUp, DollarSign, Activity, AlertCircle } from 'lucide-react';

/**
 * Dashboard Component
 * Displays real-time market data with interactive charts
 */
const Dashboard = ({
  isVisible,
  onClose,
  theme,
  coinGeckoAPI,
  sentimentAnalyzer,
  multiSourceSentiment,
  symbol = 'BTC',
  coinId = 'bitcoin',
}) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, sentiment, comparison
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch data in parallel
      const [priceData, marketData, sentimentData] = await Promise.allSettled([
        coinGeckoAPI.getMarketChart(coinId, 30),
        coinGeckoAPI.getCoinData(coinId),
        multiSourceSentiment ? multiSourceSentiment.aggregateSentiment(symbol, coinId) : null,
      ]);

      const data = {
        price: priceData.status === 'fulfilled' ? priceData.value : null,
        market: marketData.status === 'fulfilled' ? marketData.value : null,
        sentiment: sentimentData.status === 'fulfilled' ? sentimentData.value : null,
      };

      setDashboardData(data);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [coinGeckoAPI, multiSourceSentiment, symbol, coinId]);

  // Initial fetch and setup auto-refresh
  useEffect(() => {
    if (isVisible) {
      fetchDashboardData();

      // Auto-refresh every 60 seconds
      const interval = setInterval(fetchDashboardData, 60000);
      setRefreshInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [isVisible, fetchDashboardData]);

  if (!isVisible) return null;

  // Prepare chart data
  const prepareChartData = () => {
    if (!dashboardData?.price) return null;

    const { prices, total_volumes, market_caps } = dashboardData.price;

    return prices.map((price, i) => ({
      timestamp: new Date(price[0]).toLocaleDateString(),
      price: price[1],
      volume: total_volumes?.[i]?.[1] || 0,
      marketCap: market_caps?.[i]?.[1] || 0,
    }));
  };

  const chartData = prepareChartData();

  // Sentiment breakdown for pie chart
  const prepareSentimentPieData = () => {
    if (!dashboardData?.sentiment?.sources) return null;

    const sources = dashboardData.sentiment.sources;
    return [
      { name: 'Price', value: sources.price?.score || 50, available: sources.price?.available },
      { name: 'Social', value: sources.social?.score || 50, available: sources.social?.available },
      { name: 'On-Chain', value: sources.onchain?.score || 50, available: sources.onchain?.available },
      { name: 'News', value: sources.news?.score || 50, available: sources.news?.available },
      { name: 'Market', value: sources.market?.score || 50, available: sources.market?.available },
    ].filter(item => item.available);
  };

  const sentimentPieData = prepareSentimentPieData();

  // Sentiment radar chart
  const prepareSentimentRadarData = () => {
    if (!dashboardData?.sentiment?.sources) return null;

    const sources = dashboardData.sentiment.sources;
    return [
      { metric: 'Price', score: sources.price?.score || 0 },
      { metric: 'Social', score: sources.social?.score || 0 },
      { metric: 'On-Chain', score: sources.onchain?.score || 0 },
      { metric: 'News', score: sources.news?.score || 0 },
      { metric: 'Market', score: sources.market?.score || 0 },
    ];
  };

  const sentimentRadarData = prepareSentimentRadarData();

  const COLORS = ['#00ff88', '#88ff00', '#ffaa00', '#ff6600', '#ff0066'];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0a0a0a',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
        overflowY: 'auto',
        color: '#ffffff',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: `2px solid ${theme.accent}`,
          paddingBottom: '10px',
        }}
      >
        <h1 style={{ color: theme.primary, fontSize: '24px', margin: 0 }}>
          ᚱ {symbol} Dashboard
        </h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            style={{
              background: theme.accent,
              border: 'none',
              color: '#000',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '14px',
            }}
          >
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: `1px solid ${theme.accent}`,
              color: theme.accent,
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '14px',
            }}
          >
            <X size={16} />
            Close
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          borderBottom: `1px solid ${theme.secondary}`,
        }}
      >
        {['overview', 'sentiment', 'technical'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? theme.accent : 'transparent',
              border: 'none',
              color: activeTab === tab ? '#000' : theme.primary,
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              textTransform: 'uppercase',
              borderBottom: activeTab === tab ? `2px solid ${theme.accent}` : 'none',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && !dashboardData && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          color: theme.primary
        }}>
          <div style={{ textAlign: 'center' }}>
            <RefreshCw size={48} style={{ animation: 'spin 1s linear infinite', marginBottom: '10px' }} />
            <p>Loading dashboard data...</p>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && dashboardData && (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Key Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <MetricCard
                  icon={<DollarSign size={24} />}
                  title="Current Price"
                  value={`$${dashboardData.market?.market_data?.current_price?.usd?.toLocaleString() || 'N/A'}`}
                  change={dashboardData.market?.market_data?.price_change_percentage_24h}
                  theme={theme}
                />
                <MetricCard
                  icon={<TrendingUp size={24} />}
                  title="Market Cap"
                  value={`$${(dashboardData.market?.market_data?.market_cap?.usd / 1e9).toFixed(2) || 'N/A'}B`}
                  change={dashboardData.market?.market_data?.market_cap_change_percentage_24h}
                  theme={theme}
                />
                <MetricCard
                  icon={<Activity size={24} />}
                  title="24h Volume"
                  value={`$${(dashboardData.market?.market_data?.total_volume?.usd / 1e9).toFixed(2) || 'N/A'}B`}
                  theme={theme}
                />
                <MetricCard
                  icon={<AlertCircle size={24} />}
                  title="Sentiment"
                  value={dashboardData.sentiment?.aggregate?.label || 'N/A'}
                  score={dashboardData.sentiment?.aggregate?.score}
                  theme={theme}
                />
              </div>

              {/* Price Chart */}
              <div style={{
                backgroundColor: '#1a1a1a',
                padding: '20px',
                borderRadius: '8px',
                border: `1px solid ${theme.accent}`
              }}>
                <h3 style={{ color: theme.primary, marginBottom: '15px', fontSize: '18px' }}>
                  Price History (30 Days)
                </h3>
                {chartData && (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={theme.accent} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={theme.accent} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                      <XAxis dataKey="timestamp" stroke="#ffffff" tick={{ fontSize: 12, fill: '#ffffff' }} />
                      <YAxis stroke="#ffffff" tick={{ fontSize: 12, fill: '#ffffff' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: `2px solid ${theme.accent}`,
                          borderRadius: '4px',
                          color: '#ffffff'
                        }}
                        labelStyle={{ color: '#ffffff' }}
                        itemStyle={{ color: theme.accent }}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke={theme.accent}
                        fillOpacity={1}
                        fill="url(#colorPrice)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Volume Chart */}
              <div style={{
                backgroundColor: '#1a1a1a',
                padding: '20px',
                borderRadius: '8px',
                border: `1px solid ${theme.accent}`
              }}>
                <h3 style={{ color: theme.primary, marginBottom: '15px', fontSize: '18px' }}>
                  Volume (30 Days)
                </h3>
                {chartData && (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                      <XAxis dataKey="timestamp" stroke="#ffffff" tick={{ fontSize: 12, fill: '#ffffff' }} />
                      <YAxis stroke="#ffffff" tick={{ fontSize: 12, fill: '#ffffff' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: `2px solid ${theme.accent}`,
                          borderRadius: '4px',
                          color: '#ffffff'
                        }}
                        labelStyle={{ color: '#ffffff' }}
                        itemStyle={{ color: theme.accent }}
                      />
                      <Bar dataKey="volume" fill={theme.accent} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

          {/* Sentiment Tab */}
          {activeTab === 'sentiment' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Aggregate Sentiment */}
              <div style={{
                backgroundColor: '#1a1a1a',
                padding: '20px',
                borderRadius: '8px',
                border: `2px solid ${theme.accent}`,
                textAlign: 'center'
              }}>
                <h2 style={{ color: theme.primary, marginBottom: '10px' }}>
                  Overall Sentiment
                </h2>
                <div style={{ fontSize: '48px', margin: '20px 0' }}>
                  {dashboardData.sentiment?.aggregate?.score || 50}/100
                </div>
                <div style={{ fontSize: '24px', color: theme.accent, marginBottom: '10px' }}>
                  {dashboardData.sentiment?.aggregate?.label || 'NEUTRAL'}
                </div>
                <div style={{ color: theme.secondary }}>
                  Confidence: {dashboardData.sentiment?.aggregate?.confidence || 0}%
                </div>
              </div>

              {/* Sentiment Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Pie Chart */}
                <div style={{
                  backgroundColor: '#1a1a1a',
                  padding: '20px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.secondary}`
                }}>
                  <h3 style={{ color: theme.primary, marginBottom: '15px', fontSize: '18px' }}>
                    Sentiment Sources
                  </h3>
                  {sentimentPieData && (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={sentimentPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {sentimentPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Radar Chart */}
                <div style={{
                  backgroundColor: '#1a1a1a',
                  padding: '20px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.secondary}`
                }}>
                  <h3 style={{ color: theme.primary, marginBottom: '15px', fontSize: '18px' }}>
                    Sentiment Radar
                  </h3>
                  {sentimentRadarData && (
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={sentimentRadarData}>
                        <PolarGrid stroke="#555555" />
                        <PolarAngleAxis dataKey="metric" stroke="#ffffff" tick={{ fill: '#ffffff' }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#ffffff" tick={{ fill: '#ffffff' }} />
                        <Radar
                          name="Sentiment"
                          dataKey="score"
                          stroke={theme.accent}
                          fill={theme.accent}
                          fillOpacity={0.6}
                        />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Source Details */}
              <div style={{
                backgroundColor: '#1a1a1a',
                padding: '20px',
                borderRadius: '8px',
                border: `1px solid ${theme.secondary}`
              }}>
                <h3 style={{ color: theme.primary, marginBottom: '15px', fontSize: '18px' }}>
                  Source Breakdown
                </h3>
                {dashboardData.sentiment?.sources && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(dashboardData.sentiment.sources).map(([source, data]) => (
                      data.available && (
                        <div key={source} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '10px',
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                          borderRadius: '4px'
                        }}>
                          <span style={{ color: theme.primary, textTransform: 'uppercase' }}>
                            {source}
                          </span>
                          <span style={{ color: theme.accent }}>
                            {data.label} ({data.score}/100)
                          </span>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Technical Tab */}
          {activeTab === 'technical' && (
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              padding: '20px',
              borderRadius: '8px',
              border: `1px solid ${theme.secondary}`,
              color: theme.primary
            }}>
              <h3 style={{ marginBottom: '15px', fontSize: '18px' }}>
                Technical Indicators
              </h3>
              {chartData && (
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                    <XAxis dataKey="timestamp" stroke="#ffffff" tick={{ fontSize: 12, fill: '#ffffff' }} />
                    <YAxis yAxisId="left" stroke="#ffffff" tick={{ fontSize: 12, fill: '#ffffff' }} />
                    <YAxis yAxisId="right" orientation="right" stroke={theme.accent} tick={{ fontSize: 12, fill: '#ffffff' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: `2px solid ${theme.accent}`,
                        borderRadius: '4px',
                        color: '#ffffff'
                      }}
                      labelStyle={{ color: '#ffffff' }}
                      itemStyle={{ color: theme.accent }}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="price"
                      fill={theme.accent}
                      stroke={theme.accent}
                      fillOpacity={0.3}
                    />
                    <Bar yAxisId="right" dataKey="volume" fill={theme.secondary} opacity={0.5} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ icon, title, value, change, score, theme }) => {
  const changeColor = change > 0 ? '#00ff88' : change < 0 ? '#ff0066' : theme.secondary;

  return (
    <div style={{
      backgroundColor: '#1a1a1a',
      padding: '20px',
      borderRadius: '8px',
      border: `2px solid ${theme.accent}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: theme.accent }}>
        {icon}
        <span style={{ fontSize: '14px', color: '#cccccc' }}>{title}</span>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff' }}>
        {value}
      </div>
      {change !== undefined && (
        <div style={{ fontSize: '14px', color: changeColor }}>
          {change > 0 ? '▲' : change < 0 ? '▼' : '='} {Math.abs(change).toFixed(2)}%
        </div>
      )}
      {score !== undefined && (
        <div style={{
          width: '100%',
          height: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${score}%`,
            height: '100%',
            backgroundColor: theme.accent,
            transition: 'width 0.3s ease'
          }} />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
