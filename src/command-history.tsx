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

  const formatDetailDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatRelativeDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days !== 1 ? "s" : ""} ago`;
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  const getProviderColor = (provider?: string) => {
    if (provider?.includes("openai")) return "#10A37F";
    if (provider?.includes("anthropic")) return "#D97706";
    if (provider?.includes("gemini") || provider?.includes("google")) return "#4285F4";
    if (provider?.includes("openrouter")) return "#8B5CF6";
    return "#6B7280";
  };

  const getProviderName = (provider?: string) => {
    if (provider?.includes("openai")) return "OpenAI";
    if (provider?.includes("anthropic")) return "Anthropic";
    if (provider?.includes("gemini") || provider?.includes("google")) return "Google";
    if (provider?.includes("openrouter")) return "OpenRouter";
    return provider || "Unknown";
  };

  return (
    <List
      isShowingDetail={true}
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
            subtitle={formatRelativeDate(entry.timestamp)}
            detail={
              <List.Item.Detail
                markdown={`## 🔸 User Query
\`\`\`
${entry.prompt}
\`\`\`

## 🤖 AI Response
${entry.response}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Date & Time"
                      text={formatDetailDate(entry.timestamp)}
                      icon={Icon.Calendar}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Provider">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={getProviderName(entry.provider)}
                        color={getProviderColor(entry.provider)}
                        icon={Icon.Globe}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.TagList title="Model">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={entry.model || "Unknown"}
                        color="#4A90E2"
                        icon={Icon.ComputerChip}
                      />
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Copy Actions">
                  <Action.CopyToClipboard
                    title="Copy Response"
                    content={entry.response}
                    icon={Icon.Clipboard}
                  />
                  <Action.CopyToClipboard
                    title="Copy Prompt"
                    content={entry.prompt}
                    icon={Icon.Document}
                  />
                  <Action.CopyToClipboard
                    title="Copy Full Conversation"
                    content={`**Prompt:** ${entry.prompt}\n\n**Response:** ${entry.response}\n\n**Model:** ${entry.model}\n**Provider:** ${getProviderName(entry.provider)}\n**Time:** ${formatDetailDate(entry.timestamp)}`}
                    icon={Icon.CopyClipboard}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Management">
                  <Action
                    title="Remove This Entry"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleRemoveEntry(entry.id)}
                  />
                  <Action
                    title="Clear All History"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    onAction={handleClearHistory}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
