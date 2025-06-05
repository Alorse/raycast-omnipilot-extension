import { useState, useEffect, useCallback } from "react";
import { getSelectedText, Detail, Clipboard, open, showHUD, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useAIStreaming } from "./hooks/useAIStreaming";
import { LLMValidation } from "./components/LLMValidation";

interface CalendarEvent {
  title: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  details: string;
  location: string;
}

interface Preferences {
  defaultLanguage: string;
}

export default function CreateCalendarEvent() {
  const [selectedText, setSelectedText] = useState<string | null>("");
  const [isLoadingText, setIsLoadingText] = useState(true);
  const [calendarEvent, setCalendarEvent] = useState<CalendarEvent | null>(null);
  const [isProcessingEvent, setIsProcessingEvent] = useState(false);

  const { response, isLoading, error, askAI } = useAIStreaming();
  const preferences = getPreferenceValues<Preferences>();

  // Get current date and time information for the AI prompt
  const getCurrentDateTimeInfo = useCallback(() => {
    const now = new Date();
    const date_str = now.toISOString().split("T")[0];
    const time_str = now.toISOString().split("T")[1].split(".")[0];
    const week_day = now.getDay().toString();

    return { date_str, time_str, week_day };
  }, []);

  // Fetch selected text on component mount
  useEffect(() => {
    async function fetchSelectedText() {
      try {
        const selected = await getSelectedText();
        setSelectedText(selected);
      } catch (error) {
        console.log("No text selected:", error);
        setSelectedText(null);
      } finally {
        setIsLoadingText(false);
      }
    }

    fetchSelectedText();
  }, []);

  // Create system prompt for calendar event extraction
  const createSystemPrompt = useCallback(() => {
    const { date_str, time_str, week_day } = getCurrentDateTimeInfo();
    const language = preferences.defaultLanguage || "English";

    return `Extract schedule information from the text provided by the user.
The output should be in the following JSON format.

{
  "title": "string", // Event title, should be descriptive and very concise
  "start_date": "YYYYMMDD", // Start date
  "start_time": "hhmmss", // Start time
  "end_date": "YYYYMMDD", // End date
  "end_time": "hhmmss", // End time
  "details": "string", // Summary in up to 3 concise sentences. URLs should be preserved regardless of length
  "location": "string" // Event location
}

Note:
* Output in ${language}
* Current date: ${date_str}, Current time: ${time_str}, Current week day: ${week_day}, try to set the event date and time based on the current date and time
* Do not include any content other than JSON format in the output
* If the organizer's name is known, include it in the title
* Ensure the location is easily identifiable
* If the duration is not specified, assume it is 2 hours
* Use 24-hour format for times (hhmmss)
* Ensure dates are in YYYYMMDD format without separators`;
  }, [getCurrentDateTimeInfo, preferences.defaultLanguage]);

  // Process AI response and extract calendar event
  useEffect(() => {
    if (response && !isLoading && !isProcessingEvent) {
      setIsProcessingEvent(true);

      try {
        // Try to extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          const parsedEvent = JSON.parse(jsonStr) as CalendarEvent;
          setCalendarEvent(parsedEvent);

          // Create calendar URL and handle clipboard/browser
          createCalendarEvent(parsedEvent);
        } else {
          throw new Error("No valid JSON found in AI response");
        }
      } catch (parseError) {
        console.error("Error parsing calendar event:", parseError);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to extract event",
          message: "Could not parse calendar event from AI response",
        });
      } finally {
        setIsProcessingEvent(false);
      }
    }
  }, [response, isLoading, isProcessingEvent]);

  // Create Google Calendar URL and handle actions
  const createCalendarEvent = useCallback(async (event: CalendarEvent) => {
    try {
      const url = generateGoogleCalendarURL(event);

      await showHUD("Calendar event extracted! Copied to clipboard and opened in browser.");
      await Clipboard.copy(url);
      await open(url);
    } catch (error) {
      console.error("Error creating calendar event:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create calendar event",
        message: String(error),
      });
    }
  }, []);

  // Generate Google Calendar URL
  const generateGoogleCalendarURL = useCallback((event: CalendarEvent): string => {
    // Clean up and format dates/times - remove any non-numeric characters
    const startDateTime = `${event.start_date.replace(/-/g, "")}T${event.start_time.replace(/:/g, "")}00`;
    const endDateTime = `${event.end_date.replace(/-/g, "")}T${event.end_time.replace(/:/g, "")}00`;

    // Encode parameters for URL safety
    const params = {
      text: encodeURIComponent(event.title),
      dates: `${startDateTime}/${endDateTime}`,
      details: encodeURIComponent(event.details),
      location: encodeURIComponent(event.location),
    };

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${params.text}&dates=${params.dates}&details=${params.details}&location=${params.location}&trp=false`;
  }, []);

  // Start AI processing when text is available
  useEffect(() => {
    if (selectedText && !isLoading && !response) {
      const systemPrompt = createSystemPrompt();
      askAI(selectedText, systemPrompt);
    }
  }, [selectedText, askAI, createSystemPrompt, isLoading, response]);

  // Loading state while getting selected text
  if (isLoadingText) {
    return <Detail isLoading={true} markdown="Getting selected text..." />;
  }

  // No text selected
  if (!selectedText) {
    return (
      <Detail
        markdown={`❌ **No text selected**

Please select text containing event information and try again.

**How to use:**
- Select text containing event details (date, time, location, etc.)
- Run this command
- The event will be extracted and opened in Google Calendar

**Example text formats:**
- "Meeting with John tomorrow at 2pm in the conference room"
- "Dentist appointment on Friday December 15th at 10:30am"
- "Team presentation next Monday from 9am to 11am at office"`}
      />
    );
  }

  // Build markdown content based on current state
  let markdownContent = `# 📅 Creating Calendar Event

**Selected Text:**
> ${selectedText}

---

`;

  if (isLoading) {
    markdownContent +=
      "🤖 **Extracting event information...**\n\nPlease wait while I analyze the text and extract calendar event details.";
  } else if (error) {
    markdownContent += `❌ **Error:**\n${error}`;
  } else if (calendarEvent) {
    markdownContent += `✅ **Event Extracted Successfully!**

**Event Details:**
- **Title:** ${calendarEvent.title}
- **Date:** ${calendarEvent.start_date} (${calendarEvent.start_date === calendarEvent.end_date ? "Same day" : `to ${calendarEvent.end_date}`})
- **Time:** ${calendarEvent.start_time} - ${calendarEvent.end_time}
- **Location:** ${calendarEvent.location}
- **Details:** ${calendarEvent.details}

The event has been copied to your clipboard and opened in Google Calendar! 🎉`;
  } else if (response) {
    markdownContent += `🔄 **Processing Response...**

${response}

---

*Converting to calendar event...*`;
  }

  return (
    <LLMValidation>
      <Detail
        isLoading={isLoading || isProcessingEvent}
        markdown={markdownContent}
        metadata={
          calendarEvent ? (
            <Detail.Metadata>
              <Detail.Metadata.Label title="Title" text={calendarEvent.title} />
              <Detail.Metadata.Label title="Start Date" text={calendarEvent.start_date} />
              <Detail.Metadata.Label title="Start Time" text={calendarEvent.start_time} />
              <Detail.Metadata.Label title="End Date" text={calendarEvent.end_date} />
              <Detail.Metadata.Label title="End Time" text={calendarEvent.end_time} />
              <Detail.Metadata.Label title="Location" text={calendarEvent.location} />
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Details" text={calendarEvent.details} />
            </Detail.Metadata>
          ) : undefined
        }
      />
    </LLMValidation>
  );
}
