import { Action, ActionPanel, List, Icon, confirmAlert, Alert } from "@raycast/api";
import { useCommandHistory } from "./hooks/useCommandHistory";
import { CommandHistoryEntry } from "./types";

export default function CommandHistory() {
  const { history, isLoading, clearHistory, removeEntry } = useCommandHistory();

  const handleClearHistory = async () => {
    const confirmed = await confirmAlert({
      title: "Clear Command History",
      message: "Are you sure you want to clear all command history? This action cannot be undone.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await clearHistory();
    }
  };

  const handleRemoveEntry = async (id: string) => {
    const confirmed = await confirmAlert({
      title: "Remove Entry",
      message: "Are you sure you want to remove this entry from history?",
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await removeEntry(id);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search command history..."
      actions={
        history.length > 0 ? (
          <ActionPanel>
            <Action
              title="Clear All History"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleClearHistory}
              shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
            />
          </ActionPanel>
        ) : undefined
      }
    >
      {history.length === 0 ? (
        <List.EmptyView
          title="No Command History"
          description="Your AI conversations will appear here"
          icon={Icon.Clock}
        />
      ) : (
        history.map((entry: CommandHistoryEntry) => (
          <List.Item
            key={entry.id}
            title={truncateText(entry.prompt)}
            subtitle={truncateText(entry.response)}
            accessories={[
              { text: formatDate(entry.timestamp) },
              {
                tag: {
                  value: entry.model,
                  color: entry.provider?.includes("openai")
                    ? "#10A37F"
                    : entry.provider?.includes("anthropic")
                      ? "#D97706"
                      : "#8B5CF6",
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Response" content={entry.response} icon={Icon.Clipboard} />
                <Action.CopyToClipboard
                  title="Copy Prompt"
                  content={entry.prompt}
                  icon={Icon.Document}
                  shortcut={{ modifiers: ["cmd"], key: "p" }}
                />
                <Action.CopyToClipboard
                  title="Copy Both"
                  content={`**Prompt:** ${entry.prompt}\n\n**Response:** ${entry.response}`}
                  icon={Icon.CopyClipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action
                  title="Remove Entry"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleRemoveEntry(entry.id)}
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                />
                <Action
                  title="Clear All History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={handleClearHistory}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
