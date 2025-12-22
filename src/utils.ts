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
        return `### Follow-up on: *"${context}"*

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
    return `### Hello! This is a rich response to: **"${prompt}"**

You can write complex math like the **Quadratic Formula**:
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

And snippets of code:
\`\`\`javascript
const gptCanvas = {
  version: "1.3.0",
  features: ["Markdown", "LaTeX", "Highlighter"]
};
console.log("Ready for rich content!");
\`\`\`

Highlight any text to start a branch!`;
};
export const fetchLLMResponse = async (
    apiUrl: string,
    apiKey: string,
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

    try {
        const response = await fetch(`${apiUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo", // Default or user choice
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
                if (line.startsWith("data: ")) {
                    const data = line.slice(6);
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
