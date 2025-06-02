import { useState, useEffect } from "react";
import { Detail, getPreferenceValues, showToast, Toast } from "@raycast/api";

interface Preferences {
  openrouterApiKey: string;
  prompt: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface Arguments {
  query: string;
}

export default function AskAI(props: { arguments: Arguments }) {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const preferences = getPreferenceValues<Preferences>();
  const userQuery = props.arguments.query;

  const askAI = async (question: string) => {
    if (!question.trim()) {
      showToast(Toast.Style.Failure, "Please provide a query");
      setResponse("No query provided.");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Calling OpenRouter API with query:", question);
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${preferences.openrouterApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat:free',
          messages: [
            {
              role: 'system',
              content: preferences.prompt,
            },
            {
              role: 'user',
              content: question,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as OpenRouterResponse;
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        setResponse(data.choices[0].message.content);
      } else {
        throw new Error("Invalid response format from API");
      }
    } catch (error) {
      console.error("Error calling OpenRouter API:", error);
      showToast(Toast.Style.Failure, "Failed to get AI response", String(error));
      setResponse("Sorry, I couldn't process your request. Please check your API key and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userQuery) {
      askAI(userQuery);
    } else {
      setResponse("No query provided. Please provide a query as an argument.");
      setIsLoading(false);
    }
  }, [userQuery]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={response || "Processing your query..."}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Query" text={userQuery || "No query provided"} />
          <Detail.Metadata.Label title="Model" text="deepseek/deepseek-chat:free" />
        </Detail.Metadata>
      }
    />
  );
}