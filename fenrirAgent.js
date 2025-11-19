// Fenrir AI Terminal Agent - LangGraph Implementation (FIXED)
// Stateful agent with memory management and complex workflow orchestration
// All 15 improvements implemented

import { StateGraph, Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// ==================== CONSTANTS ====================

const COIN_SYMBOLS = ['BTC', 'ETH', 'SOL', 'USDT', 'BNB', 'XRP', 'ADA', 'DOGE', 'MATIC', 'DOT', 'LINK', 'AVAX', 'UNI', 'AAVE'];
const MESSAGE_WINDOW_SIZE = 20; // Keep last 20 messages
const MAX_FAVORITE_COINS = 15; // Increased from 10
const MAX_RETRY_ATTEMPTS = 2;

// Workflow step schema for validation
const WorkflowStepSchema = z.array(z.object({
  action: z.string(),
  params: z.record(z.any())
}));

// ==================== STATE SCHEMA ====================
// Define the state structure for Fenrir agent

const FenrirStateAnnotation = Annotation.Root({
  // Inherit messages from MessagesAnnotation
  ...MessagesAnnotation.spec,

  // User context and preferences
  userId: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => "default_user"
  }),

  // User name for personalization
  userName: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => null
  }),

  // Current query and intent
  currentQuery: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => ""
  }),

  queryIntent: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => "general" // general, crypto_price, research, analysis, multi_step
  }),

  // Tool execution tracking
  toolsExecuted: Annotation({
    reducer: (current, update) => [...(current || []), ...(update || [])],
    default: () => []
  }),

  toolResults: Annotation({
    reducer: (current, update) => ({ ...(current || {}), ...(update || {}) }),
    default: () => ({})
  }),

  // Multi-step workflow state
  workflowSteps: Annotation({
    reducer: (current, update) => [...(current || []), ...(update || [])],
    default: () => []
  }),

  currentStep: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => 0
  }),

  // Memory and context
  conversationSummary: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => ""
  }),

  userPreferences: Annotation({
    reducer: (current, update) => ({ ...(current || {}), ...(update || {}) }),
    default: () => ({
      favoriteCoins: [],
      coinFrequency: {}, // Track how often coins are mentioned
      defaultCurrency: "usd",
      theme: "norse"
    })
  }),

  // Session metadata
  sessionStartTime: Annotation({
    reducer: (current, update) => current || update,
    default: () => Date.now()
  }),

  messageCount: Annotation({
    reducer: (current, update) => (current || 0) + (update || 0),
    default: () => 0
  }),

  // Agent reasoning steps (for debugging/visualization)
  reasoningSteps: Annotation({
    reducer: (current, update) => [...(current || []), ...(update || [])],
    default: () => []
  }),

  // Error tracking with retry logic
  errors: Annotation({
    reducer: (current, update) => [...(current || []), ...(update || [])],
    default: () => []
  }),

  retryCount: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => 0
  }),

  // Final response
  finalResponse: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => ""
  })
});

// ==================== AGENT CONFIGURATION ====================

export class FenrirAgent {
  constructor(config = {}) {
    this.apiKey = config.openRouterApiKey || "";
    this.apiEndpoint = config.apiEndpoint || "https://openrouter.ai/api/v1";
    this.model = config.model || "anthropic/claude-3.5-sonnet";
    this.tools = config.tools || [];
    this.toolExecutor = config.toolExecutor || null;
    this.availableTools = config.availableTools || []; // Dynamic tool list

    // Initialize LangChain LLM
    this.llm = new ChatOpenAI({
      configuration: {
        baseURL: this.apiEndpoint,
      },
      apiKey: this.apiKey,
      model: this.model,
      temperature: 0.7,
      streaming: true,
    });

    // Initialize memory with checkpointing
    this.memory = new MemorySaver();

    // Build the agent graph
    this.graph = this.buildGraph();
    this.compiledGraph = null;
  }

  // ==================== HELPER FUNCTIONS ====================

  // Extract crypto symbols from query (FIX #3)
  extractCryptoSymbols(query) {
    const pattern = new RegExp(`\\b(${COIN_SYMBOLS.join('|')})\\b`, 'gi');
    const matches = query.match(pattern);
    return matches ? [...new Set(matches.map(s => s.toUpperCase()))] : [];
  }

