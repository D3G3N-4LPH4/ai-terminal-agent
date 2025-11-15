import React from "react";
import { Palette } from "lucide-react";
import { THEMES } from "../config/themes";

const ThemeToggle = React.memo(
  ({ currentTheme, onChangeTheme }) => {
    const handleToggle = () => {
      const themeKeys = Object.keys(THEMES);
      const currentIndex = themeKeys.indexOf(currentTheme);
      const nextIndex = (currentIndex + 1) % themeKeys.length;
      const nextTheme = themeKeys[nextIndex];
      onChangeTheme(nextTheme);
    };

    const theme = THEMES[currentTheme];

    return (
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-gray-700 bg-gray-900/80 hover:bg-gray-800/90 transition-all duration-200 hover:scale-105"
        style={{
          boxShadow: `0 0 15px ${theme.chartColors.price}40`,
        }}
        title={`Current theme: ${theme.name}. Click to switch.`}
      >
        <div
          className="w-6 h-6 rounded-full transition-all duration-300"
          style={{
            backgroundColor: theme.chartColors.price,
            boxShadow: `0 0 10px ${theme.chartColors.price}, 0 0 20px ${theme.chartColors.price}60`,
          }}
        />
        <span className="text-gray-300 text-sm font-medium hidden sm:inline">
          {theme.name}
        </span>
        <Palette size={16} className="text-gray-400" />
      </button>
    );
  }
);

export default ThemeToggle;
