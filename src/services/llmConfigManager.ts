import { LocalStorage } from '@raycast/api';
import { LLMConfig, LLMConfigFormData, DEFAULT_LLMS } from '../types/llmConfig';

const STORAGE_KEY = 'llm-configurations';
const ACTIVE_LLM_KEY = 'active-llm-id';

export class LLMConfigManager {
  static async getAllConfigs(): Promise<LLMConfig[]> {
    try {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (!stored) {
        return [];
      }
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading LLM configurations:', error);
      return [];
    }
  }

  static async saveConfigs(configs: LLMConfig[]): Promise<void> {
    try {
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
    } catch (error) {
      console.error('Error saving LLM configurations:', error);
      throw error;
    }
  }

  static async addConfig(formData: LLMConfigFormData): Promise<LLMConfig> {
    const configs = await this.getAllConfigs();

    const newConfig: LLMConfig = {
      id: `llm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...formData,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: configs.length === 0, // First config becomes active by default
    };

    // If this is set as default, remove default from others
    if (newConfig.isDefault) {
      configs.forEach((config) => (config.isDefault = false));
    }

    configs.push(newConfig);
    await this.saveConfigs(configs);

    return newConfig;
  }

  static async updateConfig(
    id: string,
    formData: LLMConfigFormData,
  ): Promise<LLMConfig | null> {
    const configs = await this.getAllConfigs();
    const configIndex = configs.findIndex((c) => c.id === id);

    if (configIndex === -1) {
      return null;
    }

    // If this is set as default, remove default from others
    if (formData.isDefault) {
      configs.forEach((config) => (config.isDefault = false));
    }

    configs[configIndex] = {
      ...configs[configIndex],
      ...formData,
      updatedAt: new Date(),
    };

    await this.saveConfigs(configs);
    return configs[configIndex];
  }

  static async deleteConfig(id: string): Promise<boolean> {
    const configs = await this.getAllConfigs();
    const filteredConfigs = configs.filter((c) => c.id !== id);

    if (filteredConfigs.length === configs.length) {
      return false; // Config not found
    }

    await this.saveConfigs(filteredConfigs);

    // If we deleted the active config, clear the active selection
    const activeId = await this.getActiveLLMId();
    if (activeId === id) {
      await this.setActiveLLM(null);
    }

    return true;
  }

  static async getActiveLLM(): Promise<LLMConfig | null> {
    const configs = await this.getAllConfigs();
    const activeId = await this.getActiveLLMId();

    if (activeId) {
      const activeConfig = configs.find((c) => c.id === activeId);
      if (activeConfig) {
        return activeConfig;
      }
    }

    // Fallback to default config
    const defaultConfig = configs.find((c) => c.isDefault);
    if (defaultConfig) {
      await this.setActiveLLM(defaultConfig.id);
      return defaultConfig;
    }

    // Fallback to first config
    if (configs.length > 0) {
      await this.setActiveLLM(configs[0].id);
      return configs[0];
    }

    return null;
  }

  static async getActiveLLMId(): Promise<string | null> {
    try {
      const activeId = await LocalStorage.getItem<string>(ACTIVE_LLM_KEY);
      return activeId || null;
    } catch (error) {
      console.error('Error getting active LLM ID:', error);
      return null;
    }
  }

  static async setActiveLLM(id: string | null): Promise<void> {
    try {
      if (id) {
        await LocalStorage.setItem(ACTIVE_LLM_KEY, id);
      } else {
        await LocalStorage.removeItem(ACTIVE_LLM_KEY);
      }
    } catch (error) {
      console.error('Error setting active LLM:', error);
      throw error;
    }
  }

  static async initializeDefaults(): Promise<void> {
    const existing = await this.getAllConfigs();

    if (existing.length === 0) {
      // Create empty configs that users can fill in
      const defaultConfigs: LLMConfig[] = DEFAULT_LLMS.map(
        (template, index) => ({
          ...template,
          id: `default-${index}`,
          apiKey: '', // Users will need to fill this in
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: index === 0,
        }),
      );

      await this.saveConfigs(defaultConfigs);
    }
  }

  static async getConfigById(id: string): Promise<LLMConfig | null> {
    const configs = await this.getAllConfigs();
    return configs.find((c) => c.id === id) || null;
  }

  static async duplicateConfig(id: string): Promise<LLMConfig | null> {
    const original = await this.getConfigById(id);
    if (!original) {
      return null;
    }

    const duplicate: LLMConfigFormData = {
      name: `${original.name} (Copy)`,
      apiUrl: original.apiUrl,
      apiKey: original.apiKey,
      model: original.model,
      isDefault: false, // Duplicates are never default
    };

    return await this.addConfig(duplicate);
  }
}
