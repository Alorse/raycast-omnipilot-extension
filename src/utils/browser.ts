import { BrowserExtension, environment, Toast, showToast } from '@raycast/api';
import { YoutubeTranscript } from 'youtube-transcript';
import fetch from 'cross-fetch';

global.fetch = fetch;

export function canAccessBrowserExtension() {
  return environment.canAccess(BrowserExtension);
}

// https://i.stack.imgur.com/g2X8z.gif
const ASCII_TABLES = Object.entries({
  '&amp;': '&',
  '&#32;': ' ',
  '&#33;': '!',
  '&#34;': '"',
  '&#35;': '#',
  '&#36;': '$',
  '&#37;': '%',
  '&#38;': '&',
  '&#39;': "'",
  '&#40;': '(',
  '&#41;': ')',
  '&#42;': '*',
  '&#43;': '+',
  '&#44;': ',',
  '&#45;': '-',
  '&#46;': '.',
  '&#47;': '/',
  '&#91;': '[',
  '&#92;': '\\',
  '&#93;': ']',
  '&#94;': '^',
  '&#95;': '_',
  '&#96;': '`',
  '&#123;': '{',
  '&#124;': '|',
  '&#125;': '}',
  '&#126;': '~',
});

export async function getBrowserContent() {
  if (!canAccessBrowserExtension()) {
    return null;
  }

  const tabs = await BrowserExtension.getTabs();
  const activeTab = (tabs.filter((tab) => tab.active) || [])[0];

  let processedText: string;

  // todo: add setting to enable/disable this feature
  if (
    activeTab &&
    activeTab.url.startsWith('https://www.youtube.com/watch?v=')
  ) {
    // not official API, so it may break in the future
    const content = await YoutubeTranscript.fetchTranscript(activeTab.url, {
      lang: 'en',
    }).then((transcript) => {
      return transcript.map((item) => item.text).join('\n');
    });
    processedText = content;
  } else {
    processedText = await getWebsiteContent();
  }

  const entries = Object.entries(activeTab || []);
  return replace(processedText, entries);
}

/**
 * Get website content as clean text without HTML, CSS, or scripts
 */
async function getWebsiteContent(): Promise<string> {
  try {
    const content = await BrowserExtension.getContent({
      format: 'text', // Always use text format to avoid HTML/CSS/scripts
    });
    return content;
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: 'Error',
      message: `Failed to get website content: ${error}`,
    });
    return ''; // Return empty string if there's an error
  }
}

function replace(prompt: string, entries: [string, string][]): string {
  prompt = prompt.replace('\\n', '\n');

  let result = entries.reduce((acc, [key, value]) => {
    const r = new RegExp(`{{\\s*${key}}}\\s*`, 'g');
    return acc.replaceAll(r, value);
  }, prompt);

  for (let i = 0; i < 2; i++) {
    ASCII_TABLES.forEach(([key, value]) => {
      result = result.replaceAll(key, value);
    });
  }
  return result;
}
