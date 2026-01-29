import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal, ArrowUp, Loader, Command } from 'lucide-react';

/**
 * CommandInput Component
 *
 * Handles terminal command input with:
 * - Command history navigation (up/down arrows)
 * - Autocomplete suggestions
 * - Loading state during command execution
 * - Keyboard shortcuts
 */
const CommandInput = ({
  onSubmit,
  isLoading = false,
  commandHistory = [],
  suggestions = [],
  placeholder = 'Enter command...',
  theme = {},
  disabled = false,
}) => {
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const inputRef = useRef(null);

  // Filter suggestions based on input
  const filteredSuggestions = suggestions.filter(
    s => s.toLowerCase().startsWith(input.toLowerCase()) && input.length > 0
  );

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle form submission
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || disabled) return;

    onSubmit(input.trim());
    setInput('');
    setHistoryIndex(-1);
    setShowSuggestions(false);
  }, [input, isLoading, disabled, onSubmit]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    // Command history navigation
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showSuggestions && filteredSuggestions.length > 0) {
        setSelectedSuggestion(prev => Math.max(0, prev - 1));
      } else if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (showSuggestions && filteredSuggestions.length > 0) {
        setSelectedSuggestion(prev => Math.min(filteredSuggestions.length - 1, prev + 1));
      } else if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Tab' && filteredSuggestions.length > 0) {
      e.preventDefault();
      setInput(filteredSuggestions[selectedSuggestion]);
      setShowSuggestions(false);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHistoryIndex(-1);
    }
  }, [commandHistory, historyIndex, showSuggestions, filteredSuggestions, selectedSuggestion]);

  // Handle input change
  const handleChange = useCallback((e) => {
    const value = e.target.value;
    setInput(value);
    setHistoryIndex(-1);
    setShowSuggestions(value.length > 0 && filteredSuggestions.length > 0);
    setSelectedSuggestion(0);
  }, []);

  // Select suggestion on click
  const handleSuggestionClick = useCallback((suggestion) => {
    setInput(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, []);

  return (
    <div className="relative">
      {/* Autocomplete suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          id="suggestions-list"
          role="listbox"
          className="absolute bottom-full left-0 right-0 mb-1 rounded-lg overflow-hidden shadow-lg z-50"
          style={{
            backgroundColor: theme.inputBg || '#1a1a2e',
            border: `1px solid ${theme.border || '#2a2a4e'}`,
            maxHeight: '200px',
            overflowY: 'auto',
          }}
        >
          {filteredSuggestions.slice(0, 8).map((suggestion, index) => (
            <div
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-4 py-2 cursor-pointer transition-colors"
              style={{
                backgroundColor: index === selectedSuggestion
                  ? (theme.accent || '#00FF41') + '20'
                  : 'transparent',
                color: theme.text || '#e0e0e0',
              }}
              onMouseEnter={() => setSelectedSuggestion(index)}
            >
              <span style={{ color: theme.accent || '#00FF41' }}>
                {suggestion.substring(0, input.length)}
              </span>
              <span>{suggestion.substring(input.length)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        {/* Terminal prompt icon */}
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader
              size={20}
              className="animate-spin"
              style={{ color: theme.accent || '#00FF41' }}
            />
          ) : (
            <Terminal
              size={20}
              style={{ color: theme.accent || '#00FF41' }}
            />
          )}
          <span
            style={{ color: theme.accent || '#00FF41' }}
            className="font-mono text-sm"
          >
            $
          </span>
        </div>

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(input.length > 0 && filteredSuggestions.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="flex-1 bg-transparent border-none outline-none font-mono"
          style={{ color: theme.text || '#e0e0e0' }}
          autoComplete="off"
          spellCheck="false"
          aria-label="Command input"
          aria-autocomplete="list"
          aria-controls="suggestions-list"
          aria-expanded={showSuggestions}
        />

        {/* Submit button */}
        <button
          type="submit"
          disabled={!input.trim() || isLoading || disabled}
          className="p-2 rounded-lg transition-all duration-200 disabled:opacity-50"
          style={{
            backgroundColor: (theme.accent || '#00FF41') + '20',
            color: theme.accent || '#00FF41',
          }}
          aria-label="Submit command"
        >
          <ArrowUp size={18} />
        </button>
      </form>

      {/* Keyboard shortcut hint */}
      <div
        className="flex items-center gap-4 mt-2 text-xs opacity-50"
        style={{ color: theme.textSecondary || '#a0a0a0' }}
      >
        <span className="flex items-center gap-1">
          <Command size={12} /> + Enter to submit
        </span>
        <span>↑↓ History</span>
        <span>Tab Autocomplete</span>
      </div>
    </div>
  );
};

export default CommandInput;
