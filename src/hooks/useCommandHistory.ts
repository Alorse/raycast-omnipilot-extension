import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { CommandHistoryEntry, UseCommandHistoryResult } from "../types";

const STORAGE_KEY = "omnipilot_command_history";
const MAX_HISTORY_ENTRIES = 100;
const DUPLICATE_CHECK_WINDOW_MS = 5000; // 5 seconds

/**
 * Custom hook to manage command history with proper React state management and TypeScript support
 *
 * Features:
 * - Persistent storage using Raycast LocalStorage
 * - Duplicate detection within a time window
 * - Maximum entry limit to prevent storage bloat
 * - Proper error handling with user feedback
 * - Type-safe operations
 *
 * @returns {UseCommandHistoryResult} History management functions and state
 */
export function useCommandHistory(): UseCommandHistoryResult {
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load command history from LocalStorage
   */
  const loadHistory = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const storedHistory = await LocalStorage.getItem<string>(STORAGE_KEY);

      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory) as CommandHistoryEntry[];
        // Validate and filter out any invalid entries
        const validHistory = parsedHistory.filter(isValidHistoryEntry);
        setHistory(validHistory);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error("Failed to load command history:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load history",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Save history to LocalStorage
   */
  const saveHistory = useCallback(async (newHistory: CommandHistoryEntry[]): Promise<void> => {
    try {
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error("Failed to save command history:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save history",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }, []);

  /**
   * Add a new entry to command history
   * Includes duplicate detection and automatic cleanup
   *
   * @param prompt - The user's prompt/query
   * @param response - The AI's response
   * @param model - The model used for this query
   * @param provider - The AI provider used (optional)
   */
  const addToHistory = useCallback(
    async (prompt: string, response: string, model: string, provider?: string): Promise<void> => {
      if (!prompt.trim() || !response.trim()) {
        console.warn("Skipping history entry: prompt or response is empty");
        return;
      }

      try {
        const newEntry: CommandHistoryEntry = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          prompt: prompt.trim(),
          response: response.trim(),
          model,
          provider,
        };

        setHistory((currentHistory) => {
          // Check for duplicates within the time window
          const cutoffTime = Date.now() - DUPLICATE_CHECK_WINDOW_MS;
          const isDuplicate = currentHistory.some((entry) => {
            const entryTime = new Date(entry.timestamp).getTime();
            return entry.prompt === newEntry.prompt && entryTime > cutoffTime;
          });

          if (isDuplicate) {
            console.log("Skipping duplicate entry");
            return currentHistory;
          }

          // Add new entry and limit history size
          const updatedHistory = [newEntry, ...currentHistory].slice(0, MAX_HISTORY_ENTRIES);

          // Save to storage (fire and forget to avoid blocking UI)
          saveHistory(updatedHistory).catch(console.error);

          return updatedHistory;
        });
      } catch (error) {
        console.error("Failed to add to command history:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to save to history",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [saveHistory],
  );

  /**
   * Remove a specific entry from history
   *
   * @param id - The ID of the entry to remove
   */
  const removeEntry = useCallback(
    async (id: string): Promise<void> => {
      try {
        setHistory((currentHistory) => {
          const updatedHistory = currentHistory.filter((entry) => entry.id !== id);
          // Save to storage
          saveHistory(updatedHistory).catch(console.error);
          return updatedHistory;
        });
      } catch (error) {
        console.error("Failed to remove history entry:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to remove entry",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [saveHistory],
  );

  /**
   * Clear all command history
   */
  const clearHistory = useCallback(async (): Promise<void> => {
    try {
      setHistory([]);
      await LocalStorage.removeItem(STORAGE_KEY);
      await showToast({
        style: Toast.Style.Success,
        title: "History cleared",
        message: "All command history has been removed",
      });
    } catch (error) {
      console.error("Failed to clear command history:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to clear history",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, []);

  // Load history on component mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    history,
    isLoading,
    addToHistory,
    clearHistory,
    loadHistory,
    removeEntry,
  };
}

/**
 * Validates if a history entry has all required fields
 */
function isValidHistoryEntry(entry: unknown): entry is CommandHistoryEntry {
  return (
    typeof entry === "object" &&
    entry !== null &&
    typeof (entry as Record<string, unknown>).id === "string" &&
    typeof (entry as Record<string, unknown>).timestamp === "string" &&
    typeof (entry as Record<string, unknown>).prompt === "string" &&
    typeof (entry as Record<string, unknown>).response === "string" &&
    typeof (entry as Record<string, unknown>).model === "string" &&
    !isNaN(Date.parse((entry as Record<string, unknown>).timestamp as string))
  );
}
