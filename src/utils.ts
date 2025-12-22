// src/utils.ts

export const preprocessLatex = (content: string): string => {
  const latexRegex = new RegExp('\\[([^\\[\\]]+)\\]', 'g');
  return content.replace(latexRegex, (formula) => {
    const cleanedFormula = formula.replace(/;=;/g, '=').replace(/,/g, ' ');
    return `$$${cleanedFormula}$$`;
  });
};

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

export const mockLLMResponse = (prompt: string, context?: string | null): string => {
    if (context) {
        return `This is a mocked response based on the context: "${context}" and your question: "${prompt}". Highlighting text allows for more targeted follow-ups, enabling deeper exploration of specific concepts within the conversation flow. This branching creates a more organized and detailed mind map.`;
    }
    return `This is a mocked response to your question: "${prompt}". The actual LLM API is not being called. To enable live API calls, remove the '?mock' parameter from the URL. Here's a code block:\n\n\`\`\`javascript\nconsole.log('Hello, world!');\n\`\`\`\n\nAnd here is the formula you mentioned: [ G_{\\mu\\nu} + \\Lambda,g_{\\mu\\nu} ;=; \\frac{8\\pi G}{c^4},T_{\\mu\\nu} ]\n\nAnd here is a list:\n- Item 1\n- Item 2\n- Item 3`;
};

export const fetchLLMResponse = async (
    apiUrl: string,
    apiKey: string,
    model: string,
    prompt: string,
    context: string | null,
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
                Format your responses using Markdown.`
            },
            {
                role: 'user',
                content: context ? `Context: "${context}"\n\nQuestion: "${prompt}"` : prompt
            }
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
