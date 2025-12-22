import { useRef, useState } from 'react';
import type { MessageNode, ChatState } from '../types';
import { ChatNode } from './ChatNode';

const COLUMN_WIDTH = 650;
const NODE_SPACING = 60;
const NODE_HEIGHT_ESTIMATE = 150;
const NODE_WIDTH = 550;

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

    // Use manual override if it exists, otherwise use calculated position
    const currentX = node.position?.x ?? startX;
    const currentY = node.position?.y ?? startY;
    results[nodeId] = { x: currentX, y: currentY };

    let pillarHeight = NODE_HEIGHT_ESTIMATE + NODE_SPACING;
    let maxChildY = currentY + pillarHeight;

    if (!node.isCollapsed) {
        // Vertical children (same pillar)
        const verticalChildren = node.childrenIds.filter(id => !nodes[id].isBranch);
        let nextVSpace = currentY + pillarHeight;
        for (const childId of verticalChildren) {
            const heightUsed = calculateLayout(childId, nodes, currentX, nextVSpace, results);
            nextVSpace += heightUsed + NODE_SPACING;
            if (nextVSpace > maxChildY) maxChildY = nextVSpace;
        }

        // Horizontal branches (new column to the right)
        const horizontalChildren = node.childrenIds.filter(id => !!nodes[id].isBranch);
        let branchStartY = currentY;
        for (const childId of horizontalChildren) {
            const heightUsed = calculateLayout(childId, nodes, currentX + COLUMN_WIDTH, branchStartY, results);
            branchStartY += heightUsed + (NODE_SPACING * 2);
            if (branchStartY > maxChildY) maxChildY = branchStartY;
        }
    }

    return Math.max(maxChildY - currentY, NODE_HEIGHT_ESTIMATE);
}

interface CanvasProps {
    state: ChatState;
    onBranch: (parentId: string, highlightedText: string, prompt: string) => void;
    onReply: (parentId: string, prompt: string) => void;
    onToggleCollapse: (id: string) => void;
    onMoveNode: (id: string, x: number, y: number) => void;
}

export const MindmapCanvas: React.FC<CanvasProps> = ({ state, onBranch, onReply, onToggleCollapse, onMoveNode }) => {
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 100, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
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
        // Drag if middle click OR left click directly on the canvas background
        if (e.button === 1 || (e.button === 0 && e.target === e.currentTarget)) {
            setIsDragging(true);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setOffset(o => ({ x: o.x + e.movementX, y: o.y + e.movementY }));
        } else if (draggedNodeId) {
            // Adjust movement by scale to keep node under cursor
            onMoveNode(draggedNodeId,
                (state.nodes[draggedNodeId].position?.x ?? layout[draggedNodeId].x) + e.movementX / scale,
                (state.nodes[draggedNodeId].position?.y ?? layout[draggedNodeId].y) + e.movementY / scale
            );
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setDraggedNodeId(null);
    };

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
                            const startX = parentPos.x + NODE_WIDTH;
                            const startY = parentPos.y + 50;
                            const endX = pos.x;
                            const endY = pos.y + 50;
                            d = `M ${startX} ${startY} C ${startX + 30} ${startY}, ${endX - 30} ${endY}, ${endX} ${endY}`;
                        } else {
                            // Straight line downwards - from bottom center to top center
                            const startX = parentPos.x + (NODE_WIDTH / 2);
                            const startY = parentPos.y + NODE_HEIGHT_ESTIMATE;
                            const endX = pos.x + (NODE_WIDTH / 2);
                            const endY = pos.y;
                            d = `M ${startX} ${startY} L ${endX} ${endY}`;
                        }

                        return (
                            <path
                                key={`link-${childId}`}
                                d={d}
                                stroke={isHorizontal ? "rgba(59, 130, 246, 0.7)" : "rgba(82, 82, 91, 0.8)"}
                                strokeWidth="4"
                                fill="none"
                            />
                        );
                    })}
                </svg>

                {/* Render Nodes in a flat layer */}
                {Object.entries(layout).map(([id, pos]) => {
                    const node = state.nodes[id];
                    const horizontalChildren = node.childrenIds.filter(cid => !!state.nodes[cid].isBranch);
                    const isActive = activeNodeId === id;

                    return (
                        <div
                            key={id}
                            className="absolute transition-[z-index] duration-300"
                            style={{
                                left: pos.x,
                                top: pos.y,
                                zIndex: isActive ? 50 : 10
                            }}
                        >
                            <ChatNode
                                node={node}
                                branchChildren={horizontalChildren.map(cid => state.nodes[cid])}
                                onBranch={onBranch}
                                onReply={onReply}
                                onToggleCollapse={onToggleCollapse}
                                onActive={setActiveNodeId}
                                onDragStart={() => setDraggedNodeId(id)}
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

            <div className="absolute top-4 left-4 text-[10px] text-zinc-600 pointer-events-none uppercase font-black tracking-widest">
                Ctrl + Scroll to Zoom | Left Click & Drag Background to Pan
            </div>
        </div>
    );
};
