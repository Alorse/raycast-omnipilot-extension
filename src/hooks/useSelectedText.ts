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
 */
export function useSelectedText(): UseSelectedTextReturn {
  const hasExecutedRef = useRef(false);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(true);

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasExecutedRef.current) {
      return;
    }

    async function fetchSelectedText() {
      try {
        const selected = await getSelectedText();
        setSelectedText(selected);
      } catch (error) {
        console.error('Error getting selected text:', error);
        setSelectedText(null);
      } finally {
        setIsLoadingText(false);
        hasExecutedRef.current = true;
      }
    }

    fetchSelectedText();
  }, []);

  return {
    selectedText,
    isLoadingText,
    hasExecuted: hasExecutedRef.current,
  };
}
