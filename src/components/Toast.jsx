import React, { useEffect, useRef, useState } from 'react';

export default function Toast({ type = 'info', message = '', duration = 5000, onClose }) {
  const [isClosing, setIsClosing] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => onCloseRef.current?.(), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]); // ← onClose intentionally excluded; using ref to avoid timer resets

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };

  return (
    <div className={`toast ${type}${isClosing ? ' closing' : ''}`}>
      <span className="toast-icon">{icons[type]}</span>
      <span className="toast-message">{message}</span>
    </div>
  );
}
