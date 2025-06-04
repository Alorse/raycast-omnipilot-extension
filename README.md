# OmniPilot - AI-Powered Raycast Extension

OmniPilot is your all-in-one AI copilot for Raycast. It connects to top LLMs OpenRouter, Google, OpenAI and any OpenAI-compatible endpoint to help you ask questions, translate text, analyze content, and more — all directly from your desktop. Stay focused, work smarter, and bring AI everywhere you need it.

## Features

### 🔧 Manage LLMs
- **Dynamic Configuration Management**: Add, edit, and switch between multiple AI providers
- **Multiple Provider Support**: OpenRouter, OpenAI, Gemini, Anthropic, and any OpenAI-compatible API
- **Secure Storage**: API keys stored locally and encrypted
- **Quick Switching**: Change active LLM configuration with one click

### 🤖 Ask AI
- Stream AI responses in real-time  
- Support for multiple AI providers
- Customizable prompts and models
- Copy responses to clipboard
- View current model and provider information

### 🌐 Translation
- Translate selected text or manual input
- Smart language detection
- Customizable target languages
- Support for all major languages

### 📖 Explain
- Explain complex concepts or code
- Educational prompts optimized for learning
- Context-aware explanations

### 📚 Command History
- Automatically save all AI interactions
- Search through past conversations
- Copy previous prompts and responses
- Remove individual entries or clear all
- Track models and providers used
- Persistent storage across sessions

### ⚙️ Multi-Provider Support
- **OpenRouter**: Access to multiple AI models through a single API
- **OpenAI**: Direct integration with GPT models  
- **Anthropic**: Claude models support
- **Google**: Access to multiple Gemini models
- Any OpenAI-compatible API

## Installation & Setup

### Quick Start (Recommended)

1. Install the extension in Raycast
2. Run "Manage LLMs" command
3. Add your API configuration:
   - Choose a provider (OpenRouter, OpenAI, Anthropic, etc.)
   - Enter your API key
   - Set as active configuration
4. Start using any AI command!

## Commands

- **Ask AI** (`ask`): Ask questions to AI with streaming responses
- **Translate Text** (`translate`): Translate text between languages
- **Command History** (`command-history`): View and manage your AI conversation history
- **Explain** (`explain`) 

## Architecture

Built with a modular, type-safe architecture:
- **Real-time Streaming**: Natural incremental responses
- **Multi-Provider Support**: Easy switching between AI services  
- **Type Safety**: Full TypeScript support
- **Error Handling**: Comprehensive error management
- **Memory Efficient**: Optimized streaming implementation