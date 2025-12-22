import { useState, useRef, type ReactNode } from 'react';
import type { MessageNode } from '../types';

interface ChatNodeProps {
    node: MessageNode;
    branchChildren: MessageNode[];
    onBranch: (parentId: string, highlightedText: string, prompt: string) => void;
    onReply: (parentId: string, prompt: string) => void;
    onToggleCollapse: (id: string) => void;
}

export const ChatNode: React.FC<ChatNodeProps> = ({
    node,
    branchChildren,
    onBranch,
    onReply,
    onToggleCollapse,
}) => {
    const [selection, setSelection] = useState<{ text: string; rect: DOMRect } | null>(null);
    const [showInput, setShowInput] = useState(false);
    const [isBranching, setIsBranching] = useState(false);
    const [branchText, setBranchText] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const contentRef = useRef<HTMLDivElement>(null);

    const handleMouseUp = () => {
        const sel = window.getSelection();
        if (sel && sel.toString().trim() && contentRef.current?.contains(sel.anchorNode)) {
            const range = sel.getRangeAt(0);
            setSelection({
                text: sel.toString(),
                rect: range.getBoundingClientRect(),
            });
        } else {
            setSelection(null);
        }
    };

    const startFollowUp = (branch: boolean) => {
        setIsBranching(branch);
        setBranchText(branch ? selection?.text || null : null); // Capture text before clearing selection
        setShowInput(true);
        setSelection(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        if (isBranching && branchText) {
            onBranch(node.id, branchText, input);
        } else {
            onReply(node.id, input);
        }
        setInput('');
        setShowInput(false);
        setBranchText(null);
    };

    const renderContent = () => {
        const parts: (string | ReactNode)[] = [node.content];

        // Sort branches by length of highlighted text descending to avoid nested match issues
        const sortedBranches = [...branchChildren].sort((a, b) => (b.highlightedText?.length || 0) - (a.highlightedText?.length || 0));

        sortedBranches.forEach(branch => {
            if (!branch.highlightedText) return;

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (typeof part !== 'string') continue;

                const index = part.toLowerCase().indexOf(branch.highlightedText.toLowerCase());
                if (index !== -1) {
                    const before = part.slice(0, index);
                    const match = part.slice(index, index + branch.highlightedText.length);
                    const after = part.slice(index + branch.highlightedText.length);

                    parts.splice(i, 1,
                        before,
                        <button
                            key={branch.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleCollapse(branch.id);
                            }}
                            className={`px-1 rounded transition-all inline-block leading-relaxed cursor-pointer font-medium ${branch.isCollapsed
                                ? 'bg-zinc-700/30 hover:bg-zinc-600/50 text-zinc-500 border border-transparent'
                                : 'bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                                }`}
                            title={branch.isCollapsed ? "Expand branch" : "Collapse branch"}
                        >
                            {match}
                        </button>,
                        after
                    );
                    break;
                }
            }
        });

        return parts;
    };

    return (
        <div className="flex flex-col gap-2 min-w-[350px] max-w-[550px] group/node">
            <div
                className={`p-5 rounded-xl shadow-2xl border-2 relative transition-all duration-300 ${node.role === 'user'
                    ? 'bg-blue-600/90 border-blue-400 text-white shadow-blue-900/20'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-100 shadow-black/40'
                    }`}
            >
                {node.highlightedText && (
                    <div className="flex items-center gap-2 text-[10px] uppercase font-black text-zinc-500 mb-2 tracking-widest border-b border-zinc-800 pb-2">
                        <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">Context</span>
                        <span className="truncate max-w-[200px]">"{node.highlightedText}"</span>
                    </div>
                )}

                <div
                    ref={contentRef}
                    onMouseUp={handleMouseUp}
                    className="text-[15px] leading-relaxed cursor-text selection:bg-blue-500/30 whitespace-pre-wrap font-medium"
                >
                    {renderContent()}
                </div>

                {selection && (
                    <div
                        className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 animate-in fade-in zoom-in duration-200"
                        style={{ zIndex: 50 }}
                    >
                        <button
                            onClick={() => startFollowUp(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-tighter px-4 py-2 rounded-full shadow-[0_4px_20px_rgba(37,99,235,0.4)] transition-all hover:scale-105 active:scale-95"
                        >
                            Branch from selection
                        </button>
                    </div>
                )}

                <div className="absolute -bottom-8 right-0 flex gap-4 opacity-0 group-hover/node:opacity-100 transition-opacity">
                    {node.childrenIds.length > 0 && (
                        <button
                            onClick={() => onToggleCollapse(node.id)}
                            className="text-[10px] text-zinc-500 hover:text-blue-400 uppercase font-black tracking-widest transition-colors"
                        >
                            {node.isCollapsed ? 'Expand Tree' : 'Collapse Tree'}
                        </button>
                    )}
                    <button
                        onClick={() => startFollowUp(false)}
                        className="text-[10px] text-zinc-500 hover:text-blue-400 uppercase font-black tracking-widest transition-colors"
                    >
                        Direct Reply
                    </button>
                </div>
            </div>

            {showInput && (
                <div className={isBranching
                    ? "absolute left-[calc(100%+2rem)] top-0 w-[450px] z-20 animate-in fade-in slide-in-from-left-6 duration-300"
                    : "mt-12 animate-in fade-in slide-in-from-top-4 duration-300"
                }>
                    {isBranching && (
                        <div className="absolute -left-8 top-10 w-8 h-0.5 bg-blue-500/40" />
                    )}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3 bg-zinc-900 border-2 border-blue-500/40 p-4 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-md">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                                {isBranching ? "New Branch Follow-up" : "Continuing Thread"}
                            </span>
                        </div>
                        <div className="flex gap-3 items-end">
                            <textarea
                                autoFocus
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={isBranching ? "Ask about the selection..." : "Type your reply..."}
                                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-[14px] text-zinc-100 h-28 resize-none focus:outline-none focus:border-blue-500/50 transition-colors"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit(e as any);
                                    }
                                }}
                            />
                            <button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest h-28 transition-all hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                            >
                                Send
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