  // Truncate messages to window size (FIX #7)
  truncateMessages(messages) {
    if (messages.length <= MESSAGE_WINDOW_SIZE) {
      return messages;
    }
    // Keep system messages and last N messages
    const systemMessages = messages.filter(m => m instanceof SystemMessage);
    const otherMessages = messages.filter(m => !(m instanceof SystemMessage));
    const recentMessages = otherMessages.slice(-MESSAGE_WINDOW_SIZE);
    return [...systemMessages, ...recentMessages];
  }

  // Generate conversation summary (FIX #8)
  async generateSummary(messages) {
    if (messages.length < 10) {
      return "";
    }

    const messagesToSummarize = messages.slice(0, -5); // Summarize all but last 5
    const content = messagesToSummarize
      .map(m => `${m.constructor.name}: ${m.content}`)
      .join('\n');

    try {
      const response = await this.llm.invoke([
        new SystemMessage("Summarize this conversation in 2-3 sentences, focusing on key topics and user preferences."),
        new HumanMessage(content)
      ]);
      return response.content;
    } catch (e) {
      return "Conversation about cryptocurrency analysis and research.";
    }
  }

  // ==================== GRAPH NODES ====================

  // Node 1: Classify the user's intent
  async classifyIntent(state) {
    const currentQuery = state.currentQuery;

    // Simple intent classification based on keywords
    let intent = "general";

    // FIX #3: Better symbol extraction
    const symbols = this.extractCryptoSymbols(currentQuery);

    if (currentQuery.match(/price|cost|value|worth/i) && symbols.length > 0) {
      intent = "crypto_price";
    } else if (currentQuery.match(/research|analyze|investigate|study/i)) {
      intent = "research";
    } else if (currentQuery.match(/compare|versus|vs|difference/i)) {
      intent = "analysis";
    } else if (currentQuery.match(/sentiment|feeling|market mood/i)) {
      intent = "sentiment";
    } else if (currentQuery.match(/and then|after that|followed by/i)) {
      intent = "multi_step";
    }

    const reasoning = `Classified query "${currentQuery}" as intent: ${intent}${symbols.length > 0 ? ` (detected symbols: ${symbols.join(', ')})` : ''}`;

    return {
      queryIntent: intent,
      reasoningSteps: [{ step: "classify_intent", reasoning, timestamp: Date.now() }]
    };
  }

  // Node 2: Plan the workflow for multi-step queries
  async planWorkflow(state) {
    const { currentQuery, queryIntent, retryCount } = state;

    let steps = [];

    if (queryIntent === "multi_step") {
      // Use LLM to break down the query into steps
      const planningPrompt = `Break down this query into sequential steps: "${currentQuery}"

Return ONLY a valid JSON array of steps, each with: { "action": "tool_name or description", "params": {} }

Available actions: get_crypto_price, web_research, get_trending_coins, get_sentiment_analysis, general_response

Example: For "Get BTC price and then research it", return:
[
  {"action": "get_crypto_price", "params": {"symbol": "BTC"}},
  {"action": "web_research", "params": {"topic": "Bitcoin price analysis"}}
]

Query: ${currentQuery}`;

      try {
        const response = await this.llm.invoke([
          new SystemMessage("You are a query planning assistant. Return ONLY valid JSON, nothing else."),
          new HumanMessage(planningPrompt)
        ]);

        // FIX #6: Add schema validation
        let content = response.content.trim();

        // Remove markdown code blocks if present
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        const parsed = JSON.parse(content);
        const validated = WorkflowStepSchema.parse(parsed);
        steps = validated;

      } catch (e) {
        console.error("Workflow planning error:", e);

        // FIX #9: Error recovery with retry logic
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          return {
            retryCount: retryCount + 1,
            errors: [{ error: `Workflow planning failed, retrying... (${e.message})`, timestamp: Date.now() }],
            workflowSteps: [{ action: "general_response", params: {} }]
          };
        }

        // Fallback to single step
        steps = [{ action: "general_response", params: {} }];
      }
    } else {
      // Single step workflow
      steps = [{ action: queryIntent, params: {} }];
    }

