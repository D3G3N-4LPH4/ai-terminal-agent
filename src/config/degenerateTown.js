/**
 * Degenerate Town Configuration
 *
 * Norse gods meet Solana DeFi - AI agents compete in a trading simulation
 * Each agent has unique personalities, strategies, and Q-Learning capabilities
 */

export const DEGENERATE_TOWN_CONFIG = {
  // Agent synchronization
  syncWithFenrir: true,
  realTimeUpdates: true,
  showLivePositions: true,

  // Visual settings
  visual: {
    width: 1200,
    height: 800,
    theme: 'norse-solana',
    enableParticles: true,
  },

  // Features
  features: {
    aiDecisions: true,
    agentChat: true,
    memorySystem: true,
    learningEnabled: true,
    tradingSync: true,
  },

  // Q-Learning parameters
  qlearning: {
    learningRate: 0.1,
    discountFactor: 0.95,
    explorationRate: 0.2,
    explorationDecay: 0.995,
    minExploration: 0.01,
  }
};

// Norse rune symbols for trading actions
export const NORSE_RUNES = {
  buy: 'ᚨ',      // Ansuz - divine breath, inspiration
  sell: 'ᛏ',     // Tiwaz - victory, sacrifice
  hold: 'ᛁ',     // Isa - ice, stillness
  profit: 'ᚠ',   // Fehu - wealth, cattle
  loss: 'ᚷ',     // Gebo - gift, exchange
  whale: 'ᚢ',    // Uruz - strength, wild ox
  moon: 'ᛋ',     // Sowilo - sun, success
  rug: 'ᚾ',      // Nauthiz - need, constraint
  pump: 'ᛈ',     // Perthro - luck, fate
  dump: 'ᛞ',     // Dagaz - day, breakthrough
};

// Realm types for the trading floor
export const REALM_TYPES = {
  VALHALLA: 'valhalla',   // Hall of the Slain - Top performers
  MIDGARD: 'midgard',     // Earth realm - Active trading
  BIFROST: 'bifrost',     // Rainbow bridge - Transitions
  HELHEIM: 'helheim',     // Realm of the dead - Losses
  ASGARD: 'asgard',       // Realm of gods - Leadership
};

