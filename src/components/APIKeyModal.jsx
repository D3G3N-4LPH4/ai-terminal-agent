import React, { useState } from "react";
import { Key, Info } from "lucide-react";

const APIKeyModal = React.memo(({ isOpen, onClose, theme, onSave }) => {
  // Access API_CONFIG from window (made global in AITerminalAgent.jsx)
  const API_CONFIG = typeof window !== 'undefined' ? window.API_CONFIG : {};

  const [duneKey, setDuneKey] = useState(API_CONFIG.dune?.apiKey || "");
  const [openRouterKey, setOpenRouterKey] = useState(
    API_CONFIG.openRouter?.apiKey || ""
  );
  const [scraperKey, setScraperKey] = useState(API_CONFIG.scraperAPI?.apiKey || "");
  const [heliusKey, setHeliusKey] = useState(API_CONFIG.helius?.apiKey || "");
  const [cmcKey, setCmcKey] = useState(API_CONFIG.coinMarketCap?.apiKey || "");
  const [santimentKey, setSantimentKey] = useState(API_CONFIG.santiment?.apiKey || "");
  const [coinGeckoKey, setCoinGeckoKey] = useState(API_CONFIG.coinGecko?.apiKey || "");
  const [parallelKey, setParallelKey] = useState(API_CONFIG.parallel?.apiKey || "");
  const [showKeys, setShowKeys] = useState(false);

  const handleSave = () => {
    localStorage.setItem("dune_api_key", duneKey);
    localStorage.setItem("openrouter_api_key", openRouterKey);
    localStorage.setItem("scraper_api_key", scraperKey);
    localStorage.setItem("helius_api_key", heliusKey);
    localStorage.setItem("coinmarketcap_api_key", cmcKey);
    localStorage.setItem("santiment_api_key", santimentKey);
    localStorage.setItem("coingecko_api_key", coinGeckoKey);
    localStorage.setItem("parallel_api_key", parallelKey);

    if (API_CONFIG.dune) API_CONFIG.dune.apiKey = duneKey;
    if (API_CONFIG.openRouter) API_CONFIG.openRouter.apiKey = openRouterKey;
    if (API_CONFIG.scraperAPI) API_CONFIG.scraperAPI.apiKey = scraperKey;
    if (API_CONFIG.helius) API_CONFIG.helius.apiKey = heliusKey;
    if (API_CONFIG.coinMarketCap) API_CONFIG.coinMarketCap.apiKey = cmcKey;
    if (API_CONFIG.santiment) API_CONFIG.santiment.apiKey = santimentKey;
    if (API_CONFIG.coinGecko) API_CONFIG.coinGecko.apiKey = coinGeckoKey;
    if (API_CONFIG.parallel) API_CONFIG.parallel.apiKey = parallelKey;

    // Notify parent to reinitialize API instances
    if (onSave) {
      onSave(duneKey, openRouterKey, scraperKey, heliusKey, cmcKey, santimentKey, coinGeckoKey, parallelKey);
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
              Dune Analytics API Key
            </label>
            <p className="text-gray-400 text-sm mb-2">
              Get your API key from{" "}
              <a
                href="https://dune.com/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                dune.com/settings/api
              </a>
            </p>
            <input
              type={showKeys ? "text" : "password"}
              value={duneKey}
              onChange={(e) => setDuneKey(e.target.value)}
              placeholder="Enter Dune API key"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

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
              Helius API Key (Solana)
            </label>
            <p className="text-gray-400 text-sm mb-2">
              Get your API key from{" "}
              <a
                href="https://dashboard.helius.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                dashboard.helius.dev
              </a>
            </p>
            <input
              type={showKeys ? "text" : "password"}
              value={heliusKey}
              onChange={(e) => setHeliusKey(e.target.value)}
              placeholder="Enter Helius API key"
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
                pro.coinmarketcap.com/account
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
              Santiment API Key (On-Chain Metrics)
            </label>
            <p className="text-gray-400 text-sm mb-2">
              Get your API key from{" "}
              <a
                href="https://app.santiment.net/account"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                app.santiment.net/account
              </a>
              {" "}(Enhances analyze command with social & on-chain data)
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
              CoinGecko API Key (Pro/Premium Tier)
            </label>
            <p className="text-gray-400 text-sm mb-2">
              Get your API key from{" "}
              <a
                href="https://www.coingecko.com/en/api/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                coingecko.com/api/pricing
              </a>
              {" "}(Optional - unlocks higher rate limits & premium endpoints)
            </p>
            <input
              type={showKeys ? "text" : "password"}
              value={coinGeckoKey}
              onChange={(e) => setCoinGeckoKey(e.target.value)}
              placeholder="Enter CoinGecko API key (optional)"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className={`${theme.text} block mb-2 font-semibold`}>
              Parallel AI API Key (Web Research)
            </label>
            <p className="text-gray-400 text-sm mb-2">
              Get your API key from{" "}
              <a
                href="https://platform.parallel.ai/home"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                platform.parallel.ai
              </a>
              {" "}(20,000 requests free - enables deep research, web search & extraction)
            </p>
            <input
              type={showKeys ? "text" : "password"}
              value={parallelKey}
              onChange={(e) => setParallelKey(e.target.value)}
              placeholder="Enter Parallel AI API key"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showKeys"
              checked={showKeys}
              onChange={(e) => setShowKeys(e.target.checked)}
              className="w-4 h-4"
            />
            <label
              htmlFor="showKeys"
              className="text-gray-300 text-sm cursor-pointer"
            >
              Show API keys
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              className={`flex-1 ${theme.bgAccent} text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all ${theme.glow}`}
            >
              Save API Keys
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
          </div>

          <div
            className={`${theme.glass} border ${theme.border} rounded-lg p-4`}
          >
            <div className="flex items-start gap-2">
              <Info size={20} className={theme.accent} />
              <div className="text-sm text-gray-300">
                <p className="font-semibold mb-1">
                  API keys are stored locally
                </p>
                <p>
                  Your API keys are stored in your browser's local storage and
                  never sent to any third-party servers except the respective
                  APIs (Dune and OpenRouter).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default APIKeyModal;
