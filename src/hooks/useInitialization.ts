import { useEffect } from 'react';
import { initializeLLMConfigs } from '../services/openrouter';

/**
 * Initialize LLM configurations on extension startup
 */
export function useInitialization() {
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeLLMConfigs();
        console.log('LLM configurations initialized successfully');
      } catch (error) {
        console.error('Failed to initialize LLM configurations:', error);
      }
    };

    initialize();
  }, []);
}
