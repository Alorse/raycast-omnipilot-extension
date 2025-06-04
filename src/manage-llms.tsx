import React, { useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useLLMConfigs } from "./hooks/useLLMConfigs";
import { LLMConfig, LLMConfigFormData } from "./types/llmConfig";
import { getProviderName, getProviderIcon, getProviderColor } from "./utils/providers";

export default function ManageLLMs() {
  const { configs, activeConfig, isLoading, addConfig, updateConfig, deleteConfig, setActiveLLM, duplicateConfig } =
    useLLMConfigs();
  const { push } = useNavigation();

  const handleDelete = async (config: LLMConfig) => {
    const options: Alert.Options = {
      title: "Delete LLM Configuration",
      message: `Are you sure you want to delete "${config.name}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          try {
            await deleteConfig(config.id);
            showToast({
              style: Toast.Style.Success,
              title: "Configuration deleted",
              message: `"${config.name}" has been removed`,
            });
          } catch (error) {
            showToast({
              style: Toast.Style.Failure,
              title: "Failed to delete configuration",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        },
      },
    };

    await confirmAlert(options);
  };

  const handleSetActive = async (config: LLMConfig) => {
    try {
      await setActiveLLM(config.id);
      showToast({
        style: Toast.Style.Success,
        title: "Active LLM changed",
        message: `Now using "${config.name}"`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to set active LLM",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleDuplicate = async (config: LLMConfig) => {
    try {
      const duplicate = await duplicateConfig(config.id);
      if (duplicate) {
        showToast({
          style: Toast.Style.Success,
          title: "Configuration duplicated",
          message: `Created "${duplicate.name}"`,
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to duplicate configuration",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List isLoading={isLoading} navigationTitle="Manage LLM Configurations" isShowingDetail={true}>
      <List.Section title={`LLM Configurations (${configs.length})`}>
        {configs.map((config) => (
          <List.Item
            key={config.id}
            title={config.name}
            subtitle={config.model}
            icon={{ source: getProviderIcon(config.apiUrl) }}

            detail={
              <List.Item.Detail
                markdown={`# ${config.name}

**Provider:** ${getProviderName(config.apiUrl)}  
**Model:** \`${config.model}\`  
**API URL:** \`${config.apiUrl}\`  
**Status:** ${activeConfig?.id === config.id ? "🟢 Active" : "⚪ Inactive"}  
${config.isDefault ? "**Default Configuration** ⭐" : ""}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Provider">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={getProviderName(config.apiUrl)}
                        color={getProviderColor(config.apiUrl)}
                        icon={{ source: getProviderIcon(config.apiUrl) }}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    {(activeConfig?.id === config.id || config.isDefault) && (
                      <List.Item.Detail.Metadata.TagList title="Status">
                        {activeConfig?.id === config.id && (
                          <List.Item.Detail.Metadata.TagList.Item
                            text="Active"
                            color="#10B981"
                            icon={Icon.CheckCircle}
                          />
                        )}
                        {config.isDefault && (
                          <List.Item.Detail.Metadata.TagList.Item
                            text="Default"
                            color="#F59E0B"
                            icon={Icon.Star}
                          />
                        )}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    
                    <List.Item.Detail.Metadata.Label
                      title="Model"
                      text={config.model}
                      icon={Icon.ComputerChip}
                    />
                    
                    <List.Item.Detail.Metadata.Label
                      title="API Endpoint"
                      text={config.apiUrl}
                      icon={Icon.Globe}
                    />
                    
                    <List.Item.Detail.Metadata.Label
                      title="API Key Status"
                      text={config.apiKey && config.apiKey.length > 0 ? "✅ Configured" : "❌ Missing"}
                      icon={config.apiKey && config.apiKey.length > 0 ? Icon.Lock : Icon.ExclamationMark}
                    />
                    
                    {config.createdAt && (
                      <List.Item.Detail.Metadata.Label
                        title="Created"
                        text={new Date(config.createdAt).toLocaleDateString()}
                        icon={Icon.Calendar}
                      />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {activeConfig?.id !== config.id && (
                    <Action title="Set as Active" icon={Icon.CheckCircle} onAction={() => handleSetActive(config)} />
                  )}
                  <Action
                    title="Edit Configuration"
                    icon={Icon.Pencil}
                    onAction={() => push(<LLMConfigForm config={config} onSave={updateConfig} />)}
                  />
                  <Action
                    title="Duplicate Configuration"
                    icon={Icon.Duplicate}
                    onAction={() => handleDuplicate(config)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Delete Configuration"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(config)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Actions">
        <List.Item
          title="Add New LLM Configuration"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action
                title="Add New Configuration"
                icon={Icon.Plus}
                onAction={() => push(<LLMConfigForm onSave={addConfig} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

interface LLMConfigFormProps {
  config?: LLMConfig;
  onSave:
    | ((data: LLMConfigFormData) => Promise<LLMConfig>)
    | ((id: string, data: LLMConfigFormData) => Promise<LLMConfig>);
}

function LLMConfigForm({ config, onSave }: LLMConfigFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: LLMConfigFormData) => {
    try {
      setIsLoading(true);

      if (config) {
        // Update existing config
        await (onSave as (id: string, data: LLMConfigFormData) => Promise<LLMConfig>)(config.id, values);
        showToast({
          style: Toast.Style.Success,
          title: "Configuration updated",
          message: `"${values.name}" has been updated`,
        });
      } else {
        // Create new config
        await (onSave as (data: LLMConfigFormData) => Promise<LLMConfig>)(values);
        showToast({
          style: Toast.Style.Success,
          title: "Configuration created",
          message: `"${values.name}" has been added`,
        });
      }

      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: config ? "Failed to update configuration" : "Failed to create configuration",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      navigationTitle={config ? "Edit LLM Configuration" : "Add LLM Configuration"}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={config ? "Update Configuration" : "Create Configuration"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Configuration Name"
        placeholder="e.g., OpenAI GPT-4, Claude 3, Gemini Pro"
        defaultValue={config?.name || ""}
      />

      <Form.TextField
        id="apiUrl"
        title="API URL"
        placeholder="https://api.openai.com/v1"
        defaultValue={config?.apiUrl || ""}
        info="The base URL for the API endpoint"
      />

      <Form.PasswordField id="apiKey" title="API Key" placeholder="sk-..." defaultValue={config?.apiKey || ""} />

      <Form.TextField
        id="model"
        title="Model Name"
        placeholder="gpt-4o-mini, claude-3-haiku-20240307, gemini-pro"
        defaultValue={config?.model || ""}
        info="The model identifier used by the API"
      />

      <Form.Checkbox
        id="isDefault"
        title="Set as Default"
        label="Make this the default LLM configuration"
        defaultValue={config?.isDefault || false}
      />
    </Form>
  );
}
