import { List, ActionPanel, Action, Icon } from "@raycast/api";

export function ChatViewList() {
  const items = [
    {
      id: "obsidian",
      title: "Obsidian",
      subtitle: "Control Obsidian with Raycast",
      icon: "🟣", // también puede ser una URL o archivo local
      downloads: "90.1k",
      author: "👤",
    },
    {
      id: "cursor",
      title: "Cursor",
      subtitle: "Control Cursor & Codium directly from Raycast",
      icon: Icon.Terminal,
      downloads: "18.2k",
      author: "👨‍💻",
    },
  ];

  return (
    <List isShowingDetail={false}>
      {items.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          icon={item.icon}
          accessories={[
            { text: item.downloads, icon: Icon.Download },
            { text: item.author },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://raycast.com/extensions/${item.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
