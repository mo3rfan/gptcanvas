export const simulateStreaming = async (
    content: string,
    onToken: (token: string) => void
) => {
    const tokens = content.split(' ');
    for (const token of tokens) {
        onToken(token + ' ');
        await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 50));
    }
};

export const mockLLMResponse = (prompt: string, context?: string): string => {
    if (context) {
        return `Based on "${context}", here is more info: The topic of ${prompt} is very interesting. This branched conversation explores specific details further.`;
    }
    return `This is a mock response to: "${prompt}". You can highlight any part of this text to ask a follow-up question.`;
};
