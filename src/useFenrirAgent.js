// Frontend API Client for LangGraph Agent
// Communicates with backend agent endpoint

import { useState, useCallback, useRef } from 'react';

export const useFenrirAgent = (config = {}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const [agentState, setAgentState] = useState(null);
  const [reasoningSteps, setReasoningSteps] = useState([]);
  const [error, setError] = useState(null);

  const sessionIdRef = useRef(`session_${Date.now()}`);
  const threadIdRef = useRef(`thread_${Date.now()}`);
  const apiKeyRef = useRef(config.openRouterApiKey || "");
  const modelRef = useRef(config.model || "anthropic/claude-3.5-sonnet");
  const baseUrl = 'http://localhost:3001';

  // Update configuration
  const updateConfig = useCallback((newConfig) => {
    if (newConfig.openRouterApiKey) apiKeyRef.current = newConfig.openRouterApiKey;
    if (newConfig.model) modelRef.current = newConfig.model;
  }, []);

  // Invoke agent (non-streaming)
  const invokeQuery = useCallback(async (query, options = {}) => {
    setIsStreaming(true);
    setError(null);
    setCurrentResponse("");
    setReasoningSteps([]);

    try {
      const response = await fetch(`${baseUrl}/api/agent/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openrouter-api-key': apiKeyRef.current
        },
        body: JSON.stringify({
          query,
          config: {
            sessionId: options.sessionId || sessionIdRef.current,
            threadId: options.threadId || threadIdRef.current,
            userId: options.userId || "default_user",
            model: modelRef.current
          },
          stream: false
        })
      });

      if (!response.ok) {
        let errorMessage = 'Agent request failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If JSON parsing fails, try to get text
          try {
            const errorText = await response.text();
            errorMessage = errorText || `Server error: ${response.status} ${response.statusText}`;
          } catch {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = await response.json();
      } catch (e) {
        console.error("Failed to parse response JSON:", e);
        throw new Error("Invalid response from server. Please check your OpenRouter API key and ensure the backend is running properly.");
      }

      setAgentState(result);
      setCurrentResponse(result.finalResponse || "");
      setReasoningSteps(result.reasoningSteps || []);
      setIsStreaming(false);

      return result;

    } catch (err) {
      console.error("Agent invoke error:", err);
      setError(err.message);
      setIsStreaming(false);
      throw err;
    }
  }, [baseUrl]);

  // Stream query (Server-Sent Events)
  const streamQuery = useCallback(async (query, options = {}) => {
    setIsStreaming(true);
    setError(null);
    setCurrentResponse("");
    setReasoningSteps([]);

    try {
      const response = await fetch(`${baseUrl}/api/agent/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openrouter-api-key': apiKeyRef.current
        },
        body: JSON.stringify({
          query,
          config: {
            sessionId: options.sessionId || sessionIdRef.current,
            threadId: options.threadId || threadIdRef.current,
            userId: options.userId || "default_user",
            model: modelRef.current
          },
          stream: true
        })
      });

      if (!response.ok) {
        let errorMessage = 'Agent request failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If JSON parsing fails, try to get text
          try {
            const errorText = await response.text();
            errorMessage = errorText || `Server error: ${response.status} ${response.statusText}`;
          } catch {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setIsStreaming(false);
              continue;
            }

            try {
              const chunk = JSON.parse(data);

              // Update reasoning steps
              if (chunk.reasoningSteps && chunk.reasoningSteps.length > 0) {
                setReasoningSteps(prev => [...prev, ...chunk.reasoningSteps]);
              }

              // Update current response
              if (chunk.finalResponse) {
                setCurrentResponse(chunk.finalResponse);
              }

              // Store final state
              setAgentState(chunk);
            } catch (e) {
              console.error('Failed to parse chunk:', e);
            }
          }
        }
      }

      setIsStreaming(false);
      return agentState;

    } catch (err) {
      console.error("Agent stream error:", err);
      setError(err.message);
      setIsStreaming(false);
      return null;
    }
  }, [baseUrl, agentState]);

  // Get conversation state
  const getConversationState = useCallback(async (threadId) => {
    try {
      const response = await fetch(
        `${baseUrl}/api/agent/state/${threadId || threadIdRef.current}?sessionId=${sessionIdRef.current}`
      );

      if (!response.ok) {
        throw new Error('Failed to get conversation state');
      }

      const state = await response.json();
      return state;
    } catch (err) {
      console.error("Failed to get conversation state:", err);
      return null;
    }
  }, [baseUrl]);

  // Reset conversation (new thread and session)
  const resetConversation = useCallback(async () => {
    try {
      await fetch(`${baseUrl}/api/agent/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current
        })
      });

      threadIdRef.current = `thread_${Date.now()}`;
      sessionIdRef.current = `session_${Date.now()}`;
      setAgentState(null);
      setCurrentResponse("");
      setReasoningSteps([]);
      setError(null);
    } catch (err) {
      console.error("Failed to reset conversation:", err);
    }
  }, [baseUrl]);

  // Get user preferences from current state
  const getUserPreferences = useCallback(() => {
    return agentState?.userPreferences || {
      favoriteCoins: [],
      defaultCurrency: "usd",
      theme: "norse"
    };
  }, [agentState]);

  // Update user preferences (optimistic update)
  const updateUserPreferences = useCallback((preferences) => {
    if (agentState) {
      setAgentState(prev => ({
        ...prev,
        userPreferences: {
          ...prev.userPreferences,
          ...preferences
        }
      }));
    }
  }, [agentState]);

  return {
    // Agent state
    isStreaming,
    currentResponse,
    agentState,
    reasoningSteps,
    error,
    threadId: threadIdRef.current,
    sessionId: sessionIdRef.current,

    // Agent actions
    streamQuery,
    invokeQuery,
    updateConfig,
    getConversationState,
    resetConversation,

    // User preferences
    getUserPreferences,
    updateUserPreferences,
  };
};

export default useFenrirAgent;
