import React from 'react';
import { Loader } from 'lucide-react';

/**
 * LoadingSpinner Component
 *
 * Consistent loading indicator with:
 * - Multiple size variants
 * - Custom messages
 * - Theme support
 * - Accessibility attributes
 */
const LoadingSpinner = ({
  size = 'md',
  message = 'Loading...',
  showMessage = true,
  theme = {},
  className = '',
}) => {
  const sizes = {
    sm: { icon: 16, text: 'text-xs' },
    md: { icon: 24, text: 'text-sm' },
    lg: { icon: 32, text: 'text-base' },
    xl: { icon: 48, text: 'text-lg' },
  };

  const { icon: iconSize, text: textClass } = sizes[size] || sizes.md;

  return (
    <div
      className={`flex items-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader
        size={iconSize}
        className="animate-spin"
        style={{ color: theme.accent || '#00FF41' }}
        aria-hidden="true"
      />
      {showMessage && (
        <span
          className={`${textClass} animate-pulse`}
          style={{ color: theme.text || '#e0e0e0' }}
        >
          {message}
        </span>
      )}
      <span className="sr-only">{message}</span>
    </div>
  );
};

/**
 * SkeletonLoader Component
 *
 * Placeholder loading animation for content
 */
export const SkeletonLoader = ({
  width = '100%',
  height = '1rem',
  rounded = 'md',
  theme = {},
  className = '',
}) => {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  return (
    <div
      className={`animate-pulse ${roundedClasses[rounded] || roundedClasses.md} ${className}`}
      style={{
        width,
        height,
        backgroundColor: (theme.border || '#2a2a4e') + '80',
      }}
      role="presentation"
      aria-hidden="true"
    />
  );
};

/**
 * LoadingOverlay Component
 *
 * Full-screen or container loading overlay
 */
export const LoadingOverlay = ({
  isVisible = false,
  message = 'Processing...',
  theme = {},
  fullScreen = false,
}) => {
  if (!isVisible) return null;

  return (
    <div
      className={`${
        fullScreen ? 'fixed inset-0' : 'absolute inset-0'
      } flex items-center justify-center z-50`}
      style={{
        backgroundColor: (theme.background || '#0a0a1a') + 'E6',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner
          size="lg"
          message={message}
          theme={theme}
        />
      </div>
    </div>
  );
};

/**
 * PulsingDot Component
 *
 * Simple pulsing dot indicator
 */
export const PulsingDot = ({
  color,
  size = 8,
  className = '',
}) => (
  <span
    className={`inline-block rounded-full animate-pulse ${className}`}
    style={{
      width: size,
      height: size,
      backgroundColor: color || '#00FF41',
    }}
    role="presentation"
    aria-hidden="true"
  />
);

/**
 * ProgressBar Component
 *
 * Determinate progress indicator
 */
export const ProgressBar = ({
  progress = 0,
  theme = {},
  showLabel = true,
  height = 4,
  className = '',
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full ${className}`}>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{
          height,
          backgroundColor: (theme.border || '#2a2a4e') + '40',
        }}
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${clampedProgress}%`,
            backgroundColor: theme.accent || '#00FF41',
          }}
        />
      </div>
      {showLabel && (
        <span
          className="text-xs mt-1 block text-right"
          style={{ color: theme.textSecondary || '#888' }}
        >
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;
