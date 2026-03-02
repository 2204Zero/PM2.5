import { useEffect, useRef, useState } from "react";

function AnimatedNumber({ value, duration = 250, decimals = 0 }) {
  const [displayValue, setDisplayValue] = useState(value || 0);
  const startValueRef = useRef(value || 0);
  const targetValueRef = useRef(value || 0);
  const startTimeRef = useRef(null);
  const rafIdRef = useRef(null);

  useEffect(() => {
    // Cancel any ongoing animation
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    startValueRef.current = displayValue;
    targetValueRef.current = typeof value === "number" ? value : 0;
    startTimeRef.current = null;

    const step = (timestamp) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = duration > 0 ? Math.min(1, elapsed / duration) : 1;

      const start = startValueRef.current;
      const end = targetValueRef.current;
      const current = start + (end - start) * progress;

      setDisplayValue(current);

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(step);
      } else {
        // Ensure we end exactly on the target value
        setDisplayValue(end);
      }
    };

    rafIdRef.current = requestAnimationFrame(step);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [value, duration]);

  const formatted =
    typeof displayValue === "number"
      ? displayValue.toFixed(decimals)
      : Number(displayValue || 0).toFixed(decimals);

  return <span>{formatted}</span>;
}

export default AnimatedNumber;

