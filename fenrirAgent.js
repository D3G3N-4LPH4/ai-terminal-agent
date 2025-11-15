// Fenrir AI Terminal Agent - LangGraph Implementation
// Stateful agent with memory management and complex workflow orchestration

import { StateGraph, Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

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

  // Error tracking
  errors: Annotation({
    reducer: (current, update) => [...(current || []), ...(update || [])],
    default: () => []
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

  // ==================== GRAPH NODES ====================

  // Node 1: Classify the user's intent
  async classifyIntent(state) {
    const currentQuery = state.currentQuery;

    // Simple intent classification based on keywords
    let intent = "general";

    if (currentQuery.match(/price|cost|value|worth/i)) {
      intent = "crypto_price";
    } else if (currentQuery.match(/research|analyze|investigate|study/i)) {
      intent = "research";
    } else if (currentQuery.match(/compare|versus|vs|difference/i)) {
      intent = "analysis";
    } else if (currentQuery.match(/and then|after that|followed by/i)) {
      intent = "multi_step";
    }

    const reasoning = `Classified query "${currentQuery}" as intent: ${intent}`;

    return {
      queryIntent: intent,
      reasoningSteps: [{ step: "classify_intent", reasoning, timestamp: Date.now() }]
    };
  }

  // Node 2: Plan the workflow for multi-step queries
  async planWorkflow(state) {
    const { currentQuery, queryIntent } = state;

    let steps = [];

    if (queryIntent === "multi_step") {
      // Use LLM to break down the query into steps
      const planningPrompt = `Break down this query into sequential steps: "${currentQuery}"

Return a JSON array of steps, each with: { "action": "tool_name or description", "params": {} }

Example: For "Get BTC price and then research it", return:
[
  {"action": "get_crypto_price", "params": {"symbol": "BTC"}},
  {"action": "web_research", "params": {"topic": "Bitcoin price analysis"}}
]

Query: ${currentQuery}`;

      const response = await this.llm.invoke([
        new SystemMessage("You are a query planning assistant. Return only valid JSON."),
        new HumanMessage(planningPrompt)
      ]);

      try {
        steps = JSON.parse(response.content);
      } catch (e) {
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
        reasoning: `Planned ${steps.length} workflow steps`,
        steps,
        timestamp: Date.now()
      }]
    };
  }

  // Node 3: Execute tools based on intent
  async executeTool(state) {
    const { queryIntent, currentQuery, toolResults, toolsExecuted } = state;

    if (!this.toolExecutor) {
      return {
        errors: [{ error: "No tool executor configured", timestamp: Date.now() }]
      };
    }

    let result = null;
    let toolName = "";
    let toolArgs = {};

    try {
      // Map intent to tool
      switch (queryIntent) {
        case "crypto_price":
          toolName = "get_crypto_price";
          // Extract symbol from query
          const symbols = currentQuery.match(/\b[A-Z]{2,5}\b/g);
          if (symbols && symbols.length > 0) {
            toolArgs = { symbols: symbols.join(",") };
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

      // Execute the tool
      result = await this.toolExecutor(toolName, toolArgs);

      return {
        toolsExecuted: [toolName],
        toolResults: { [toolName]: result },
        reasoningSteps: [{
          step: "execute_tool",
          reasoning: `Executed ${toolName} with args: ${JSON.stringify(toolArgs)}`,
          result,
          timestamp: Date.now()
        }]
      };

    } catch (error) {
      return {
        errors: [{
          error: error.message,
          toolName,
          toolArgs,
          timestamp: Date.now()
        }],
        reasoningSteps: [{
          step: "execute_tool_error",
          reasoning: `Failed to execute ${toolName}: ${error.message}`,
          timestamp: Date.now()
        }]
      };
    }
  }

  // Node 4: Generate final response
  async generateResponse(state) {
    const {
      messages,
      currentQuery,
      toolResults,
      queryIntent,
      userPreferences
    } = state;

    // Build context from tool results
    let toolContext = "";
    if (Object.keys(toolResults).length > 0) {
      toolContext = "\n\nTool Results:\n" +
        Object.entries(toolResults)
          .map(([tool, result]) => `${tool}: ${JSON.stringify(result, null, 2)}`)
          .join("\n\n");
    }

    // Build system message with Fenrir personality
    const systemPrompt = `You are Fenrir, an AI terminal agent inspired by Norse mythology.
You are knowledgeable, powerful, and provide insightful analysis of cryptocurrency markets and blockchain technology.

User preferences: ${JSON.stringify(userPreferences)}

Query intent: ${queryIntent}
${toolContext}

Provide a comprehensive, intelligent response that incorporates the tool results if available.
Use a professional yet engaging tone. Include relevant data and insights.`;

    const response = await this.llm.invoke([
      new SystemMessage(systemPrompt),
      ...messages,
      new HumanMessage(currentQuery)
    ]);

    return {
      messages: [new AIMessage(response.content)],
      finalResponse: response.content,
      messageCount: 1,
      reasoningSteps: [{
        step: "generate_response",
        reasoning: "Generated final response using LLM",
        timestamp: Date.now()
      }]
    };
  }

  // Node 5: Update memory and user preferences
  async updateMemory(state) {
    const { messages, userPreferences, currentQuery } = state;

    // Extract potential preference updates from the query
    const updatedPreferences = { ...userPreferences };

    // Check for coin preferences
    const coinMentions = currentQuery.match(/\b(BTC|ETH|SOL|ADA|DOT|LINK|AVAX|MATIC|UNI|AAVE)\b/g);
    if (coinMentions) {
      const favoriteCoins = [...new Set([...updatedPreferences.favoriteCoins, ...coinMentions])];
      updatedPreferences.favoriteCoins = favoriteCoins.slice(0, 10); // Keep top 10
    }

    // Generate conversation summary if message count > 10
    let summary = state.conversationSummary;
    if (messages.length > 10) {
      summary = `Session with ${messages.length} messages covering cryptocurrency analysis and research.`;
    }

    return {
      userPreferences: updatedPreferences,
      conversationSummary: summary,
      reasoningSteps: [{
        step: "update_memory",
        reasoning: "Updated user preferences and conversation summary",
        timestamp: Date.now()
      }]
    };
  }

  // ==================== ROUTING FUNCTIONS ====================

  // Determine if we need to execute tools
  shouldExecuteTool(state) {
    const { queryIntent } = state;
    return ["crypto_price", "research", "analysis"].includes(queryIntent)
      ? "execute_tool"
      : "generate_response";
  }

  // Determine if we need workflow planning
  needsWorkflowPlanning(state) {
    const { queryIntent } = state;
    return queryIntent === "multi_step" ? "plan_workflow" : "execute_tool_routing";
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

    // Define edges
    workflow.addEdge("__start__", "classify_intent");

    workflow.addConditionalEdges(
      "classify_intent",
      this.needsWorkflowPlanning.bind(this),
      {
        "plan_workflow": "plan_workflow",
        "execute_tool_routing": "execute_tool_routing_node"
      }
    );

    // Add a routing node for conditional edge
    workflow.addNode("execute_tool_routing_node", async (state) => state);

    workflow.addConditionalEdges(
      "execute_tool_routing_node",
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
