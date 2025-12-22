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
