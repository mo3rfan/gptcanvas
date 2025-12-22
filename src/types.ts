export type Role = 'user' | 'assistant';

export interface MessageNode {
    id: string;
    role: Role;
    content: string;
    parentId: string | null;
    highlightedText?: string;
    isBranch?: boolean;
    childrenIds: string[];
    isCollapsed: boolean;
    height?: number;
    position?: { x: number; y: number };
}

export interface TokenStats {
    input: number;
    output: number;
    total: number;
}

export interface ChatState {
    nodes: Record<string, MessageNode>;
    rootId: string | null;
    selectedModel: string;
    apiUrl: string;
    apiKey: string;
    tokenStats: TokenStats;
}

export interface Settings {
    apiUrl: string;
    apiKey: string;
    model: string;
}