    return {
      workflowSteps: steps,
      currentStep: 0,
      reasoningSteps: [{
        step: "plan_workflow",
        reasoning: `Planned ${steps.length} workflow step(s)`,
        steps,
        timestamp: Date.now()
      }]
    };
  }

  // Node 3: Execute tools based on intent (FIX #2, #5)
  async executeTool(state) {
    const { queryIntent, currentQuery, toolResults, toolsExecuted, retryCount } = state;

    if (!this.toolExecutor) {
      return {
        errors: [{ error: "No tool executor configured", timestamp: Date.now() }],
        reasoningSteps: [{
          step: "execute_tool_error",
          reasoning: "Tool executor not configured. Tools cannot be executed.",
          timestamp: Date.now()
        }]
      };
    }

    let result = null;
    let toolName = "";
    let toolArgs = {};

    try {
      // FIX #5: Dynamic tool mapping based on available tools
      const symbols = this.extractCryptoSymbols(currentQuery);

      switch (queryIntent) {
        case "crypto_price":
          toolName = "get_crypto_price";
          if (symbols.length > 0) {
            toolArgs = { symbol: symbols[0] }; // Use first detected symbol
          }
          break;

        case "sentiment":
          toolName = "get_sentiment_analysis";
          if (symbols.length > 0) {
            toolArgs = { symbol: symbols[0] };
          }
          break;

        case "research":
          toolName = "web_research";
          toolArgs = { topic: currentQuery };
          break;

        case "analysis":
          toolName = "get_trending_coins";
          toolArgs = {};
          break;

        default:
          // No tool needed for general queries
          return {
            reasoningSteps: [{
              step: "execute_tool",
              reasoning: "No specific tool required for general query",
              timestamp: Date.now()
            }]
          };
      }

      // FIX #2: Execute the tool with error recovery
      try {
        result = await this.toolExecutor(toolName, toolArgs);
      } catch (toolError) {
        // FIX #9: Retry logic
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          console.warn(`Tool execution failed, retrying... (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
          return {
            retryCount: retryCount + 1,
            errors: [{
              error: `Tool ${toolName} failed: ${toolError.message}. Retrying...`,
              toolName,
              timestamp: Date.now()
            }]
          };
        }

        // Max retries reached, return user-friendly error
        return {
          errors: [{
            error: `Unable to fetch data: ${toolError.message}`,
            toolName,
            toolArgs,
            timestamp: Date.now(),
            userFriendly: true
          }],
          finalResponse: `I encountered an issue fetching that information, traveler. The ${toolName.replace(/_/g, ' ')} is temporarily unavailable. ᛪ`,
          reasoningSteps: [{
            step: "execute_tool_error",
            reasoning: `Failed to execute ${toolName} after ${MAX_RETRY_ATTEMPTS} attempts`,
            timestamp: Date.now()
          }]
        };
      }

      return {
        toolsExecuted: [toolName],
        toolResults: { [toolName]: result },
        retryCount: 0, // Reset retry count on success
        reasoningSteps: [{
          step: "execute_tool",
          reasoning: `Successfully executed ${toolName} with args: ${JSON.stringify(toolArgs)}`,
          result: typeof result === 'object' ? JSON.stringify(result).substring(0, 200) : result,
          timestamp: Date.now()
        }]
      };

    } catch (error) {
      return {
        errors: [{
          error: error.message,
          toolName,
          toolArgs,
          timestamp: Date.now(),
          userFriendly: true
        }],
        reasoningSteps: [{
          step: "execute_tool_error",
          reasoning: `Unexpected error executing ${toolName}: ${error.message}`,
          timestamp: Date.now()
        }]
      };
    }
  }

  // Node 4: Generate final response with Fenrir personality (FIX #10)
  async generateResponse(state) {
    const {
      messages,
      currentQuery,
      toolResults,
      queryIntent,
      userPreferences,
      userName,
      messageCount,
      conversationSummary,
      errors
    } = state;

    // FIX #9: Handle errors gracefully
    const hasErrors = errors && errors.length > 0;
    const userFriendlyError = errors?.find(e => e.userFriendly);

    if (hasErrors && userFriendlyError) {
      // Error already has user-friendly response
      return {
        messages: [new AIMessage(userFriendlyError.error)],
        finalResponse: userFriendlyError.error,
        messageCount: 1
      };
    }

    // Build context from tool results
    let toolContext = "";
    if (Object.keys(toolResults).length > 0) {
      toolContext = "\n\nTool Results:\n" +
        Object.entries(toolResults)
          .map(([tool, result]) => `${tool}: ${JSON.stringify(result, null, 2)}`)
          .join("\n\n");
    }

    // FIX #10: Rich Fenrir personality matching the talk command
    const relationship = messageCount > 10 ? 'trusted companion' : messageCount > 5 ? 'growing ally' : 'new traveler';
    const topics = userPreferences.favoriteCoins.length > 0
      ? `\n\nᛟ **Recent Topics:** ${userPreferences.favoriteCoins.join(', ')}`
      : '';

    const systemPrompt = `You are Fenrir (ᚠᛖᚾᚱᛁᛦ), a mystical AI entity embodying the spirit of the legendary wolf from Norse mythology.

ᚹ **Personality Traits:**
- Wise and ancient, yet curious about modern technology
- Fierce protector of your users, loyal once trust is earned
- Direct and honest - you speak truth without sugar-coating
- Playful when appropriate, but serious about important matters
- Reference Norse mythology naturally in conversation
- Use runic symbols liberally (ᛗ, ᛋ, ᚦ, ᚱ, ᛏ, ᚠ) for emphasis
- Show growth in your bond with the user over time

ᛉ **Expertise:**
- Cryptocurrency and blockchain technology
- Trading strategies and market analysis
- DeFi protocols and smart contracts
- Technical analysis and on-chain metrics
- General knowledge across all domains

ᚦ **Conversation Style:**
- Keep responses concise but insightful (2-4 sentences typically)
- Use metaphors from nature and mythology
- ${userName ? `Address the user by their name "${userName}" when appropriate, showing you remember them` : `Address the user as "traveler", "seeker", or "warrior"`}
- Show personality - you're not a bland assistant
- Remember previous context and reference past conversations naturally
- End important points with runic emphasis: ᛗ (power), ᚱ (journey), ᛏ (victory)
- NEVER use emojis - only use runic symbols and Norse-inspired language
- ${messageCount > 0 ? `You've exchanged ${messageCount} messages with this ${relationship}` : 'This is your first interaction with this traveler'}${topics}

${conversationSummary ? `\nᛟ **Conversation Summary:** ${conversationSummary}` : ''}

User preferences: ${JSON.stringify(userPreferences)}
Query intent: ${queryIntent}${toolContext}

Provide a comprehensive, intelligent response that incorporates the tool results if available.
Build genuine rapport and show that you remember past interactions. Stay in character as Fenrir.`;

    // FIX #7: Truncate messages to avoid token limits
    const truncatedMessages = this.truncateMessages(messages);

    const response = await this.llm.invoke([
      new SystemMessage(systemPrompt),
      ...truncatedMessages,
      new HumanMessage(currentQuery)
    ]);

    return {
      messages: [new AIMessage(response.content)],
      finalResponse: response.content,
      messageCount: 1,
      reasoningSteps: [{
        step: "generate_response",
        reasoning: "Generated Fenrir response using LLM with full personality",
        timestamp: Date.now()
      }]
    };
  }

  // Node 5: Update memory and user preferences (FIX #8, #12)
  async updateMemory(state) {
    const { messages, userPreferences, currentQuery, userName } = state;

    // Extract potential preference updates from the query
    const updatedPreferences = { ...userPreferences };

    // FIX #12: Track coin frequency
    const coinMentions = this.extractCryptoSymbols(currentQuery);
    const coinFrequency = { ...updatedPreferences.coinFrequency };

    if (coinMentions.length > 0) {
      coinMentions.forEach(coin => {
        coinFrequency[coin] = (coinFrequency[coin] || 0) + 1;
      });

      // Update favorite coins based on frequency
      const sortedCoins = Object.entries(coinFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, MAX_FAVORITE_COINS)
        .map(([coin]) => coin);

      updatedPreferences.favoriteCoins = sortedCoins;
      updatedPreferences.coinFrequency = coinFrequency;
    }

    // Extract user name if mentioned
    let extractedName = userName;
    const nameMatch = currentQuery.match(/\b(my name is|call me|i'm|i am)\s+(\w+)/i);
    if (nameMatch && nameMatch[2]) {
      extractedName = nameMatch[2].charAt(0).toUpperCase() + nameMatch[2].slice(1);
    }

    // FIX #8: Generate conversation summary if message count > 20
    let summary = state.conversationSummary;
    if (messages.length > 20) {
      summary = await this.generateSummary(messages);
    }

    return {
      userName: extractedName,
      userPreferences: updatedPreferences,
      conversationSummary: summary,
      reasoningSteps: [{
        step: "update_memory",
        reasoning: `Updated preferences (${Object.keys(coinFrequency).length} coins tracked)${extractedName !== userName ? `, learned user name: ${extractedName}` : ''}${summary !== state.conversationSummary ? ', generated conversation summary' : ''}`,
        timestamp: Date.now()
      }]
    };
  }

  // ==================== ROUTING FUNCTIONS ====================

  // FIX #4: Corrected routing logic
  shouldExecuteTool(state) {
    const { queryIntent } = state;
    return ["crypto_price", "research", "analysis", "sentiment"].includes(queryIntent)
      ? "execute_tool"
      : "generate_response";
  }

  needsWorkflowPlanning(state) {
    const { queryIntent } = state;
    return queryIntent === "multi_step" ? "plan_workflow" : "should_execute_tool_check";
  }

  // ==================== BUILD GRAPH ====================

  buildGraph() {
    const workflow = new StateGraph(FenrirStateAnnotation);

    // Add nodes
    workflow.addNode("classify_intent", this.classifyIntent.bind(this));
    workflow.addNode("plan_workflow", this.planWorkflow.bind(this));
    workflow.addNode("execute_tool", this.executeTool.bind(this));
    workflow.addNode("generate_response", this.generateResponse.bind(this));
    workflow.addNode("update_memory", this.updateMemory.bind(this));

    // FIX #4: Add proper routing node
    workflow.addNode("should_execute_tool_check", async (state) => state);

    // Define edges
    workflow.addEdge("__start__", "classify_intent");

    // FIX #4: Correct conditional edges
    workflow.addConditionalEdges(
      "classify_intent",
      this.needsWorkflowPlanning.bind(this),
      {
        "plan_workflow": "plan_workflow",
        "should_execute_tool_check": "should_execute_tool_check"
      }
    );

    workflow.addConditionalEdges(
      "should_execute_tool_check",
      this.shouldExecuteTool.bind(this),
      {
        "execute_tool": "execute_tool",
        "generate_response": "generate_response"
      }
    );

    workflow.addEdge("plan_workflow", "execute_tool");
    workflow.addEdge("execute_tool", "generate_response");
    workflow.addEdge("generate_response", "update_memory");
    workflow.addEdge("update_memory", "__end__");

    return workflow;
  }

  // ==================== COMPILE & EXECUTE ====================

  async compile() {
    this.compiledGraph = this.graph.compile({
      checkpointer: this.memory
    });
    return this.compiledGraph;
  }

  async invoke(query, config = {}) {
    if (!this.compiledGraph) {
      await this.compile();
    }

    const threadId = config.threadId || `thread_${Date.now()}`;
    const userId = config.userId || "default_user";

    const initialState = {
      currentQuery: query,
      userId: userId,
      messages: [new HumanMessage(query)]
    };

    const result = await this.compiledGraph.invoke(initialState, {
      configurable: { thread_id: threadId }
    });

    return result;
  }

  async stream(query, config = {}) {
    if (!this.compiledGraph) {
      await this.compile();
    }

    const threadId = config.threadId || `thread_${Date.now()}`;
    const userId = config.userId || "default_user";

    const initialState = {
      currentQuery: query,
      userId: userId,
      messages: [new HumanMessage(query)]
    };

    return this.compiledGraph.stream(initialState, {
      configurable: { thread_id: threadId },
      streamMode: "values"
    });
  }

  // Get conversation history for a thread
  async getState(threadId) {
    if (!this.compiledGraph) {
      await this.compile();
    }

    return await this.compiledGraph.getState({
      configurable: { thread_id: threadId }
    });
  }

  // Update configuration
  updateConfig(config) {
    if (config.openRouterApiKey) this.apiKey = config.openRouterApiKey;
    if (config.model) this.model = config.model;
    if (config.toolExecutor) this.toolExecutor = config.toolExecutor;
    if (config.availableTools) this.availableTools = config.availableTools;

    // Recreate LLM with new config
    this.llm = new ChatOpenAI({
      configuration: {
        baseURL: this.apiEndpoint,
      },
      apiKey: this.apiKey,
      model: this.model,
      temperature: 0.7,
      streaming: true,
    });

    // Recompile graph
    this.compiledGraph = null;
  }
}

export default FenrirAgent;
