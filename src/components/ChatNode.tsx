import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { MessageNode } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';

interface ChatNodeProps {
    node: MessageNode;
    branchChildren: MessageNode[];
    onBranch: (parentId: string, highlightedText: string, prompt: string) => void;
    onReply: (parentId: string, prompt: string) => void;
    onToggleCollapse: (id: string) => void;
    onActive?: (id: string | null) => void;
    onDragStart?: () => void;
    onUpdateHeight?: (id: string, height: number) => void;
}

export const ChatNode: React.FC<ChatNodeProps> = ({
    node,
    branchChildren,
    onBranch,
    onReply,
    onToggleCollapse,
    onActive,
    onDragStart,
    onUpdateHeight,
}) => {
    const [selection, setSelection] = useState<{ text: string; rect: DOMRect } | null>(null);
    const [showInput, setShowInput] = useState(false);
    const [isBranching, setIsBranching] = useState(false);
    const [branchText, setBranchText] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, show: boolean }>({ x: 0, y: 0, show: false });
    const contentRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const thinkingRef = useRef<HTMLDivElement>(null);

    // Track actual height for mindmap layout
    useEffect(() => {
        if (!onUpdateHeight || !containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = Math.ceil(entry.contentRect.height + 40); // 40 for padding/border estimate if needed, or entry.borderBoxSize
                // Use borderBoxSize if available for better accuracy
                const borderBoxHeight = entry.borderBoxSize?.[0]?.blockSize ?? height;
                onUpdateHeight(node.id, Math.ceil(borderBoxHeight));
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [node.id, onUpdateHeight]);

    const hasThinkTag = node.content.includes('<think>');
    const isThinkingDone = node.content.includes('</think>');

    // Auto-scroll thinking box while streaming
    useEffect(() => {
        if (!isThinkingDone && thinkingRef.current) {
            thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
        }
    }, [node.content, isThinkingDone]);

    // Auto-collapse when done
    useEffect(() => {
        if (isThinkingDone) {
            setIsThinkingExpanded(false);
        } else if (hasThinkTag) {
            setIsThinkingExpanded(true);
        }
    }, [isThinkingDone, hasThinkTag]);

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

    const handleContextMenu = (e: React.MouseEvent) => {
        const sel = window.getSelection();
        if (sel && sel.toString().trim() && contentRef.current?.contains(sel.anchorNode)) {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, show: true });
        }
    };

    const closeContextMenu = () => {
        setContextMenu(prev => ({ ...prev, show: false }));
    };

    useEffect(() => {
        const handleGlobalClick = () => closeContextMenu();
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    const startFollowUp = (branch: boolean) => {
        setIsBranching(branch);
        setBranchText(branch ? selection?.text || null : null);
        setShowInput(true);
        setSelection(null);
        closeContextMenu();
        onActive?.(node.id);
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
        onActive?.(null);
    };

    const memoizedContent = React.useMemo(() => {
        let content = node.content;
        let thoughtContent = '';

        if (hasThinkTag) {
            const parts = content.split('</think>');
            if (parts.length > 1) {
                thoughtContent = parts[0].replace('<think>', '').trim();
                content = parts.slice(1).join('</think>').trim();
            } else {
                thoughtContent = content.replace('<think>', '').trim();
                content = '';
            }
        }

        const handleTextHighlights = (children: any): any => {
            if (typeof children === 'string') {
                let parts: (string | React.ReactNode)[] = [children];
                const sortedBranches = [...branchChildren].sort((a, b) => (b.highlightedText?.length || 0) - (a.highlightedText?.length || 0));

                sortedBranches.forEach(branch => {
                    if (!branch.highlightedText) return;

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
                });
                return parts;
            }
            if (Array.isArray(children)) {
                return children.map((child, idx) => (
                    <React.Fragment key={idx}>
                        {handleTextHighlights(child)}
                    </React.Fragment>
                ));
            }
            return children;
        };

        return (
            <>
                {hasThinkTag && (
                    <div className="mb-4 border border-zinc-700/50 rounded-lg overflow-hidden bg-zinc-950/50">
                        <button
                            onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors bg-zinc-900/30 border-b border-zinc-800/50"
                        >
                            <span className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${isThinkingDone ? 'bg-zinc-600' : 'bg-blue-500 animate-pulse'}`} />
                                {isThinkingDone ? "Thought Process" : "Thinking..."}
                            </span>
                            <span className="opacity-50">{isThinkingExpanded ? "Collapse" : "Expand"}</span>
                        </button>

                        {(isThinkingExpanded || !isThinkingDone) && (
                            <div
                                ref={thinkingRef}
                                className={`p-4 text-[13px] font-mono leading-relaxed text-zinc-400 overflow-y-auto transition-all duration-300 ease-in-out scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent ${isThinkingExpanded ? 'max-h-[300px]' : 'max-h-[100px]'
                                    }`}
                                style={{
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: '#3f3f46 transparent'
                                }}
                            >
                                {thoughtContent}
                            </div>
                        )}
                    </div>
                )}

                <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                        code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                                <div className="my-4 rounded-lg overflow-hidden border border-zinc-700 shadow-2xl">
                                    <div className="bg-zinc-800 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 flex justify-between items-center border-b border-zinc-700">
                                        <span>{match[1]}</span>
                                        <span className="opacity-50">Code Snippet</span>
                                    </div>
                                    <SyntaxHighlighter
                                        {...props}
                                        style={vscDarkPlus}
                                        language={match[1]}
                                        PreTag="div"
                                        customStyle={{ margin: 0, padding: '1rem', background: '#09090b', fontSize: '13px' }}
                                    >
                                        {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                </div>
                            ) : (
                                <code className={`${className} bg-zinc-800 px-1.5 py-0.5 rounded text-blue-300 font-mono text-[13px] border border-zinc-700`} {...props}>
                                    {handleTextHighlights(children)}
                                </code>
                            );
                        },
                        p: ({ children }: any) => <p className="mb-4 last:mb-0">{handleTextHighlights(children)}</p>,
                        li: ({ children }: any) => <li className="mb-1">{handleTextHighlights(children)}</li>,
                        h1: ({ children }: any) => <h1 className="text-2xl font-bold mb-4">{handleTextHighlights(children)}</h1>,
                        h2: ({ children }: any) => <h2 className="text-xl font-bold mb-3">{handleTextHighlights(children)}</h2>,
                        h3: ({ children }: any) => <h3 className="text-lg font-bold mb-2">{handleTextHighlights(children)}</h3>,
                        h4: ({ children }: any) => <h4 className="text-base font-bold mb-2">{handleTextHighlights(children)}</h4>,
                        h5: ({ children }: any) => <h5 className="text-sm font-bold mb-1">{handleTextHighlights(children)}</h5>,
                        h6: ({ children }: any) => <h6 className="text-xs font-bold mb-1">{handleTextHighlights(children)}</h6>,
                    }}
                >
                    {content}
                </ReactMarkdown>
            </>
        );
    }, [node.content, branchChildren, isThinkingExpanded, isThinkingDone, hasThinkTag, onToggleCollapse]);

    return (
        <div className="flex flex-col gap-2 w-[550px] group/node">
            <div
                ref={containerRef}
                className={`p-5 rounded-xl shadow-2xl border-2 relative transition-all duration-300 w-full min-h-[150px] flex flex-col ${node.role === 'user'
                    ? 'bg-blue-600/90 border-blue-400 text-white shadow-blue-900/20'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-100 shadow-black/40'
                    }`}
            >
                {/* Drag Handle */}
                <div
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        onDragStart?.();
                    }}
                    className="absolute -top-3 -left-3 w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/node:opacity-100 transition-opacity hover:bg-zinc-700 text-zinc-400 hover:text-white z-30"
                    title="Drag to rearrange"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </div>

                {node.highlightedText && (
                    <div className="flex items-center gap-2 text-[10px] uppercase font-black text-zinc-500 mb-2 tracking-widest border-b border-zinc-800 pb-2">
                        <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">Context</span>
                        <span className="truncate max-w-[200px]">"{node.highlightedText}"</span>
                    </div>
                )}

                <div
                    ref={contentRef}
                    onMouseUp={handleMouseUp}
                    onContextMenu={handleContextMenu}
                    className="text-[15px] leading-relaxed cursor-text selection:bg-blue-500/30 whitespace-normal font-medium markdown-container max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#3f3f46 transparent'
                    }}
                >
                    {memoizedContent}
                </div>

                {contextMenu.show && createPortal(
                    <div
                        className="fixed z-[1000] bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl py-1 min-w-[180px] animate-in fade-in zoom-in duration-150"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        <button
                            onClick={() => startFollowUp(true)}
                            className="w-full text-left px-4 py-2 text-[12px] font-bold text-zinc-100 hover:bg-blue-600 transition-colors flex items-center gap-2"
                        >
                            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            Branch from selection
                        </button>
                    </div>,
                    document.body
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
                    ? "absolute left-[calc(100%+2rem)] -top-16 w-[450px] z-[100] animate-in fade-in slide-in-from-left-6 duration-300"
                    : "mt-12 animate-in fade-in slide-in-from-top-4 duration-300"
                }>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3 bg-zinc-900 border-2 border-blue-500/40 p-4 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-xl relative">
                        <button
                            type="button"
                            onClick={() => setShowInput(false)}
                            className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors p-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                                {isBranching ? "New Branch Follow-up" : "Continuing Thread"}
                            </span>
                            <span className="text-[8px] text-zinc-600 font-bold ml-auto mr-6 uppercase tracking-widest">
                                Press ESC to Cancel
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
                                    if (e.key === 'Escape') {
                                        setShowInput(false);
                                        onActive?.(null);
                                    } else if (e.key === 'Enter' && !e.shiftKey) {
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
