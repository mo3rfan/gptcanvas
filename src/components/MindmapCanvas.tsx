import { useRef, useState } from 'react';
import type { MessageNode, ChatState } from '../types';
import { ChatNode } from './ChatNode';

const COLUMN_WIDTH = 650;
const NODE_SPACING = 40;
const NODE_HEIGHT_ESTIMATE = 200;

/**
 * Recursively calculates coordinates for the tree.
 * A "Pillar" is a vertical stack of nodes.
 * A "Branch" is a new pillar to the right.
 */
function calculateLayout(
    nodeId: string,
    nodes: Record<string, MessageNode>,
    startX: number,
    startY: number,
    results: Record<string, { x: number, y: number }>
): number {
    const node = nodes[nodeId];
    if (!node) return 0;

    results[nodeId] = { x: startX, y: startY };

    let currentY = startY + NODE_HEIGHT_ESTIMATE + NODE_SPACING;
    let maxChildY = currentY;

    if (!node.isCollapsed) {
        // Vertical children (same pillar) - nodes that are NOT explicit branches
        const verticalChildren = node.childrenIds.filter(id => !nodes[id].isBranch);
        for (const childId of verticalChildren) {
            const heightUsed = calculateLayout(childId, nodes, startX, currentY, results);
            currentY += heightUsed + NODE_SPACING;
            if (currentY > maxChildY) maxChildY = currentY;
        }

        // Horizontal branches (new column to the right) - nodes that ARE explicit branches
        const horizontalChildren = node.childrenIds.filter(id => !!nodes[id].isBranch);
        let branchStartY = startY;
        for (const childId of horizontalChildren) {
            // New Pillar starts at current startX + offset
            const heightUsed = calculateLayout(childId, nodes, startX + COLUMN_WIDTH, branchStartY, results);
            branchStartY += heightUsed + (NODE_SPACING * 2);
            if (branchStartY > maxChildY) maxChildY = branchStartY;
        }
    }

    return Math.max(maxChildY - startY, NODE_HEIGHT_ESTIMATE);
}

interface CanvasProps {
    state: ChatState;
    onBranch: (parentId: string, highlightedText: string, prompt: string) => void;
    onReply: (parentId: string, prompt: string) => void;
    onToggleCollapse: (id: string) => void;
}

export const MindmapCanvas: React.FC<CanvasProps> = ({ state, onBranch, onReply, onToggleCollapse }) => {
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 100, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);

    // Calculate layout positions
    const layout: Record<string, { x: number, y: number }> = {};
    if (state.rootId) {
        calculateLayout(state.rootId, state.nodes, 0, 0, layout);
    }

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey) {
            const zoomSpeed = 0.001;
            setScale(s => Math.min(Math.max(s - e.deltaY * zoomSpeed, 0.1), 3));
        } else {
            setOffset(o => ({ x: o.x - e.deltaX, y: o.y - e.deltaY }));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            setIsDragging(true);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setOffset(o => ({ x: o.x + e.movementX, y: o.y + e.movementY }));
        }
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
        <div
            ref={canvasRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="flex-1 bg-zinc-950 overflow-hidden cursor-grab active:cursor-grabbing relative"
        >
            <div
                className="absolute transition-transform duration-75 ease-out origin-top-left"
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                }}
            >
                {/* Draw SVG Connectors in a flat layer background */}
                <svg className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 0 }}>
                    {Object.entries(layout).map(([childId, pos]) => {
                        const child = state.nodes[childId];
                        const parentId = child.parentId;
                        if (!parentId || !layout[parentId]) return null;

                        const parentPos = layout[parentId];
                        const isHorizontal = !!child.isBranch;

                        // Calculate path
                        let d = "";
                        if (isHorizontal) {
                            // Curve from parent's right to child's left
                            const startX = parentPos.x + 550; // Node width
                            const startY = parentPos.y + 40;
                            const endX = pos.x;
                            const endY = pos.y + 40;
                            d = `M ${startX} ${startY} C ${startX + 50} ${startY}, ${endX - 50} ${endY}, ${endX} ${endY}`;
                        } else {
                            // Straight line downwards
                            const startX = parentPos.x + 100;
                            const startY = parentPos.y + 150; // Node approximate bottom
                            const endX = pos.x + 100;
                            const endY = pos.y;
                            d = `M ${startX} ${startY} L ${endX} ${endY}`;
                        }

                        return (
                            <path
                                key={`link-${childId}`}
                                d={d}
                                stroke={isHorizontal ? "rgba(59, 130, 246, 0.4)" : "rgba(39, 39, 42, 0.8)"}
                                strokeWidth="2"
                                fill="none"
                                strokeDasharray={isHorizontal ? "4 2" : "none"}
                            />
                        );
                    })}
                </svg>

                {/* Render Nodes in a flat layer */}
                {Object.entries(layout).map(([id, pos]) => {
                    const node = state.nodes[id];
                    const horizontalChildren = node.childrenIds.filter(cid => !!state.nodes[cid].isBranch);

                    return (
                        <div
                            key={id}
                            className="absolute"
                            style={{
                                left: pos.x,
                                top: pos.y,
                                zIndex: 10
                            }}
                        >
                            <ChatNode
                                node={node}
                                branchChildren={horizontalChildren.map(cid => state.nodes[cid])}
                                onBranch={onBranch}
                                onReply={onReply}
                                onToggleCollapse={onToggleCollapse}
                            />
                        </div>
                    );
                })}
            </div>

            {/* UI Overlay Controls */}
            <div className="absolute bottom-4 right-4 flex gap-2">
                <button
                    onClick={() => setScale(s => Math.min(s + 0.1, 3))}
                    className="w-10 h-10 bg-zinc-900 border border-zinc-700 text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >+</button>
                <button
                    onClick={() => setScale(s => Math.max(s - 0.1, 0.1))}
                    className="w-10 h-10 bg-zinc-800 text-white rounded-full flex items-center justify-center border border-zinc-700 hover:bg-zinc-700"
                >-</button>
                <button
                    onClick={() => { setScale(1); setOffset({ x: 50, y: 50 }); }}
                    className="px-3 h-10 bg-zinc-800 text-white rounded-lg flex items-center justify-center border border-zinc-700 hover:bg-zinc-700 text-xs"
                >Reset View</button>
            </div>

            <div className="absolute top-4 left-4 text-[10px] text-zinc-600 pointer-events-none">
                Ctrl + Scroll to Zoom | Middle Click / Alt + Drag to Pan
            </div>
        </div>
    );
};
