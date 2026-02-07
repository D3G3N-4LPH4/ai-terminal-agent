/**
 * useAICommands - AI conversation and analysis command handlers
 *
 * Handles commands:
 * - talk [message] - Conversational AI with memory
 * - ask [question] - Data-driven AI queries (stateless)
 * - analyze [symbol] - Deep market analysis
 * - forget - Clear conversation memory
 */

import { useCallback } from 'react';
import { getCoinIdOrError } from '../utils/coinValidation';
import { handleCommandError } from '../utils/errorHandler';
import { getLoadingMessage, OperationType } from '../utils/loadingMessages';
import memoryService from '../services/MemoryService.js';
import skillService from '../services/SkillService.js';

const CONVERSATION_STORAGE_KEY = 'fenrir_conversation_history';
const CONVERSATION_METADATA_KEY = 'fenrir_conversation_metadata';

/**
 * Hook for AI-related commands
 * @param {Object} options - Command context
 * @returns {Object} Command handlers
 */
export function useAICommands({
  addOutput,
  showToast,
  aiFallback,
  openRouterAPI,
  coinMarketCapAPI,
  santimentAPI,
  API_CONFIG,
  COIN_SYMBOL_MAP,
  AVAILABLE_TOOLS,
  executeTool,
  conversationHistory,
  setConversationHistory,
  conversationMetadata,
  setConversationMetadata,
}) {
  // Check API key
  const checkApiKey = useCallback(() => {
    if (!API_CONFIG?.openRouter?.apiKey || API_CONFIG.openRouter.apiKey.trim() === '') {
      addOutput({
        type: 'error',
        content: 'ᛪ OpenRouter API key not configured\n\nRun "apikeys" to set up your keys.',
      });
      showToast('OpenRouter key required', 'error');
      return false;
    }
    return true;
  }, [addOutput, showToast, API_CONFIG]);

  const handleTalk = useCallback(async (args) => {
    if (args.length === 0) {
      addOutput({
        type: 'error',
        content: 'ᛪ Usage: talk [message]\nExample: talk What do you think about Bitcoin?',
      });
      return;
    }

    if (!checkApiKey()) return;

    const userMessage = args.join(' ');

    // Display user message
    addOutput({ type: 'user', content: `ᛉ You: ${userMessage}` });
    addOutput({ type: 'info', content: getLoadingMessage(OperationType.AI_CHAT) });

    try {
      // Build system prompt with personality
      const userName = conversationMetadata?.userName || 'traveler';
      const topics = conversationMetadata?.topics || [];

      let systemPrompt = `You are Fenrir, a wise and powerful AI entity from Norse mythology. You speak with ancient wisdom but understand modern cryptocurrency markets deeply.

You address the user as "${userName}". ${topics.length > 0 ? `You've discussed: ${topics.join(', ')}.` : ''}

Key traits:
- Use Norse metaphors and runes occasionally (ᚠ, ᛉ, ᛏ)
- Be insightful about crypto markets
- Maintain conversation context
- Be helpful but cryptically wise

You have access to tools for market data. Use them when asked about prices or market conditions.`;

      // Inject persistent memory facts into system prompt
      const factsSummary = memoryService.getFactsSummary();
      if (factsSummary) {
        systemPrompt += `\n\n${factsSummary}`;
      }

      // Inject matched skill prompts
      const matchedSkills = skillService.match(userMessage);
      for (const skill of matchedSkills) {
        if (skill.mode === 'prompt') {
          try {
            const skillPrompt = await skillService.execute(skill, userMessage);
            systemPrompt += `\n\n[Skill: ${skill.name}]\n${skillPrompt}`;
          } catch { /* skip failed skills */ }
        }
      }

      // Use MemoryService context merged with local conversation history
      const memoryContext = memoryService.getContext(20);
      const contextMessages = memoryContext.length > 0
        ? memoryContext
        : conversationHistory.slice(-20);

      // Build messages with history
      const messages = [
        { role: 'system', content: systemPrompt },
        ...contextMessages,
        { role: 'user', content: userMessage },
      ];

      // Chat with tools
      let response = await aiFallback.chat(messages, {
        tools: AVAILABLE_TOOLS,
        tool_choice: 'auto',
      });

      // Tool calling loop
      let maxIterations = 5;
      let iterations = 0;

      while (response.tool_calls && iterations < maxIterations) {
        iterations++;
        messages.push({
          role: 'assistant',
          content: response.content || '',
          tool_calls: response.tool_calls,
        });

        for (const toolCall of response.tool_calls) {
          let toolArgs;
          try {
            toolArgs = typeof toolCall.function.arguments === 'string'
              ? JSON.parse(toolCall.function.arguments)
              : toolCall.function.arguments;
          } catch {
            continue;
          }

          const toolResult = await executeTool(toolCall.function.name, toolArgs);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        }

        response = await aiFallback.chat(messages, {
          tools: AVAILABLE_TOOLS,
          tool_choice: 'auto',
        });
      }

      const assistantMessage = response.content || response;

      // Update conversation history
      const newHistory = [
        ...conversationHistory,
        { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
        { role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() },
      ].slice(-20);

      setConversationHistory(newHistory);
      localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(newHistory));

      // Persist to MemoryService
      memoryService.addMessage('user', userMessage);
      memoryService.addMessage('assistant', assistantMessage);

      // Extract topics from message
      const extractedTopics = [];
      const topicPatterns = [
        { pattern: /bitcoin|btc/i, topic: 'Bitcoin' },
        { pattern: /ethereum|eth/i, topic: 'Ethereum' },
        { pattern: /solana|sol/i, topic: 'Solana' },
        { pattern: /defi/i, topic: 'DeFi' },
        { pattern: /nft/i, topic: 'NFT' },
      ];
      topicPatterns.forEach(({ pattern, topic }) => {
        if (pattern.test(userMessage)) extractedTopics.push(topic);
      });

      // Update metadata
      const newMetadata = {
        ...conversationMetadata,
        messageCount: (conversationMetadata?.messageCount || 0) + 1,
        topics: [...new Set([...(conversationMetadata?.topics || []), ...extractedTopics])],
      };
      setConversationMetadata(newMetadata);
      localStorage.setItem(CONVERSATION_METADATA_KEY, JSON.stringify(newMetadata));

      addOutput({ type: 'ai', content: `ᚠ Fenrir: ${assistantMessage}` });
      showToast('Fenrir speaks', 'success');
    } catch (error) {
      handleCommandError(error, 'talk', addOutput);
      showToast('AI chat failed', 'error');
    }
  }, [addOutput, showToast, checkApiKey, aiFallback, executeTool, conversationHistory, setConversationHistory, conversationMetadata, setConversationMetadata, AVAILABLE_TOOLS]);

  const handleAsk = useCallback(async (args) => {
    if (args.length === 0) {
      addOutput({
        type: 'error',
        content: 'ᛪ Usage: ask [question]\nExample: ask What is the current BTC price?',
      });
      return;
    }

    if (!checkApiKey()) return;

    const question = args.join(' ');

    addOutput({ type: 'user', content: `ᛉ ${question}` });
    addOutput({ type: 'info', content: getLoadingMessage(OperationType.AI_CHAT) });

    try {
      const systemPrompt = `You are Fenrir's analytical engine. Provide data-driven, concise answers about cryptocurrency markets.

You have access to tools for market data. Use them to get real-time information.

Important:
- Be factual and precise
- Use tools when market data is needed
- Keep responses concise
- This is NOT financial advice`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ];

      let response = await aiFallback.chat(messages, {
        tools: AVAILABLE_TOOLS,
        tool_choice: 'auto',
      });

      // Tool calling loop
      let maxIterations = 5;
      let iterations = 0;

      while (response.tool_calls && iterations < maxIterations) {
        iterations++;
        messages.push({
          role: 'assistant',
          content: response.content || '',
          tool_calls: response.tool_calls,
        });

        for (const toolCall of response.tool_calls) {
          let toolArgs;
          try {
            toolArgs = typeof toolCall.function.arguments === 'string'
              ? JSON.parse(toolCall.function.arguments)
              : toolCall.function.arguments;
          } catch {
            continue;
          }

          const toolResult = await executeTool(toolCall.function.name, toolArgs);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        }

        response = await aiFallback.chat(messages, {
          tools: AVAILABLE_TOOLS,
          tool_choice: 'auto',
        });
      }

      const answer = response.content || response;
      addOutput({ type: 'success', content: `💡 ${answer}` });
      showToast('Query answered', 'success');
    } catch (error) {
      handleCommandError(error, 'ask', addOutput);
      showToast('Query failed', 'error');
    }
  }, [addOutput, showToast, checkApiKey, aiFallback, executeTool, AVAILABLE_TOOLS]);

  const handleAnalyze = useCallback(async (args) => {
    if (args.length === 0) {
      addOutput({
        type: 'error',
        content: 'ᛪ Usage: analyze [symbol]\nExample: analyze BTC',
      });
      return;
    }

    if (!checkApiKey()) return;

    const symbol = args[0].toUpperCase();
    const validation = getCoinIdOrError(symbol, COIN_SYMBOL_MAP);

    if (!validation.valid) {
      addOutput({ type: 'error', content: validation.error });
      return;
    }

    addOutput({ type: 'info', content: `ᛉ Fenrir is analyzing ${symbol}...` });

    try {
      // Fetch market data
      const quotesData = await coinMarketCapAPI.getQuotes(symbol);
      const data = quotesData[symbol];
      const quote = data?.quote?.USD;

      if (!quote) {
        throw new Error(`Unable to retrieve data for ${symbol}`);
      }

      const price = quote.price;
      const change24h = quote.percent_change_24h;

      // Try to get on-chain data
      let onChainData = null;
      if (API_CONFIG?.santiment?.apiKey && santimentAPI) {
        try {
          onChainData = await santimentAPI.getEnrichedAnalysis(validation.coinId);
        } catch { /* Optional */ }
      }

      // Build analysis prompt
      let analysisContext = `Analyze ${symbol}:
Current Price: $${price.toLocaleString()}
24h Change: ${change24h.toFixed(2)}%`;

      if (onChainData) {
        analysisContext += `\nOn-chain: Social ${onChainData.social || 'N/A'}, Dev Activity ${onChainData.dev || 'N/A'}`;
      }

      analysisContext += `\n\nProvide:
1. Current market assessment
2. Key support/resistance levels
3. Short-term outlook (1-7 days)
4. Risk factors
5. Trading considerations

Keep it concise and actionable.`;

      const response = await openRouterAPI.chat([
        { role: 'system', content: 'You are an expert cryptocurrency analyst. Provide clear, actionable analysis.' },
        { role: 'user', content: analysisContext },
      ], { maxTokens: 1500 });

      const analysis = response.content || response;

      let result = `\nᚠ FENRIR'S PROPHECY: ${symbol}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      result += analysis;
      result += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nᛪ Not financial advice`;

      addOutput({ type: 'ai', content: result });
      showToast(`${symbol} analysis complete`, 'success');
    } catch (error) {
      handleCommandError(error, `analyze ${symbol}`, addOutput);
      showToast('Analysis failed', 'error');
    }
  }, [addOutput, showToast, checkApiKey, openRouterAPI, coinMarketCapAPI, santimentAPI, API_CONFIG, COIN_SYMBOL_MAP]);

  const handleForget = useCallback(() => {
    setConversationHistory([]);
    localStorage.removeItem(CONVERSATION_STORAGE_KEY);

    addOutput({
      type: 'success',
      content: 'ᚱ Fenrir: The threads of our past conversations have been severed. We begin anew.',
    });
    showToast('Memory cleared ᚱ', 'success');
  }, [addOutput, showToast, setConversationHistory]);

  // Main command handler
  const handleCommand = useCallback(async (command, args) => {
    switch (command) {
      case 'talk':
        await handleTalk(args);
        return true;
      case 'ask':
        await handleAsk(args);
        return true;
      case 'analyze':
        await handleAnalyze(args);
        return true;
      case 'forget':
        handleForget();
        return true;
      default:
        return false;
    }
  }, [handleTalk, handleAsk, handleAnalyze, handleForget]);

  return {
    handleCommand,
    handleTalk,
    handleAsk,
    handleAnalyze,
    handleForget,
  };
}

export default useAICommands;
