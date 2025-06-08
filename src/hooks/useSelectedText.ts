import { useState, useEffect, useRef } from 'react';
import { getSelectedText } from '../utils/getSelectedText';

interface UseSelectedTextReturn {
  selectedText: string | null;
  isLoadingText: boolean;
  hasExecuted: boolean;
}

/**
 * Custom hook for handling selected text retrieval with caching and error handling
 * Prevents double execution in React Strict Mode and provides loading state
 * Uses useRef for selectedText to avoid state-related re-render issues
 */
export function useSelectedText(): UseSelectedTextReturn {
  const hasExecutedRef = useRef(false);
  const selectedTextRef = useRef<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(true);

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasExecutedRef.current) {
      return;
    }

    async function fetchSelectedText() {
      try {
        const selected = await getSelectedText();
        selectedTextRef.current = selected;
      } catch (error) {
        console.error('Error getting selected text:', error);
        selectedTextRef.current = null;
      } finally {
        setIsLoadingText(false);
        hasExecutedRef.current = true;
      }
    }

    fetchSelectedText();
  }, []);

  return {
    selectedText: selectedTextRef.current,
    isLoadingText,
    hasExecuted: hasExecutedRef.current,
  };
}