// Norse god agent definitions
export const NORSE_AGENTS = [
  {
    id: 'odin_allfather',
    name: 'Odin the All-Seeing',
    title: 'God of Wisdom & Swing Trading',
    runeSymbol: 'ᚨ',
    avatar: '👁️',
    color: '#4A90D9',
    realm: REALM_TYPES.ASGARD,
    strategy: {
      type: 'swing_divine',
      description: 'Patient value investor, sees the bigger picture',
      positionSize: 0.15,
      holdTime: 'medium',
      riskTolerance: 0.4,
    },
    personality: {
      wisdom: 0.95,
      aggression: 0.3,
      patience: 0.9,
      greed: 0.4,
    },
    quotes: [
      "I sacrificed an eye for wisdom... I shall not sacrifice SOL for folly.",
      "The ravens bring news of a whale's movement.",
      "By my ravens Huginn and Muninn, this token shows promise.",
    ],
  },
  {
    id: 'thor_thunderous',
    name: 'Thor the Thunderous',
    title: 'God of Thunder & Scalping',
    runeSymbol: 'ᚦ',
    avatar: '⚡',
    color: '#FFD700',
    realm: REALM_TYPES.MIDGARD,
    strategy: {
      type: 'scalping_thunder',
      description: 'Aggressive momentum trader, strikes fast',
      positionSize: 0.25,
      holdTime: 'short',
      riskTolerance: 0.7,
    },
    personality: {
      wisdom: 0.5,
      aggression: 0.9,
      patience: 0.2,
      greed: 0.7,
    },
    quotes: [
      "MJOLNIR SMASH! *buys aggressively*",
      "By the thunder of Asgard, this pump shall be LEGENDARY!",
      "I need not think. I need only STRIKE!",
    ],
  },
  {
    id: 'loki_trickster',
    name: 'Loki the Trickster',
    title: 'God of Mischief & MEV',
    runeSymbol: 'ᛚ',
    avatar: '🎭',
    color: '#00FF88',
    realm: REALM_TYPES.BIFROST,
    strategy: {
      type: 'mev_trickery',
      description: 'Exploits arbitrage and sandwich opportunities',
      positionSize: 0.2,
      holdTime: 'instant',
      riskTolerance: 0.8,
    },
    personality: {
      wisdom: 0.7,
      aggression: 0.6,
      patience: 0.3,
      greed: 0.9,
    },
    quotes: [
      "While you wait for confirmations, I've already sandwiched your trade.",
      "Chaos is profit for those who embrace it.",
      "Trust? In DeFi? *laughs in front-run*",
    ],
  },
  {
    id: 'freyja_valiant',
    name: 'Freyja the Valiant',
    title: 'Goddess of Love & Yield Farming',
    runeSymbol: 'ᚠ',
    avatar: '💎',
    color: '#FF69B4',
    realm: REALM_TYPES.VALHALLA,
    strategy: {
      type: 'yield_goddess',
      description: 'Passive income maximizer, staking queen',
      positionSize: 0.3,
      holdTime: 'long',
      riskTolerance: 0.3,
    },
    personality: {
      wisdom: 0.8,
      aggression: 0.2,
      patience: 0.95,
      greed: 0.5,
    },
    quotes: [
      "The harvest shall come to those who wait.",
      "My cats Bygul and Trjegul purr at these yields.",
      "Beauty lies in compounding returns.",
    ],
  },
  {
    id: 'fenrir_unbound',
    name: 'Fenrir the Unbound',
    title: 'Wolf of Chaos & Degen Plays',
    runeSymbol: 'ᚹ',
    avatar: '🐺',
    color: '#8B0000',
    realm: REALM_TYPES.HELHEIM,
    strategy: {
      type: 'chaos_degen',
      description: 'Maximum risk, maximum reward degen',
      positionSize: 0.5,
      holdTime: 'yolo',
      riskTolerance: 0.95,
    },
    personality: {
      wisdom: 0.3,
      aggression: 0.95,
      patience: 0.1,
      greed: 0.95,
    },
    quotes: [
      "THE CHAINS ARE BROKEN! *apes into shitcoin*",
      "Ragnarök comes for your portfolio... EMBRACE IT!",
      "Risk management? I AM the risk.",
    ],
  },
  {
    id: 'heimdall_watchful',
    name: 'Heimdall the Watchful',
    title: 'Guardian of Bifrost & Risk Management',
    runeSymbol: 'ᚺ',
    avatar: '🔭',
    color: '#9400D3',
    realm: REALM_TYPES.BIFROST,
    strategy: {
      type: 'risk_guardian',
      description: 'Conservative protector, stops losses early',
      positionSize: 0.1,
      holdTime: 'careful',
      riskTolerance: 0.2,
    },
    personality: {
      wisdom: 0.85,
      aggression: 0.15,
      patience: 0.8,
      greed: 0.2,
    },
    quotes: [
      "I see all nine realms... and this chart looks bearish.",
      "The horn Gjallarhorn warns of incoming dump.",
      "Vigilance is the price of profit.",
    ],
  },
  {
    id: 'skadi_hunter',
    name: 'Skadi the Hunter',
    title: 'Goddess of Winter & Short Selling',
    runeSymbol: 'ᛊ',
    avatar: '🏹',
    color: '#87CEEB',
    realm: REALM_TYPES.HELHEIM,
    strategy: {
      type: 'winter_short',
      description: 'Bear market specialist, profits from dumps',
      positionSize: 0.2,
      holdTime: 'medium',
      riskTolerance: 0.6,
    },
    personality: {
      wisdom: 0.7,
      aggression: 0.5,
      patience: 0.7,
      greed: 0.6,
    },
    quotes: [
      "Winter is coming... for this token's price.",
      "The hunt begins. The bears shall feast.",
      "Cold calculations, colder profits.",
    ],
  },
];

// Market event types
export const MARKET_EVENTS = {
  WHALE_ALERT: { icon: '🐋', rune: NORSE_RUNES.whale, impact: 'high' },
  PUMP: { icon: '🚀', rune: NORSE_RUNES.pump, impact: 'high' },
  DUMP: { icon: '📉', rune: NORSE_RUNES.dump, impact: 'high' },
  RUGPULL: { icon: '🔴', rune: NORSE_RUNES.rug, impact: 'critical' },
  NEW_TOKEN: { icon: '✨', rune: NORSE_RUNES.buy, impact: 'medium' },
  LIQUIDITY_ADD: { icon: '💧', rune: NORSE_RUNES.profit, impact: 'medium' },
  LIQUIDITY_REMOVE: { icon: '🔥', rune: NORSE_RUNES.loss, impact: 'high' },
};

export default {
  DEGENERATE_TOWN_CONFIG,
  NORSE_RUNES,
  REALM_TYPES,
  NORSE_AGENTS,
  MARKET_EVENTS,
};
