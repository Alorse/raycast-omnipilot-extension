import { useState, useEffect } from 'react';
import { LLMConfig, LLMConfigFormData } from '../types/llmConfig';
import { LLMConfigManager } from '../services/llmConfigManager';

export function useLLMConfigs() {
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [activeConfig, setActiveConfig] = useState<LLMConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfigs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const allConfigs = await LLMConfigManager.getAllConfigs();
      const active = await LLMConfigManager.getActiveLLM();

      setConfigs(allConfigs);
      setActiveConfig(active);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load LLM configurations',
      );
      console.error('Error loading LLM configs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const addConfig = async (formData: LLMConfigFormData) => {
    try {
      const newConfig = await LLMConfigManager.addConfig(formData);
      await loadConfigs(); // Refresh the list
      return newConfig;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to add LLM configuration';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateConfig = async (id: string, formData: LLMConfigFormData) => {
    try {
      const updatedConfig = await LLMConfigManager.updateConfig(id, formData);
      if (updatedConfig) {
        await loadConfigs(); // Refresh the list
        return updatedConfig;
      }
      throw new Error('Configuration not found');
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to update LLM configuration';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteConfig = async (id: string) => {
    try {
      const success = await LLMConfigManager.deleteConfig(id);
      if (success) {
        await loadConfigs(); // Refresh the list
        return true;
      }
      throw new Error('Configuration not found');
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to delete LLM configuration';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const setActiveLLM = async (id: string | null) => {
    try {
      await LLMConfigManager.setActiveLLM(id);
      await loadConfigs(); // Refresh to get the new active config
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to set active LLM';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const duplicateConfig = async (id: string) => {
    try {
      const duplicate = await LLMConfigManager.duplicateConfig(id);
      if (duplicate) {
        await loadConfigs(); // Refresh the list
        return duplicate;
      }
      throw new Error('Configuration not found');
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to duplicate LLM configuration';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  return {
    configs,
    activeConfig,
    isLoading,
    error,
    loadConfigs,
    addConfig,
    updateConfig,
    deleteConfig,
    setActiveLLM,
    duplicateConfig,
  };
}
