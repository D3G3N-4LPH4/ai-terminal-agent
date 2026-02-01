import React, { useEffect } from "react";
import { Check, AlertCircle, Info, X } from "lucide-react";

const Toast = React.memo(({ message, type, onClose }) => {
  useEffect(() => {
    // Longer timeout for errors so users can read them
    const timeout = type === 'error' ? 8000 : type === 'warning' ? 5000 : 3000;
    const timer = setTimeout(onClose, timeout);
    return () => clearTimeout(timer);
  }, [onClose, type]);

  const icons = {
    success: <Check size={20} />,
    error: <AlertCircle size={20} />,
    info: <Info size={20} />,
    warning: <AlertCircle size={20} />,
  };

  const colors = {
    success: "bg-green-500/90",
    error: "bg-red-500/90",
    info: "bg-blue-500/90",
    warning: "bg-yellow-500/90",
  };

  return (
    <div
      className={`${colors[type]} text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 backdrop-blur-md`}
    >
      {icons[type]}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70" aria-label="Dismiss notification">
        <X size={16} />
      </button>
    </div>
  );
});

export default Toast;
