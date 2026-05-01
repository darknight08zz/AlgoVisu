"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { VisualizerLayout } from "../../../components/visualizer-layout"
import { Button } from "../../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Slider } from "../../../components/ui/slider"
import { Badge } from "../../../components/ui/badge"
import { Play, RotateCcw, Eraser, MousePointer2 } from "lucide-react"

// Types
type NodeType = "start" | "target" | "wall" | "default" | "visited" | "path"
type Algorithm = "dijkstra" | "astar" | "bfs" | "dfs"

interface Node {
    row: number
    col: number
    type: NodeType
    distance: number
    isVisited: boolean
    previousNode: Node | null
    totalDistance: number // For A* (f = g + h)
    heuristic: number     // For A* (h)
}

interface VisitedStep {
    node: Node
    auxSize: number
    topNode: Node | null
    openSetSnapshot: Node[] // Added for Aux Data Structure visualizer
}

const ROWS = 25
const COLS = 50

// Heuristics for A*
const manhattanDistance = (node: Node, target: Node) => {
    return Math.abs(node.row - target.row) + Math.abs(node.col - target.col)
}

export default function PathfindingVisualizer() {
    // State
    const [grid, setGrid] = useState<Node[][]>([])
    const [isMousePressed, setIsMousePressed] = useState(false)
    const [nodeTypeToPlace, setNodeTypeToPlace] = useState<"wall" | "start" | "target">("wall")
    const [startNodePos, setStartNodePos] = useState({ row: 12, col: 10 })
    const [targetNodePos, setTargetNodePos] = useState({ row: 12, col: 40 })
    const [algorithm, setAlgorithm] = useState<Algorithm>("dijkstra")
    const [isPlaying, setIsPlaying] = useState(false)
    const [speed, setSpeed] = useState([10])
    const [stats, setStats] = useState({ visited: 0, pathLength: 0, time: 0 })

    // Initialize Grid
    const createNode = (row: number, col: number): Node => {
        return {
            row,
            col,
            type: "default",
            distance: Infinity,
            isVisited: false,
            previousNode: null,
            totalDistance: Infinity,
            heuristic: 0
        }
    }

    const initializeGrid = useCallback((resetWalls = true) => {
        const newGrid: Node[][] = []
        for (let r = 0; r < ROWS; r++) {
            const currentRow: Node[] = []
            for (let c = 0; c < COLS; c++) {
                let node = createNode(r, c)
                if (!resetWalls && grid[r] && grid[r][c].type === "wall") {
                    node.type = "wall"
                }
                if (r === startNodePos.row && c === startNodePos.col) node.type = "start"
                if (r === targetNodePos.row && c === targetNodePos.col) node.type = "target"
                currentRow.push(node)
            }
            newGrid.push(currentRow)
        }
        setGrid(newGrid)
        setStats({ visited: 0, pathLength: 0, time: 0 })
    }, [startNodePos, targetNodePos]) // Removed 'grid' dependency to prevent feedback loop

    // Only run once on mount
    useEffect(() => {
        initializeGrid(true)
    }, [])

    // Mouse Handlers
    const handleMouseDown = (row: number, col: number) => {
        if (isPlaying) return
        setIsMousePressed(true)
        handleNodeClick(row, col)
    }

    const handleMouseEnter = (row: number, col: number) => {
        if (!isMousePressed || isPlaying) return
        handleNodeClick(row, col)
    }

    const handleMouseUp = () => {
        setIsMousePressed(false)
    }

    const handleNodeClick = (row: number, col: number) => {
        // Prevent overriding start/target unless logic handles dragging them (simplified here to Walls only)
        if ((row === startNodePos.row && col === startNodePos.col) ||
            (row === targetNodePos.row && col === targetNodePos.col)) {
            return
        }

        const newGrid = [...grid]
        const node = newGrid[row][col]

        // Toggle Wall
        if (node.type === "wall") {
            node.type = "default"
        } else if (node.type === "default" || node.type === "visited" || node.type === "path") {
            node.type = "wall"
        }
        setGrid(newGrid)
    }

    // ALGORITHMS
    const getNeighbors = (node: Node, grid: Node[][]) => {
        const neighbors: Node[] = []
        const { row, col } = node
        if (row > 0) neighbors.push(grid[row - 1][col])
        if (row < ROWS - 1) neighbors.push(grid[row + 1][col])
        if (col > 0) neighbors.push(grid[row][col - 1])
        if (col < COLS - 1) neighbors.push(grid[row][col + 1])
        return neighbors.filter(n => n.type !== "wall")
    }

    const runDijkstra = async (grid: Node[][], startNode: Node, targetNode: Node) => {
        startNode.distance = 0
        let openSet = [startNode]
        const visitedNodesInOrder: VisitedStep[] = []

        while (openSet.length) {
            openSet.sort((a, b) => a.distance - b.distance)
            const closestNode = openSet.shift()
            if (!closestNode) break
            if (closestNode.isVisited) continue

            closestNode.isVisited = true
            visitedNodesInOrder.push({
                node: closestNode,
                auxSize: openSet.length,
                topNode: openSet[0] || null,
                openSetSnapshot: openSet.slice(0, 15) // Capture top 15 elements for UI
            })

            if (closestNode === targetNode) return visitedNodesInOrder

            const neighbors = getNeighbors(closestNode, grid)
            for (const neighbor of neighbors) {
                if (!neighbor.isVisited) {
                    const newDist = closestNode.distance + 1
                    if (newDist < neighbor.distance) {
                        neighbor.distance = newDist
                        neighbor.previousNode = closestNode
                        if (!openSet.includes(neighbor)) {
                            openSet.push(neighbor)
                        }
                    }
                }
            }
        }
        return visitedNodesInOrder
    }

    const runAStar = async (grid: Node[][], startNode: Node, targetNode: Node) => {
        startNode.distance = 0
        startNode.totalDistance = manhattanDistance(startNode, targetNode)

        let openSet = [startNode]
        const visitedNodesInOrder: VisitedStep[] = []

        while (openSet.length) {
            openSet.sort((a, b) => a.totalDistance - b.totalDistance)
            const current = openSet.shift()
            if (!current) break

            current.isVisited = true
            visitedNodesInOrder.push({
                node: current,
                auxSize: openSet.length,
                topNode: openSet[0] || null,
                openSetSnapshot: openSet.slice(0, 15) // Capture top 15 elements for UI
            })

            if (current === targetNode) return visitedNodesInOrder

            const neighbors = getNeighbors(current, grid)
            for (const neighbor of neighbors) {
                if (neighbor.isVisited) continue

                const tempG = current.distance + 1
                if (tempG < neighbor.distance) {
                    neighbor.previousNode = current
                    neighbor.distance = tempG
                    neighbor.heuristic = manhattanDistance(neighbor, targetNode)
                    neighbor.totalDistance = neighbor.distance + neighbor.heuristic

                    if (!openSet.includes(neighbor)) {
                        openSet.push(neighbor)
                    }
                }
            }
        }
        return visitedNodesInOrder
    }

    const runBFS = async (grid: Node[][], startNode: Node, targetNode: Node) => {
        const queue = [startNode]
        startNode.isVisited = true
        const visitedNodesInOrder: VisitedStep[] = []

        while (queue.length) {
            const current = queue.shift()
            if (!current) break
            visitedNodesInOrder.push({
                node: current,
                auxSize: queue.length,
                topNode: queue[0] || null,
                openSetSnapshot: queue.slice(0, 15) // Capture top 15 queue elements for UI
            })

            if (current === targetNode) return visitedNodesInOrder

            const neighbors = getNeighbors(current, grid)
            for (const neighbor of neighbors) {
                if (!neighbor.isVisited && neighbor.previousNode === null && neighbor !== startNode) {
                    neighbor.isVisited = true
                    neighbor.previousNode = current
                    queue.push(neighbor)
                }
            }
        }
        return visitedNodesInOrder
    }

    // Animation
    const animatePath = (visitedNodesInOrder: VisitedStep[], EndNode: Node) => {
        // 1. Animate Visitation
        for (let i = 0; i <= visitedNodesInOrder.length; i++) {
            if (i === visitedNodesInOrder.length) {
                setTimeout(() => {
                    animateShortestPath(EndNode)
                }, speed[0] * i)
                return
            }
            setTimeout(() => {
                const step = visitedNodesInOrder[i]
                const node = step.node

                // Update Auxiliary UI directly
                const auxSizeEl = document.getElementById('aux-size')
                if (auxSizeEl) auxSizeEl.innerText = step.auxSize.toString()

                const auxTopEl = document.getElementById('aux-top')
                if (auxTopEl) {
                    if (step.topNode) {
                        auxTopEl.innerText = `${algorithm === 'bfs' ? 'Next' : 'Min'}: [Row ${step.topNode.row}, Col ${step.topNode.col}]`
                    } else {
                        auxTopEl.innerText = "Empty"
                    }
                }

                // Direct DOM manipulation for performance on simple grid
                const el = document.getElementById(`node-${node.row}-${node.col}`)
                if (el && node.type !== "start" && node.type !== "target") {
                    el.className = `w-full h-full border-[0.5px] border-sky-100 bg-sky-500 animate-pulse`
                }

                // Render Open Set/Queue Snapshot HTML
                const auxContainer = document.getElementById('aux-container')
                if (auxContainer) {
                    if (step.openSetSnapshot.length === 0) {
                        auxContainer.innerHTML = '<div class="px-3 py-1 border border-dashed rounded text-xs text-muted-foreground italic">Empty</div>'
                    } else {
                        const itemsHtml = step.openSetSnapshot.map((n, idx) => {
                            const isTop = idx === 0
                            return `
                                <div class="flex items-center">
                                    <div class="px-2 py-1 text-xs font-mono font-bold rounded shadow-sm border whitespace-nowrap ${isTop ? 'bg-blue-100 border-blue-400 text-blue-800 scale-105' : 'bg-background border-border text-foreground'}">
                                        [${n.row},${n.col}]
                                    </div>
                                    ${idx < step.openSetSnapshot.length - 1 ? '<div class="text-xs text-muted-foreground px-1">←</div>' : ''}
                                </div>
                            `
                        }).join('')
                        auxContainer.innerHTML = itemsHtml
                    }
                }
            }, speed[0] * i)
        }
    }

    const animateShortestPath = (EndNode: Node) => {
        const shortestPathNodes: Node[] = []
        let currentNode: Node | null = EndNode
        while (currentNode !== null) {
            shortestPathNodes.unshift(currentNode)
            currentNode = currentNode.previousNode
        }

        // Stats
        const startTime = performance.now() // Mock timing relative to animation

        for (let i = 0; i < shortestPathNodes.length; i++) {
            setTimeout(() => {
                const node = shortestPathNodes[i]
                const el = document.getElementById(`node-${node.row}-${node.col}`)
                if (el && node.type !== "start" && node.type !== "target") {
                    el.className = `w-full h-full border-[0.5px] border-yellow-200 bg-yellow-400 scale-110 transition-transform`
                }
                if (i === shortestPathNodes.length - 1) {
                    setIsPlaying(false)
                    setStats(prev => ({ ...prev, pathLength: shortestPathNodes.length }))
                }
            }, 30 * i)
        }
    }

    const visualize = async () => {
        if (isPlaying) return
        setIsPlaying(true)

        // Soft reset (keep walls)
        initializeGrid(false) // Wait, this resets visited states but keeps walls.
        // Need to handle soft reset of previous paths specifically if they exist on the DOM
        // For now, re-initialize state does the job logic-wise, but DOM needs cleanup.
        // Let's force a clean DOM update via key or explicit reset loop

        // We need to re-fetch the FRESH grid from state updater or refs?
        // State 'grid' is currently holding old visited data if we didn't clear.
        // Actually, initializeGrid(false) sets a NEW grid object with defaults but copies walls.
        // So 'grid' variable here is STALE. We need to use the functional update or effects.

        // hack: just delay execution slightly or use refs. 
        // better: Split reset logic.

        // Let's perform the algorithm on the CURRENT grid (which we just reset visually?? no).

        // CORRECT FLOW:
        // 1. Reset Board Logic (keep walls)
        // 2. Wait for state update
        // 3. Run Algo

        // To simplifiy, let's just create a local copy to run algo on, based on current known walls.
        const cleanGrid: Node[][] = []
        for (let r = 0; r < ROWS; r++) {
            const row: Node[] = []
            for (let c = 0; c < COLS; c++) {
                let node = createNode(r, c)
                // Persist walls from current state
                if (grid[r][c].type === "wall") node.type = "wall"
                if (r === startNodePos.row && c === startNodePos.col) node.type = "start"
                if (r === targetNodePos.row && c === targetNodePos.col) node.type = "target"

                // Reset DOM styles manually
                const el = document.getElementById(`node-${r}-${c}`)
                if (el) {
                    const type = node.type
                    if (type === 'start') el.className = "w-full h-full bg-green-500"
                    else if (type === 'target') el.className = "w-full h-full bg-red-500"
                    else if (type === 'wall') el.className = "w-full h-full bg-slate-800"
                    else el.className = "w-full h-full border-[0.5px] border-slate-200 bg-white"
                }

                row.push(node)
            }
            cleanGrid.push(row)
        }

        const startNode = cleanGrid[startNodePos.row][startNodePos.col]
        const targetNode = cleanGrid[targetNodePos.row][targetNodePos.col]

        let visitedNodes: VisitedStep[] = []
        if (algorithm === "dijkstra") visitedNodes = await runDijkstra(cleanGrid, startNode, targetNode)
        else if (algorithm === "astar") visitedNodes = await runAStar(cleanGrid, startNode, targetNode)
        else if (algorithm === "bfs") visitedNodes = await runBFS(cleanGrid, startNode, targetNode)

        setStats({ visited: visitedNodes.length, pathLength: 0, time: 0 })
        animatePath(visitedNodes, targetNode)
    }

    const clearBoard = () => {
        initializeGrid(true)
        // Reset Aux Status
        const auxSizeEl = document.getElementById('aux-size')
        if (auxSizeEl) auxSizeEl.innerText = "0"
        const auxTopEl = document.getElementById('aux-top')
        if (auxTopEl) auxTopEl.innerText = "Ready"
        const auxContainer = document.getElementById('aux-container')
        if (auxContainer) auxContainer.innerHTML = '<div class="px-3 py-1 border border-dashed rounded text-xs text-muted-foreground italic">Ready</div>'
        // Clear DOM
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const el = document.getElementById(`node-${r}-${c}`)
                if (el) {
                    // Default styles
                    const isStart = r === startNodePos.row && c === startNodePos.col
                    const isTarget = r === targetNodePos.row && c === targetNodePos.col
                    if (isStart) el.className = "w-full h-full bg-green-500"
                    else if (isTarget) el.className = "w-full h-full bg-red-500"
                    else el.className = "w-full h-full border-[0.5px] border-slate-200 bg-white"
                }
            }
        }
        setIsPlaying(false)
    }

    // Grid Cell Helper
    const getCellClass = (node: Node) => {
        const { type } = node
        if (type === "start") return "bg-green-500"
        if (type === "target") return "bg-red-500"
        if (type === "wall") return "bg-slate-800"
        return "border-[0.5px] border-slate-200 bg-white"
    }

    const PathfindingConcepts = (
        <div className="space-y-6">
            <Card className="bg-card shadow-md border border-border rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-foreground">
                        What is Pathfinding?
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm md:text-base">
                    <p>
                        <strong>Pathfinding</strong> is the computational process of finding a route between two points. It is a more practical, geometric variant of graph traversal where the goal is typically to find the <strong>shortest</strong> or <strong>most optimal</strong> path from a start location to a destination, while intelligently avoiding obstacles.
                    </p>
                    <div className="p-4 bg-muted/30 border rounded-lg shadow-sm space-y-2 mt-4">
                        <h4 className="font-semibold text-foreground text-sm">The Grid as a Graph:</h4>
                        <p className="text-sm">
                            In this visualizer, the environment is a 2D grid. Under the hood, this grid is treated exactly like a Graph:
                        </p>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                            <li><strong>Nodes:</strong> Every individual square cell is a vertex in the graph.</li>
                            <li><strong>Edges:</strong> Every non-wall cell connects to its direct top, bottom, left, and right neighbors (up to 4 undirected edges).</li>
                            <li><strong>Weights:</strong> Because moving one square up, down, left, or right all cost the exact same amount (`1` step), this grid represents an <strong>unweighted graph</strong>.</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                            Dijkstra's Algorithm
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
                        <p className="text-xs">
                            The "father" of pathfinding algorithms. It guarantees the shortest path by exploring outward in all directions equally, like a ripple in a slowly expanding pond, until the wave hits the target.
                        </p>

                        <div className="space-y-3 mt-2">
                            <div>
                                <ul className="list-disc pl-5 space-y-1 text-xs">
                                    <li><strong>Guarantee:</strong> Always finds the shortest optimal path.</li>
                                    <li><strong>Speed:</strong> Slow on large open maps because it searches blindly in every direction.</li>
                                    <li><strong>Mechanism:</strong> Uses a Priority Queue (Min-Heap) to constantly pick the node with the lowest distance from start so far.</li>
                                </ul>
                            </div>
                            <div className="bg-muted/30 p-2 rounded flex flex-col items-center">
                                <h4 className="font-semibold text-foreground mb-1 text-[11px] uppercase tracking-wider">Time Complexity</h4>
                                <Badge variant="outline" className="font-mono bg-muted/50 border-primary/20">O((V + E) log V)</Badge>
                                <p className="text-[10px] text-muted-foreground mt-1 text-center">Standard implementation with a binary heap.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2 text-primary">
                            A* Search (A-Star)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
                        <p className="text-xs font-medium text-foreground">
                            <em>The industry standard for games and navigation grids.</em>
                        </p>
                        <p className="text-xs mt-1">
                            A* is an incredibly smart upgrade to Dijkstra. Instead of searching in <em>every</em> direction, it uses a <strong>heuristic</strong> (a mathematical guess) to heavily bias its search towards the target.
                        </p>

                        <div className="space-y-3 mt-2">
                            <div>
                                <ul className="list-disc pl-5 space-y-1 text-xs">
                                    <li><strong>Guarantee:</strong> Shortest path (if the heuristic never overestimates distance).</li>
                                    <li><strong>Speed:</strong> Extremely fast since it explores far fewer total nodes.</li>
                                    <li><strong>Heuristic Used Here:</strong> Manhattan distance <code>(|x1 - x2| + |y1 - y2|)</code>.</li>
                                </ul>
                            </div>
                            <div className="bg-muted/30 p-2 rounded flex flex-col items-center">
                                <h4 className="font-semibold text-green-600 dark:text-green-400 mb-1 text-[11px] uppercase tracking-wider">Time Complexity</h4>
                                <Badge variant="outline" className="font-mono bg-muted/50 border-green-500/30 text-green-700 dark:text-green-400">O(E)</Badge>
                                <p className="text-[10px] text-muted-foreground mt-1 text-center">Highly dependent on heuristic accuracy.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                            Breadth-First Search
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
                        <p className="text-xs">
                            BFS explores nodes layer by layer. It checks all nodes 1 step away, then 2 steps away, etc. On an <em>unweighted</em> grid (like this one where all moves cost 1), BFS actually behaves identically to Dijkstra's algorithm.
                        </p>

                        <div className="space-y-3 mt-2">
                            <div>
                                <ul className="list-disc pl-5 space-y-1 text-xs">
                                    <li><strong>Guarantee:</strong> Shortest path exactly like Dijkstra (but ONLY works if edge costs are uniform).</li>
                                    <li><strong>Speed:</strong> Slightly faster computationally than Dijkstra on grids because it uses a simple Queue instead of a sorting Min-Heap.</li>
                                    <li><strong>Mechanism:</strong> Standard FIFO Queue.</li>
                                </ul>
                            </div>
                            <div className="bg-muted/30 p-2 rounded flex flex-col items-center">
                                <h4 className="font-semibold text-foreground mb-1 text-[11px] uppercase tracking-wider">Time Complexity</h4>
                                <Badge variant="outline" className="font-mono bg-muted/50 border-primary/20">O(V + E)</Badge>
                                <p className="text-[10px] text-muted-foreground mt-1 text-center">Linear time regarding grid size.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );

    return (
        <VisualizerLayout
            title="Pathfinding Visualizer"
            description="Visualize A*, Dijkstra, and BFS finding the shortest path"
            difficulty="Advanced"
            onReset={clearBoard}
            applications={[
                { title: "GPS Navigation", description: "Finding shortest driving routes", examples: ["Google Maps", "Uber"] },
                { title: "Network Routing", description: "Packet routing in computer networks", examples: ["OSPF", "IS-IS"] },
                { title: "Game AI", description: "NPCs finding paths around obstacles", examples: ["StarCraft", "Unity NavMesh"] }
            ]}
            concepts={PathfindingConcepts}
        >
            <div className="space-y-6">
                {/* Controls */}
                <Card>
                    <CardHeader className="pb-3 pl-6">
                        <CardTitle>Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-end gap-4">
                        <div className="grid w-[180px] items-center gap-1.5">
                            <span className="text-sm font-medium">Algorithm</span>
                            <Select value={algorithm} onValueChange={(v: Algorithm) => setAlgorithm(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="dijkstra">Dijkstra&apos;s Algorithm</SelectItem>
                                    <SelectItem value="astar">A* Search</SelectItem>
                                    <SelectItem value="bfs">Breadth-First Search (BFS)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button onClick={visualize} disabled={isPlaying} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            <Play className="mr-2 h-4 w-4" /> Visualize
                        </Button>

                        <Button variant="outline" onClick={clearBoard} disabled={isPlaying}>
                            <RotateCcw className="mr-2 h-4 w-4" /> Clear Board
                        </Button>

                        <div className="px-4 border-l">
                            <div className="text-sm font-medium mb-2">Speed</div>
                            <Slider
                                value={speed} onValueChange={setSpeed}
                                min={5} max={100} step={5} className="w-[100px]"
                            // Invert logic visually if needed, but 10ms is fast, 100ms is slow
                            />
                        </div>

                        <div className="ml-auto text-sm text-muted-foreground flex gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-green-500 rounded-sm"></div> Start
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-red-500 rounded-sm"></div> Target
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-slate-800 rounded-sm"></div> Wall
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats & Aux Panel */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold">{stats.visited}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Visited Nodes</div>
                    </Card>
                    <Card className="p-4 flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold">{stats.pathLength}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Path Length</div>
                    </Card>
                    <Card className="p-4 flex flex-col items-center justify-center bg-accent/5 border-accent/20">
                        <div id="aux-size" className="text-2xl font-bold text-accent">0</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1 text-center">
                            {algorithm === 'bfs' ? 'Queue Size' : 'Open Set Size'}
                        </div>
                    </Card>
                    <Card className="p-4 flex flex-col items-center justify-center bg-accent/5 border-accent/20">
                        <div id="aux-top" className="text-sm font-mono font-bold text-accent text-center h-8 flex items-center">Ready</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1 text-center">
                            {algorithm === 'bfs' ? 'Queue Head' : 'Min Element'}
                        </div>
                    </Card>
                </div>

                {/* The Grid */}
                <div className="flex justify-center overflow-auto p-4 border rounded-lg bg-muted/10">
                    <div
                        className="relative border-2 border-slate-900 bg-slate-100 shadow-xl overflow-hidden touch-none select-none"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                            width: 'fit-content'
                        }}
                        onMouseLeave={handleMouseUp}
                    >
                        {grid.map((row, r) => (
                            row.map((node, c) => (
                                <div
                                    key={`${r}-${c}`}
                                    id={`node-${r}-${c}`}
                                    className={`w-6 h-6 ${getCellClass(node)}`} // Removed transition for dragging perf
                                    onMouseDown={() => handleMouseDown(r, c)}
                                    onMouseEnter={() => handleMouseEnter(r, c)}
                                    onMouseUp={handleMouseUp}
                                />
                            ))
                        ))}
                    </div>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                    Click and drag to place walls. Algorithms will navigate around them.
                </div>

                {/* Queue / Priority Queue Visualizer */}
                <Card className="mt-6 border-2 border-primary/20">
                    <CardHeader className="py-3 px-4 bg-muted/50 border-b">
                        <CardTitle className="text-sm font-semibold flex justify-between items-center">
                            <span>{algorithm === 'bfs' ? 'Active Queue (BFS)' : 'Priority Queue (Min-Heap Concept)'}</span>
                            <span className="text-xs font-normal text-muted-foreground">Showing top 15 elements</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="w-full overflow-x-auto">
                            <div className="flex items-center min-w-max">
                                <span className="text-xs font-bold text-muted-foreground uppercase mr-3">Next</span>
                                <div id="aux-container" className="flex items-center gap-1 transition-all duration-200 min-h-[30px]">
                                    <div className="px-3 py-1 border border-dashed rounded text-xs text-muted-foreground italic">Ready</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </VisualizerLayout>
    )
}
