import React from "react";

const OutputItem = React.memo(({ item, theme }) => {
  const colors = {
    system: theme.accent,
    command: theme.text,
    success: "text-green-400",
    error: "text-red-400",
    info: "text-yellow-400",
    help: theme.text,
    user: theme.text,
    ai: "text-green-400",
  };

  return (
    <div
      className={`${
        colors[item.type]
      } font-mono text-xs sm:text-sm whitespace-pre-wrap mb-3 leading-relaxed animate-in fade-in duration-200 break-words overflow-wrap-anywhere`}
    >
      {item.content}
    </div>
  );
});

export default OutputItem;
