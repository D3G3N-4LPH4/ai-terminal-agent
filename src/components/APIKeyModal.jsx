import React, { useState } from "react";
import { Key, Info } from "lucide-react";

const APIKeyModal = React.memo(({ isOpen, onClose, theme, onSave }) => {
  // Access API_CONFIG from window (made global in AITerminalAgent.jsx)
  const API_CONFIG = typeof window !== 'undefined' ? window.API_CONFIG : {};

  const [openRouterKey, setOpenRouterKey] = useState(
    API_CONFIG.openRouter?.apiKey || ""
  );
  const [scraperKey, setScraperKey] = useState(API_CONFIG.scraperAPI?.apiKey || "");
  const [cmcKey, setCmcKey] = useState(API_CONFIG.coinMarketCap?.apiKey || "");
  const [santimentKey, setSantimentKey] = useState(API_CONFIG.santiment?.apiKey || "");
  const [coinGeckoKey, setCoinGeckoKey] = useState(API_CONFIG.coinGecko?.apiKey || "");
  const [parallelKey, setParallelKey] = useState(API_CONFIG.parallel?.apiKey || "");
  const [showKeys, setShowKeys] = useState(false);

  const handleSave = () => {
    localStorage.setItem("openrouter_api_key", openRouterKey);
    localStorage.setItem("scraper_api_key", scraperKey);
    localStorage.setItem("coinmarketcap_api_key", cmcKey);
    localStorage.setItem("santiment_api_key", santimentKey);
    localStorage.setItem("coingecko_api_key", coinGeckoKey);
    localStorage.setItem("parallel_api_key", parallelKey);

    if (API_CONFIG.openRouter) API_CONFIG.openRouter.apiKey = openRouterKey;
    if (API_CONFIG.scraperAPI) API_CONFIG.scraperAPI.apiKey = scraperKey;
    if (API_CONFIG.coinMarketCap) API_CONFIG.coinMarketCap.apiKey = cmcKey;
    if (API_CONFIG.santiment) API_CONFIG.santiment.apiKey = santimentKey;
    if (API_CONFIG.coinGecko) API_CONFIG.coinGecko.apiKey = coinGeckoKey;
    if (API_CONFIG.parallel) API_CONFIG.parallel.apiKey = parallelKey;

    // Notify parent to reinitialize API instances
    if (onSave) {
      onSave(openRouterKey, scraperKey, cmcKey, santimentKey, coinGeckoKey, parallelKey);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className={`bg-black/90 border-2 ${theme.border} rounded-2xl p-6 sm:p-8 max-w-2xl w-full ${theme.glow} backdrop-blur-xl my-4 max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Key className={theme.accent} size={24} />
            <h2 className={`${theme.text} text-xl sm:text-2xl font-bold`}>
              API Keys Configuration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 sm:space-y-6 overflow-y-auto flex-1 pr-2">
          <div>
            <label className={`${theme.text} block mb-2 font-semibold`}>
              OpenRouter API Key
            </label>
            <p className="text-gray-400 text-sm mb-2">
              Get your API key from{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                openrouter.ai/keys
              </a>
            </p>
            <input
              type={showKeys ? "text" : "password"}
              value={openRouterKey}
              onChange={(e) => setOpenRouterKey(e.target.value)}
              placeholder="Enter OpenRouter API key"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className={`${theme.text} block mb-2 font-semibold`}>
              ScraperAPI Key
            </label>
            <p className="text-gray-400 text-sm mb-2">
              Get your API key from{" "}
              <a
                href="https://www.scraperapi.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                scraperapi.com
              </a>
            </p>
            <input
              type={showKeys ? "text" : "password"}
              value={scraperKey}
              onChange={(e) => setScraperKey(e.target.value)}
              placeholder="Enter ScraperAPI key"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className={`${theme.text} block mb-2 font-semibold`}>
              CoinMarketCap API Key
            </label>
            <p className="text-gray-400 text-sm mb-2">
              Get your API key from{" "}
              <a
                href="https://pro.coinmarketcap.com/account"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                pro.coinmarketcap.com
              </a>
            </p>
            <input
              type={showKeys ? "text" : "password"}
              value={cmcKey}
              onChange={(e) => setCmcKey(e.target.value)}
              placeholder="Enter CoinMarketCap API key"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className={`${theme.text} block mb-2 font-semibold`}>
              Santiment API Key
            </label>
            <p className="text-gray-400 text-sm mb-2">
              Get your API key from{" "}
              <a
                href="https://app.santiment.net/account"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                santiment.net
              </a>
            </p>
            <input
              type={showKeys ? "text" : "password"}
              value={santimentKey}
              onChange={(e) => setSantimentKey(e.target.value)}
              placeholder="Enter Santiment API key"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className={`${theme.text} block mb-2 font-semibold`}>
              CoinGecko Pro API Key (Optional)
            </label>
            <p className="text-gray-400 text-sm mb-2">
              Free tier works without key. For Pro features:{" "}
              <a
                href="https://www.coingecko.com/en/api/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                coingecko.com/api
              </a>
            </p>
            <input
              type={showKeys ? "text" : "password"}
              value={coinGeckoKey}
              onChange={(e) => setCoinGeckoKey(e.target.value)}
              placeholder="Enter CoinGecko Pro API key (optional)"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className={`${theme.text} block mb-2 font-semibold`}>
              Parallel AI API Key
            </label>
            <p className="text-gray-400 text-sm mb-2">
              Get your API key from{" "}
              <a
                href="https://platform.parallel.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                parallel.ai
              </a>
            </p>
            <input
              type={showKeys ? "text" : "password"}
              value={parallelKey}
              onChange={(e) => setParallelKey(e.target.value)}
              placeholder="Enter Parallel AI API key"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2 flex-shrink-0">
            <input
              type="checkbox"
              id="showKeys"
              checked={showKeys}
              onChange={(e) => setShowKeys(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="showKeys" className="text-gray-400 text-sm">
              Show API keys
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6 flex-shrink-0">
          <button
            onClick={handleSave}
            className={`flex-1 ${theme.bg} ${theme.border} ${theme.text} px-6 py-3 rounded-lg font-semibold hover:${theme.accent} ${theme.shadow} transition-all`}
          >
            Save Keys
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-800 text-gray-300 px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-all"
          >
            Cancel
          </button>
        </div>

        <div className={`${theme.text} text-xs opacity-75 mt-4 flex items-start gap-2 flex-shrink-0`}>
          <Info size={16} className="mt-0.5 flex-shrink-0" />
          <span>
            API keys are stored locally in your browser. They are never sent to any server except the respective API endpoints.
          </span>
        </div>
      </div>
    </div>
  );
});

export default APIKeyModal;
