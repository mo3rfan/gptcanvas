import type { Message, MessageNode, Nodes } from './types';

export const constructMessageHistory = (
  leafNodeId: string,
  nodes: Nodes,
): Message[] => {
  const history: Message[] = [];
  let currentNodeId: string | null = leafNodeId;

  while (currentNodeId) {
    const currentNode: MessageNode = nodes[currentNodeId];
    if (!currentNode) {
      break;
    }

    // Add the current node's message to the beginning of the history
    history.unshift({
      role: currentNode.role,
      content: currentNode.content,
    });

    // Move to the parent node
    currentNodeId = currentNode.parentId;
  }

  return history;
};
// src/utils.ts



export const simulateStreaming = async (
    response: string,
    onUpdate: (chunk: string) => void,
    delay: number = 10
) => {
    for (let i = 0; i < response.length; i++) {
        onUpdate(response[i]);
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
};

export const mockLLMResponse = (messages: Message[]): string => {
    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage.content;

    // Check if the prompt is a reply or a new branch
    if (messages.length > 2) {
        return `This is a mocked response based on the conversation history and your latest prompt: "${prompt}".`;
    }
    
    return `This is a mocked response to your question: "${prompt}". The actual LLM API is not being called. To enable live API calls, remove the '?mock' parameter from the URL. Here's a code block:\n\n\`\`\`javascript\nconsole.log('Hello, world!');\n\`\`\`\n\nAnd here is the formula you mentioned: $$G_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}$$\n\nAnd here is the quadratic formula: $$x=\\frac{-b\\pm\\sqrt{b^{2}-4ac}}{2a}$$\n\nAnd here is another formula: $$ax^{2}+bx+c=0 \\quad (a \\neq 0) $$\n\nAnd another one: $$\\boxed{x=\\frac{-b\\pm\\sqrt{b^{2}-4ac}}{2a}}$$`;
};

export const fetchLLMResponse = async (
    apiUrl: string,
    apiKey: string,
    model: string,
    messages: Message[],
    onUpdate: (token: string) => void
) => {
    const body = {
        model,
        messages: [
            {
                role: 'system',
                content: `You are a helpful assistant integrated into a mind-mapping application. 
                Users can branch conversations from highlighted text.
                When a user provides context from highlighted text, your response should focus on that context.
                Format your responses using Markdown. All LaTeX must be enclosed in double dollar signs ($$...$$). Raw LaTeX environments such as \begin{...}...\end{...} are forbidden unless wrapped in $$...$$.
                When creating tables, always include a header row. Ensure table content is clearly formatted and readable.`
            },
            ...messages
        ],
        stream: true,
    };

    try {
        const response = await fetch(`${apiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorBody = await response.json();
            onUpdate(`Error: ${errorBody.error.message}`);
            return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
            onUpdate('Error: Could not read stream.');
            return;
        }
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.substring(6);
                    if (jsonStr === '[DONE]') {
                        return;
                    }
                    try {
                        const chunk = JSON.parse(jsonStr);
                        if (chunk.choices[0].delta.content) {
                            onUpdate(chunk.choices[0].delta.content);
                        }
                    } catch (e) {
                        console.error('Error parsing stream chunk:', e);
                    }
                }
            }
        }
    } catch (e: unknown) {
        onUpdate(`Network Error: ${e instanceof Error ? e.message : String(e)}`);
    }
};

// A very rough token estimator
export const estimateTokens = (text: string): number => {
    return Math.ceil(text.length / 4);
};

