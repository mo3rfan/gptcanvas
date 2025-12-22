import { useState } from 'react';
import { SettingsSidebar } from './components/SettingsSidebar';
import { MindmapCanvas } from './components/MindmapCanvas';
import type { ChatState, MessageNode, Settings } from './types';
import { simulateStreaming, mockLLMResponse, fetchLLMResponse, estimateTokens } from './utils';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'gptcanvas_settings';

const INITIAL_SETTINGS: Settings = {
  apiUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-3.5-turbo',
};

function App() {
  const [settings, setSettings] = useState<Settings>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : INITIAL_SETTINGS;
  });

  const handleSettingsChange = (newSettings: Settings) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    setSettings(newSettings);
    setState(prev => ({
      ...prev,
      selectedModel: newSettings.model,
      apiUrl: newSettings.apiUrl,
      apiKey: newSettings.apiKey,
    }));
  };

  const [state, setState] = useState<ChatState>(() => ({
    nodes: {},
    rootId: null,
    selectedModel: settings.model, // Initialize with current settings
    apiUrl: settings.apiUrl,       // Initialize with current settings
    apiKey: settings.apiKey,       // Initialize with current settings
    tokenStats: { input: 0, output: 0, total: 0 },
  }));


  const updateNodeContent = (id: string, content: string) => {
    setState((prev) => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [id]: { ...prev.nodes[id], content },
      },
    }));
  };

  const handlePrompt = async (parentId: string | null, prompt: string, highlightedText?: string) => {
    const userId = uuidv4();
    const assistantId = uuidv4();

    // Calculate input tokens
    const inputText = highlightedText ? `${highlightedText}\n${prompt}` : prompt;
    const inputTokens = estimateTokens(inputText);

    // Update input token count
    setState(prev => ({
      ...prev,
      tokenStats: {
        ...prev.tokenStats,
        input: prev.tokenStats.input + inputTokens,
        total: prev.tokenStats.total + inputTokens,
      }
    }));

    // 1. Prepare Nodes
    const userNode: MessageNode = {
      id: userId,
      role: 'user',
      content: prompt,
      parentId,
      highlightedText,
      isBranch: !!highlightedText,
      childrenIds: [assistantId], // Link to assistant immediately
      isCollapsed: false,
    };

    const assistantNode: MessageNode = {
      id: assistantId,
      role: 'assistant',
      content: '', // Streaming starts later
      parentId: userId,
      isBranch: false, // Responses stay in the same column as prompts
      childrenIds: [],
      isCollapsed: false,
    };

    // 2. Add both nodes atomically
    setState((prev) => {
      const newNodes = {
        ...prev.nodes,
        [userId]: userNode,
        [assistantId]: assistantNode
      };

      if (parentId && newNodes[parentId]) {
        newNodes[parentId] = {
          ...newNodes[parentId],
          childrenIds: [...newNodes[parentId].childrenIds, userId],
        };
      }

      return {
        ...prev,
        nodes: newNodes,
        rootId: prev.rootId || userId,
      };
    });

    // 3. Get Response
    const isMock = new URLSearchParams(window.location.search).has('mock');

    if (isMock) {
      const response = mockLLMResponse(prompt, highlightedText);
      let fullContent = '';
      await simulateStreaming(response, (token) => {
        fullContent += token;
        updateNodeContent(assistantId, fullContent);
        // Update output tokens in real-time
        const outputTokens = estimateTokens(token);
        setState(prev => ({
          ...prev,
          tokenStats: {
            ...prev.tokenStats,
            output: prev.tokenStats.output + outputTokens,
            total: prev.tokenStats.total + outputTokens,
          }
        }));
      });
    } else {
      let fullContent = '';
      await fetchLLMResponse(
        settings.apiUrl,
        settings.apiKey,
        settings.model,
        prompt,
        highlightedText || null,
        (token: string) => {
          fullContent += token;
          updateNodeContent(assistantId, fullContent);
          // Update output tokens in real-time
          const outputTokens = estimateTokens(token);
          setState(prev => ({
            ...prev,
            tokenStats: {
              ...prev.tokenStats,
              output: prev.tokenStats.output + outputTokens,
              total: prev.tokenStats.total + outputTokens,
            }
          }));
        }
      );
    }
  };

  const handleBranch = (parentId: string, highlightedText: string, prompt: string) => {
    handlePrompt(parentId, prompt, highlightedText);
  };

  const handleReply = (parentId: string, prompt: string) => {
    handlePrompt(parentId, prompt);
  };

  const handleToggleCollapse = (id: string) => {
    setState(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [id]: { ...prev.nodes[id], isCollapsed: !prev.nodes[id].isCollapsed }
      }
    }));
  };

  const handleMoveNode = (id: string, x: number, y: number) => {
    setState(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [id]: { ...prev.nodes[id], position: { x, y } }
      }
    }));
  };

  const handleUpdateHeight = (id: string, height: number) => {
    setState(prev => {
      if (prev.nodes[id]?.height === height) return prev;
      return {
        ...prev,
        nodes: {
          ...prev.nodes,
          [id]: { ...prev.nodes[id], height }
        }
      };
    });
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans">
      <SettingsSidebar
        settings={settings}
        onSettingsChange={handleSettingsChange}
        tokenStats={state.tokenStats}
      />

      <main className="flex-1 flex flex-col relative">
        <MindmapCanvas
          state={state}
          onBranch={handleBranch}
          onReply={handleReply}
          onToggleCollapse={handleToggleCollapse}
          onMoveNode={handleMoveNode}
          onUpdateHeight={handleUpdateHeight}
        />

        {/* Initial Prompt Overlay if no root */}
        {!state.rootId && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800 shadow-2xl max-w-md w-full pointer-events-auto">
              <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                GPTCanvas
              </h1>
              <p className="text-zinc-400 mb-6 text-sm">
                Start a mind-mapped conversation. Highlight any text to branch into new ideas.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = e.target as typeof e.target & {
                    prompt: { value: string };
                  };
                  if (target.prompt.value.trim()) {
                    handlePrompt(null, target.prompt.value);
                    target.prompt.value = '';
                  }
                }}
                className="flex flex-col gap-4"
              >
                <textarea
                  name="prompt"
                  placeholder="Ask anything..."
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm h-32 resize-none focus:outline-none focus:border-blue-500"
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors">
                  Start Chat
                </button>
              </form>
            </div>
          </div>
        )}
        <div className="absolute bottom-4 left-4 text-[10px] text-zinc-700 font-mono pointer-events-none select-none">
          v2.1.0 - SCROLLABLE_RESPONSES
        </div>
      </main>
    </div>
  );
}

export default App;
