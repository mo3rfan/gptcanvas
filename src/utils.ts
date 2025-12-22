// Simple token estimation: ~4 characters per token
export const estimateTokens = (text: string): number => {
    return Math.ceil(text.length / 4);
};

export const simulateStreaming = async (
    content: string,
    onToken: (token: string) => void
) => {
    const tokens = content.split(' ');
    for (const token of tokens) {
        onToken(token + ' ');
        // Faster streaming: 10-30ms instead of 50-100ms
        await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 20));
    }
};

export const mockLLMResponse = (prompt: string, context?: string): string => {
    if (context) {
        return `<think>
The user is asking a follow-up about "${prompt}" in the context of "${context}".
I should provide a technical deep-dive into the mathematical and programmatic aspects.
Calculating relationship...
Optimizing response structure...
</think>

### Follow-up on: *"${context}"*

Here is a technical detail related to **${prompt}**:

#### Code Example (Python)
\`\`\`python
def calculate_gravity(mass, distance):
    # Newton's law of universal gravitation
    G = 6.67430e-11
    return G * mass / (distance ** 2)
\`\`\`

#### Mathematical Physics
The formula for gravitational attraction is:
$$F = G \\frac{m_1 m_2}{r^2}$$

This demonstrates how the branched context relates to the core logic.`;
    }
    return `<think>
Processing request for: "${prompt}"
Analyzing GPTCanvas core architecture v1.7.0...
Generating rich content response with Markdown and LaTeX...
Complete.
</think>

### Hello! This is a rich response to: **"${prompt}"**

You can write complex math like the **Quadratic Formula**:
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

And snippets of code:
\`\`\`javascript
const gptCanvas = {
  version: "1.7.0",
  features: ["Markdown", "LaTeX", "ThinkingMode"]
};
console.log("Thinking mode active!");
\`\`\`

Highlight any text to start a branch!`;
};
export const fetchLLMResponse = async (
    apiUrl: string,
    apiKey: string,
    model: string,
    prompt: string,
    context: string | null,
    onToken: (token: string) => void
) => {
    const messages = [];

    if (context) {
        messages.push({
            role: "system",
            content: `You are a helpful assistant. Provide a concise follow-up based on the following context: "${context}". Use Markdown and LaTeX where appropriate.`
        });
    }

    messages.push({ role: "user", content: prompt });

    const isAzure = apiUrl.includes("azure.com");
    let finalUrl = apiUrl;
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (isAzure) {
        headers["api-key"] = apiKey;
        // Azure AI Inference often needs /chat/completions but sometimes the user provides the full base
        if (!finalUrl.includes("/chat/completions")) {
            finalUrl = `${finalUrl.replace(/\/$/, "")}/chat/completions`;
        }
        // Append api-version if not present
        if (!finalUrl.includes("api-version=")) {
            finalUrl += (finalUrl.includes("?") ? "&" : "?") + "api-version=2024-05-01-preview";
        }
    } else {
        headers["Authorization"] = `Bearer ${apiKey}`;
        headers["HTTP-Referer"] = "https://gptcanvas.local"; // Required by OpenRouter
        headers["X-Title"] = "GPTCanvas"; // Required by OpenRouter
        if (!finalUrl.includes("/chat/completions")) {
            finalUrl = `${finalUrl.replace(/\/$/, "")}/chat/completions`;
        }
    }

    try {
        const response = await fetch(finalUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
                model,
                messages,
                stream: true,
            }),
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) return;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
                if (line.trim().startsWith("data: ")) {
                    const data = line.trim().slice(6);
                    if (data === "[DONE]") break;
                    try {
                        const json = JSON.parse(data);
                        const token = json.choices[0]?.delta?.content || "";
                        if (token) onToken(token);
                    } catch (e) {
                        // Handle potential partial JSON or other errors
                    }
                }
            }
        }
    } catch (error) {
        console.error("LLM Fetch Error:", error);
        onToken(`\n\n**Error:** ${error instanceof Error ? error.message : "Failed to connect to the API. Check your settings and API key."}`);
    }
};
