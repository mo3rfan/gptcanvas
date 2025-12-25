import React from 'react';
import type { MessageNode } from '../types';
import { nodeToString } from './nodeToString';

interface HighlightedTextProps {
    text: React.ReactNode;
    branchChildren: MessageNode[];
    onToggleCollapse: (id: string) => void;
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({ text, branchChildren, onToggleCollapse }) => {
    const textAsString = nodeToString(text);
    let parts: (string | React.ReactNode)[] = [textAsString];
    const sortedBranches = [...branchChildren].sort((a, b) => (b.highlightedText?.length || 0) - (a.highlightedText?.length || 0));

    for (const branch of sortedBranches) {
        if (!branch.highlightedText) continue;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (typeof part !== 'string') continue;

            const index = part.toLowerCase().indexOf(branch.highlightedText.toLowerCase());
            if (index !== -1) {
                const before = part.slice(0, index);
                const matchText = part.slice(index, index + branch.highlightedText.length);
                const after = part.slice(index + branch.highlightedText.length);

                parts.splice(i, 1,
                    before,
                    <button
                        key={branch.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleCollapse(branch.id);
                        }}
                        className={`px-1 rounded transition-all inline-block leading-relaxed cursor-pointer font-bold ${branch.isCollapsed
                            ? 'bg-zinc-700/30 hover:bg-zinc-600/50 text-zinc-500 border border-zinc-700/50'
                            : 'bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                            }`}
                        title={branch.isCollapsed ? "Expand branch" : "Collapse branch"}
                    >
                        {matchText}
                    </button>,
                    after
                );
                break;
            }
        }
    }
    return <>{parts}</>;
};
