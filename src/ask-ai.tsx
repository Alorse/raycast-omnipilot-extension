import { useState, useEffect } from "react";
import { Detail, getPreferenceValues, showToast, Toast } from "@raycast/api";

interface Preferences {
  openrouterApiKey: string;
  prompt: string;
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
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }
      
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Append new chunk to buffer
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines from buffer
          while (true) {
            const lineEnd = buffer.indexOf('\n');
            if (lineEnd === -1) break;
            
            const line = buffer.slice(0, lineEnd).trim();
            buffer = buffer.slice(lineEnd + 1);
            
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                  // setResponse((response) => response + content);
                  setResponse(fullResponse);

                }
              } catch {
                // Ignore invalid JSON
              }
            }
          }
        }
      } finally {
        reader.cancel();
      }
      
      // Ensure we have some response
      if (!fullResponse) {
        throw new Error("No content received from stream");
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
      markdown={response}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Query" text={userQuery || "No query provided"} />
          <Detail.Metadata.Label title="Model" text="deepseek/deepseek-chat:free" />
        </Detail.Metadata>
      }
    />
  );
}