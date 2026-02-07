/**
 * Command Hooks - Modular command handlers for AITerminalAgent
 *
 * These hooks extract command handling logic from the main component
 * to improve maintainability, testability, and code organization.
 *
 * Usage in AITerminalAgent.jsx:
 *
 * ```jsx
 * import {
 *   useMarketCommands,
 *   useDegenTownCommands,
 *   useSystemCommands,
 * } from './hooks';
 *
 * // In component:
 * const { handleCommand: handleMarketCommand } = useMarketCommands({
 *   addOutput,
 *   showToast,
 *   coinMarketCapAPI: coinMarketCapAPI.current,
 *   scraperAPI: scraperAPI.current,
 * });
 *
 * const { handleCommand: handleDegenCommand } = useDegenTownCommands({
 *   addOutput,
 *   showToast,
 *   showDegenTown,
 *   setShowDegenTown,
 * });
 *
 * const { handleCommand: handleSystemCommand } = useSystemCommands({
 *   addOutput,
 *   showToast,
 *   setShowAPIKeyModal,
 *   setOutput,
 *   API_CONFIG,
 *   currentAIModel,
 *   setCurrentAIModel,
 * });
 *
 * // In command processing:
 * if (await handleMarketCommand(command, args)) return;
 * if (await handleDegenCommand(command, args)) return;
 * if (handleSystemCommand(command, args)) return;
 * ```
 *
 * Each hook returns a `handleCommand` function that returns:
 * - true: if the command was handled
 * - false: if the command was not recognized
 */

// Context and utilities
export { default as useCommandContext, OutputType, createOutput, CommandResult } from './useCommandContext';

// Command hooks
export { default as useMarketCommands } from './useMarketCommands';
export { default as useDegenTownCommands } from './useDegenTownCommands';
export { default as useSystemCommands } from './useSystemCommands';
export { default as useMLCommands } from './useMLCommands';
export { default as useAICommands } from './useAICommands';
export { default as useCMCCommands } from './useCMCCommands';
export { default as useTradingCommands } from './useTradingCommands';
export { default as useMemoryCommands } from './useMemoryCommands';
export { default as useSkillCommands } from './useSkillCommands';

/**
 * Future hooks to be extracted:
 *
 * - useResearchCommands - research, websearch-ai, scrape, google, docs
 * - useAlertCommands - alert price, alert pattern, etc.
 * - useWalletCommands - web3, wallet
 * - useScoutCommands - scout discover, scout evaluate, etc.
 * - useRLoopCommands - rloop start, rloop stop, etc.
 * - useTelegramCommands - telegram start, telegram stop, etc.
 */
