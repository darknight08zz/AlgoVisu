"use client"
import { useState, useEffect, useRef } from "react"
import { VisualizerLayout } from "../../../components/visualizer-layout"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { Switch } from "../../../components/ui/switch"
import { Label } from "../../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Plus, Shuffle, Network } from "lucide-react"
import type { JSX } from "react/jsx-runtime"

interface GraphNode {
  id: string
  label: string
  x: number
  y: number
  isVisited?: boolean
  isCurrentNode?: boolean
  isStartNode?: boolean
  isTargetNode?: boolean
  distance?: number
}

interface GraphEdge {
  from: string
  to: string
  weight?: number
  isHighlighted?: boolean
  isInPath?: boolean
}

interface TraversalStep {
  currentNode?: string
  visitedNodes: string[]
  queue?: string[]
  stack?: string[]
  pq?: { node: string; dist: number }[]
  description: string
  highlightedEdges: string[]
  distances?: { [key: string]: number | string } // string for "∞"
  codeLine?: number
  pathNodes?: string[]
  allDistances?: { [key: string]: { [key: string]: number | string } } // for Floyd-Warshall
}

type AlgorithmType = "bfs" | "dfs" | "dijkstra" | "bellman-ford" | "floyd-warshall"

// --- Pseudocode Definitions ---
const pseudocodeDefinitions: Record<AlgorithmType, string[]> = {
  bfs: [
    "function BFS(start):",
    "  create queue Q",
    "  mark start as visited",
    "  Q.enqueue(start)",
    "  while Q is not empty:",
    "    node = Q.dequeue()",
    "    for each neighbor of node:",
    "      if neighbor not visited:",
    "        mark neighbor as visited",
    "        Q.enqueue(neighbor)",
  ],
  dfs: [
    "function DFS(start):",
    "  create stack S",
    "  S.push(start)",
    "  while S is not empty:",
    "    node = S.pop()",
    "    if node not visited:",
    "      mark node as visited",
    "      for each neighbor of node:",
    "        if neighbor not visited:",
    "          S.push(neighbor)",
  ],
  dijkstra: [
    "function Dijkstra(start):",
    "  set distance[start] = 0",
    "  for all nodes v ≠ start: distance[v] = ∞",
    "  create min-priority queue Q",
    "  Q.insert(start, 0)",
    "  while Q is not empty:",
    "    u = Q.extractMin()",
    "    for each neighbor v of u:",
    "      alt = distance[u] + weight(u, v)",
    "      if alt < distance[v]:",
    "        distance[v] = alt",
    "        Q.decreaseKey(v, alt)",
  ],
  "bellman-ford": [
    "function BellmanFord(start):",
    "  for each node v: distance[v] = ∞",
    "  distance[start] = 0",
    "  for i = 1 to |V| - 1:",
    "    for each edge (u, v):",
    "      if distance[u] + weight(u, v) < distance[v]:",
    "        distance[v] = distance[u] + weight(u, v)",
    "  // Optional: check for negative cycles",
  ],
  "floyd-warshall": [
    "function FloydWarshall():",
    "  for each node i: dist[i][i] = 0",
    "  for each edge (i, j): dist[i][j] = weight(i, j)",
    "  for k from 1 to |V|:",
    "    for i from 1 to |V|:",
    "      for j from 1 to |V|:",
    "        if dist[i][k] + dist[k][j] < dist[i][j]:",
    "          dist[i][j] = dist[i][k] + dist[k][j]",
  ],
}

// --- Rich Explanations for Each Algorithm ---
const algorithmDetails: Record<
  AlgorithmType,
  {
    name: string
    overview: string
    bestFor: string[]
    requirements: string[]
    limitations: string[]
    guarantees: string[]
    steps: string[]
    complexity: { time: string; space: string }
    pitfalls: string[]
    tips: string[]
    example: string
  }
> = {
  bfs: {
    name: "Breadth-First Search (BFS)",
    overview:
      "BFS explores a graph level-by-level outward from the start node using a queue. In unweighted graphs, BFS yields the shortest path by number of edges.",
    bestFor: [
      "Finding shortest paths on unweighted graphs",
      "Layered exploration (e.g., friend-of-a-friend in social networks)",
      "Checking connectivity and computing levels",
    ],
    requirements: [
      "Works for directed or undirected graphs",
      "Unweighted graphs (or treat all edges as weight 1)",
    ],
    limitations: [
      "Does not handle weighted shortest paths (use Dijkstra/Bellman–Ford)",
      "Can use O(V) memory for the queue",
    ],
    guarantees: ["Finds a shortest path in terms of number of edges (if one exists) on unweighted graphs"],
    steps: [
      "Initialize queue with start; mark start visited (distance = 0).",
      "While queue non-empty: dequeue node u.",
      "For each neighbor v not visited: mark visited, set parent[v]=u, enqueue v.",
    ],
    complexity: { time: "O(V + E)", space: "O(V)" },
    pitfalls: [
      "For weighted graphs, BFS result is not the minimum total weight.",
      "Remember to mark ‘visited’ when enqueuing, not when dequeuing (prevents duplicates).",
    ],
    tips: ["Keep a parent map to reconstruct the path.", "Use levels to compute distances in edges."],
    example: "Routing in an unweighted grid/maze: BFS finds the fewest moves from start to goal.",
  },
  dfs: {
    name: "Depth-First Search (DFS)",
    overview:
      "DFS explores as deep as possible along each branch before backtracking, typically using a stack or recursion.",
    bestFor: [
      "Topological sort (DAGs), cycle detection",
      "Finding connected components",
      "Exploring/Generating paths and backtracking problems",
    ],
    requirements: ["Works for directed or undirected graphs", "Weights are irrelevant to traversal order"],
    limitations: [
      "Not guaranteed to find shortest (fewest edges) paths",
      "On deep/large graphs, recursion depth may be an issue",
    ],
    guarantees: ["Visits all vertices reachable from start"],
    steps: [
      "Push start to stack.",
      "While stack non-empty: pop u.",
      "If u not visited: mark visited and push its unvisited neighbors.",
    ],
    complexity: { time: "O(V + E)", space: "O(V)" },
    pitfalls: ["Order of pushing neighbors changes traversal tree.", "Recursion may overflow on very deep graphs."],
    tips: ["Reverse neighbors before pushing to control visual order.", "Use timestamps for discovery/finish times."],
    example:
      "Cycle detection in a directed graph: if you discover a back-edge during DFS, there is a cycle.",
  },
  dijkstra: {
    name: "Dijkstra’s Algorithm",
    overview:
      "Computes shortest paths from a single source to all nodes on graphs with non-negative edge weights using a priority queue.",
    bestFor: [
      "Road networks with non-negative distances",
      "Weighted graphs where you need shortest paths from one source",
    ],
    requirements: ["All edge weights must be non-negative", "Directed or undirected graphs are OK"],
    limitations: [
      "Fails with negative edges (distances can be incorrect)",
      "Priority queue decrease-key may be tricky; using insert again is acceptable with a visited set",
    ],
    guarantees: ["Finds optimal shortest paths when all edges have non-negative weights"],
    steps: [
      "Set dist[start]=0; others=∞.",
      "Push start in min-priority queue by dist.",
      "Extract min u; for each edge u→v, relax: if dist[u]+w(u,v)<dist[v], update dist[v] and push v.",
      "Repeat until queue empty.",
    ],
    complexity: { time: "O((V + E) log V) with binary heap", space: "O(V)" },
    pitfalls: [
      "Using Dijkstra with negative weights gives wrong answers.",
      "For dense graphs, a Fibonacci heap can improve asymptotics, but complexity of implementation increases.",
    ],
    tips: [
      "Maintain a parent map to rebuild paths.",
      "Skip a node u from the queue if it is already visited (lazy deletion).",
    ],
    example:
      "GPS routing without toll penalties as negative numbers: Dijkstra gives lowest total distance/time path.",
  },
  "bellman-ford": {
    name: "Bellman–Ford Algorithm",
    overview:
      "Single-source shortest paths allowing negative edge weights (but no negative cycles reachable from the source). It repeatedly relaxes all edges.",
    bestFor: [
      "Graphs with negative weights",
      "Detecting negative cycles reachable from the source",
    ],
    requirements: ["Handles negative weights; works for directed/undirected graphs"],
    limitations: [
      "Slower than Dijkstra on non-negative graphs",
      "Does not produce meaningful shortest paths when negative cycles are reachable (distances drop unbounded)",
    ],
    guarantees: [
      "After |V|−1 passes, all shortest paths (without negative cycles) are found",
      "An additional pass that still relaxes an edge reveals a negative cycle",
    ],
    steps: [
      "Initialize dist[start]=0; others=∞.",
      "Repeat |V|−1 times: for each edge u→v, relax dist[v] with dist[u]+w(u,v).",
      "Optional: 1 more pass; if any distance improves, a negative cycle exists.",
    ],
    complexity: { time: "O(V × E)", space: "O(V)" },
    pitfalls: ["Inefficient on large dense graphs.", "Needs careful handling of ‘∞’ in code."],
    tips: ["Early stop if an iteration does not change any distance.", "Record predecessors for path reconstruction."],
    example:
      "Currency arbitrage detection (as negative log exchange rates): Bellman–Ford reveals negative cycles (profit loops).",
  },
  "floyd-warshall": {
    name: "Floyd–Warshall Algorithm",
    overview:
      "All-pairs shortest paths via dynamic programming. It progressively allows intermediate vertices and updates dist[i][j].",
    bestFor: [
      "Small/medium graphs where all-pairs distances are needed",
      "Dense graphs or when you need distances between every pair",
    ],
    requirements: ["Works on negative edges if no negative cycles exist"],
    limitations: [
      "O(V³) time and O(V²) space can be too heavy for large V",
      "If a negative cycle exists, distances become undefined for affected pairs",
    ],
    guarantees: ["Computes shortest distances between all vertex pairs (if no negative cycles)"],
    steps: [
      "Initialize dist[i][i]=0; dist[i][j]=w(i,j) if edge exists; otherwise ∞.",
      "For each k: for each i, j: dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]).",
    ],
    complexity: { time: "O(V³)", space: "O(V²)", },
    pitfalls: ["Memory can be high for big V.", "Must detect/report negative cycles for correctness."],
    tips: ["Keep a ‘next’ matrix to reconstruct actual paths.", "Great for precomputing distances for many queries."],
    example:
      "Computing every city-to-city driving time for quick query responses in a small network.",
  },
}

// Helper to reconstruct path from BFS/DFS/Dijkstra traversal
function reconstructPath(
  edges: GraphEdge[],
  start: string,
  target: string,
  parentMap: { [key: string]: string }
): string[] {
  const path: string[] = []
  let current = target
  while (current !== start && parentMap[current]) {
    path.push(current)
    current = parentMap[current]
  }
  if (current === start) path.push(start)
  return path.reverse()
}

// Helper function to get neighbors considering graph direction
function getNeighbors(nodeId: string, edges: GraphEdge[], isDirected: boolean): string[] {
  const neighbors: string[] = []
  for (const edge of edges) {
    if (edge.from === nodeId) {
      neighbors.push(edge.to)
    } else if (!isDirected && edge.to === nodeId) {
      neighbors.push(edge.from)
    }
  }
  return neighbors
}

export default function GraphVisualizerPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [isDirected, setIsDirected] = useState(false)
  const [isWeighted, setIsWeighted] = useState(false)
  const [algorithm, setAlgorithm] = useState<AlgorithmType>("bfs")
  const [startNode, setStartNode] = useState<string>("")
  const [targetNode, setTargetNode] = useState<string>("")
  const [newNodeLabel, setNewNodeLabel] = useState("")
  const [edgeFrom, setEdgeFrom] = useState("")
  const [edgeTo, setEdgeTo] = useState("")
  const [edgeWeight, setEdgeWeight] = useState("")
  const [traversalSteps, setTraversalSteps] = useState<TraversalStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentPseudocode, setCurrentPseudocode] = useState<string[]>(pseudocodeDefinitions.bfs)
  const [currentCodeLine, setCurrentCodeLine] = useState<number>(-1)
  // Delete controls
  const [deleteVertexId, setDeleteVertexId] = useState<string>("")
  const [deleteEdgeFrom, setDeleteEdgeFrom] = useState<string>("")
  const [deleteEdgeTo, setDeleteEdgeTo] = useState<string>("")
  // Edit edge weight
  const [editEdgeFrom, setEditEdgeFrom] = useState<string>("")
  const [editEdgeTo, setEditEdgeTo] = useState<string>("")
  const [editEdgeWeight, setEditEdgeWeight] = useState<string>("")
  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  const applications = [
    {
      title: "Social Network Analysis",
      description: "Graph algorithms analyze connections and relationships in social media platforms",
      examples: ["Friend recommendations", "Community detection", "Influence measurement"],
    },
    {
      title: "Navigation Systems",
      description: "GPS and mapping services use graph algorithms to find optimal routes",
      examples: ["Google Maps routing", "Traffic optimization", "Shortest path finding"],
    },
    {
      title: "Network Infrastructure",
      description: "Internet routing and network topology optimization rely on graph algorithms",
      examples: ["Internet routing protocols", "Network reliability", "Load balancing"],
    },
    {
      title: "Recommendation Systems",
      description: "E-commerce and streaming platforms use graphs to suggest relevant content",
      examples: ["Product recommendations", "Content discovery", "Collaborative filtering"],
    },
  ]

  // Initialize with sample graph
  useEffect(() => {
    const sampleNodes: GraphNode[] = [
      { id: "A", label: "A", x: 200, y: 150 },
      { id: "B", label: "B", x: 400, y: 100 },
      { id: "C", label: "C", x: 600, y: 150 },
      { id: "D", label: "D", x: 200, y: 350 },
      { id: "E", label: "E", x: 400, y: 300 },
      { id: "F", label: "F", x: 600, y: 350 },
    ]
    const sampleEdges: GraphEdge[] = [
      { from: "A", to: "B", weight: 4 },
      { from: "A", to: "D", weight: 2 },
      { from: "B", to: "C", weight: 3 },
      { from: "B", to: "E", weight: 1 },
      { from: "C", to: "F", weight: 2 },
      { from: "D", to: "E", weight: 5 },
      { from: "E", to: "F", weight: 1 },
    ]
    setNodes(sampleNodes)
    setEdges(sampleEdges)
    setStartNode("A")
    setTargetNode("F")
  }, [])

  const addNode = () => {
    if (!newNodeLabel.trim()) return
    const id = newNodeLabel.trim().toUpperCase().slice(0, 1)
    const newNode: GraphNode = {
      id,
      label: id,
      x: Math.random() * 600 + 100,
      y: Math.random() * 300 + 100,
    }
    if (!nodes.find((n) => n.id === newNode.id)) {
      setNodes([...nodes, newNode])
      setNewNodeLabel("")
    }
  }

  const removeNode = (nodeId: string) => {
    setNodes(nodes.filter((n) => n.id !== nodeId))
    setEdges(edges.filter((e) => e.from !== nodeId && e.to !== nodeId))
    if (startNode === nodeId) setStartNode("")
    if (targetNode === nodeId) setTargetNode("")
  }

  const addEdge = () => {
    if (!edgeFrom || !edgeTo || edgeFrom === edgeTo) return
    const weight = isWeighted ? Number.parseInt(edgeWeight) || 1 : undefined
    const newEdge: GraphEdge = { from: edgeFrom, to: edgeTo, weight }
    const exists = edges.find((e) => e.from === edgeFrom && e.to === edgeTo)
    if (!exists) {
      setEdges([...edges, newEdge])
      setEdgeFrom("")
      setEdgeTo("")
      setEdgeWeight("")
    }
  }

  const removeEdge = (from: string, to: string) => {
    setEdges(edges.filter((e) => !(e.from === from && e.to === to)))
  }

  const generateRandomGraph = () => {
    const nodeCount = 6
    const newNodes: GraphNode[] = []
    const newEdges: GraphEdge[] = []
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i * 2 * Math.PI) / nodeCount
      const radius = 150
      const centerX = 400
      const centerY = 250
      const id = String.fromCharCode(65 + i)
      newNodes.push({
        id,
        label: id,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      })
    }
    for (let i = 0; i < nodeCount; i++) {
      const connections = Math.floor(Math.random() * 3) + 1
      for (let j = 0; j < connections; j++) {
        const targetIndex = Math.floor(Math.random() * nodeCount)
        if (targetIndex !== i) {
          const weight = isWeighted ? Math.floor(Math.random() * 9) + 1 : undefined
          const edge: GraphEdge = {
            from: newNodes[i].id,
            to: newNodes[targetIndex].id,
            weight,
          }
          if (!newEdges.find((e) => e.from === edge.from && e.to === edge.to)) {
            newEdges.push(edge)
          }
        }
      }
    }
    setNodes(newNodes)
    setEdges(newEdges)
    setStartNode(newNodes[0]?.id || "")
    setTargetNode(newNodes[nodeCount - 1]?.id || "")
    resetGraph()
  }

  const resetGraph = () => {
    setNodes((prev) =>
      prev.map((node) => ({
        ...node,
        isVisited: false,
        isCurrentNode: false,
        isStartNode: false,
        isTargetNode: false,
        distance: undefined,
      })),
    )
    setEdges((prev) => prev.map((edge) => ({ ...edge, isHighlighted: false, isInPath: false })))
    setTraversalSteps([])
    setCurrentStep(0)
    setIsPlaying(false)
    setCurrentCodeLine(-1)
  }

  const highlightPseudocode = (algo: AlgorithmType, line: number) => {
    setCurrentPseudocode(pseudocodeDefinitions[algo])
    setCurrentCodeLine(line)
  }

  // === BFS ===
  const performBFS = () => {
    if (!startNode) return
    const steps: TraversalStep[] = []
    const visited = new Set<string>()
    const queue = [startNode]
    const distances: { [key: string]: number } = { [startNode]: 0 }
    const parent: { [key: string]: string } = {}

    steps.push({
      currentNode: startNode,
      visitedNodes: [],
      queue: [...queue],
      description: `Starting BFS from node ${startNode}`,
      highlightedEdges: [],
      distances: { ...distances },
      codeLine: 1,
    })
    steps.push({
      currentNode: startNode,
      visitedNodes: [],
      queue: [...queue],
      description: `Created queue and marked ${startNode} as visited`,
      highlightedEdges: [],
      distances: { ...distances },
      codeLine: 3,
    })

    let found = false
    while (queue.length > 0) {
      const currentNode = queue.shift()!
      visited.add(currentNode)
      steps.push({
        currentNode,
        visitedNodes: Array.from(visited),
        queue: [...queue],
        description: `Dequeued and visiting node ${currentNode}`,
        highlightedEdges: [],
        distances: { ...distances },
        codeLine: 6,
      })

      const neighbors = getNeighbors(currentNode, edges, isDirected)
        .filter((neighbor) => !visited.has(neighbor) && !queue.includes(neighbor))

      steps.push({
        currentNode,
        visitedNodes: Array.from(visited),
        queue: [...queue],
        description: `Checking neighbors of node ${currentNode}`,
        highlightedEdges: [],
        distances: { ...distances },
        codeLine: 7,
      })

      for (const neighbor of neighbors) {
        queue.push(neighbor)
        distances[neighbor] = distances[currentNode] + 1
        parent[neighbor] = currentNode
        steps.push({
          currentNode,
          visitedNodes: Array.from(visited),
          queue: [...queue],
          description: `Added ${neighbor} to queue (neighbor not visited)`,
          highlightedEdges: [`${currentNode}-${neighbor}`],
          distances: { ...distances },
          codeLine: 9,
        })
      }

      if (targetNode && currentNode === targetNode) {
        found = true
        steps.push({
          currentNode,
          visitedNodes: Array.from(visited),
          queue: [...queue],
          description: `Found target node ${targetNode}!`,
          highlightedEdges: [],
          distances: { ...distances },
          codeLine: 6,
        })
        break
      }
    }

    if (found) {
      const path = reconstructPath(edges, startNode, targetNode, parent)
      const lastStep = steps[steps.length - 1]
      steps.push({
        ...lastStep,
        description: "Final path highlighted in green.",
        highlightedEdges: lastStep.highlightedEdges,
        pathNodes: path,
        codeLine: -1,
      } as any)
    }

    setTraversalSteps(steps)
    setCurrentPseudocode(pseudocodeDefinitions.bfs)
  }

  // === DFS ===
  const performDFS = () => {
    if (!startNode) return
    const steps: TraversalStep[] = []
    const visited = new Set<string>()
    const stack = [startNode]

    steps.push({
      currentNode: startNode,
      visitedNodes: [],
      stack: [...stack],
      description: `Starting DFS from node ${startNode}`,
      highlightedEdges: [],
      codeLine: 1,
    })
    steps.push({
      currentNode: startNode,
      visitedNodes: [],
      stack: [...stack],
      description: `Created stack and pushed ${startNode}`,
      highlightedEdges: [],
      codeLine: 3,
    })

    while (stack.length > 0) {
      const currentNode = stack.pop()!
      if (visited.has(currentNode)) continue
      visited.add(currentNode)
      steps.push({
        currentNode,
        visitedNodes: Array.from(visited),
        stack: [...stack],
        description: `Popped and visiting node ${currentNode}`,
        highlightedEdges: [],
        codeLine: 7,
      })

      const neighbors = getNeighbors(currentNode, edges, isDirected)
        .filter((neighbor) => !visited.has(neighbor))
        .reverse()

      steps.push({
        currentNode,
        visitedNodes: Array.from(visited),
        stack: [...stack],
        description: `Checking neighbors of node ${currentNode}`,
        highlightedEdges: [],
        codeLine: 8,
      })

      for (const neighbor of neighbors) {
        stack.push(neighbor)
        steps.push({
          currentNode,
          visitedNodes: Array.from(visited),
          stack: [...stack],
          description: `Pushed ${neighbor} to stack (neighbor not visited)`,
          highlightedEdges: [`${currentNode}-${neighbor}`],
          codeLine: 10,
        })
      }

      if (targetNode && currentNode === targetNode) {
        steps.push({
          currentNode,
          visitedNodes: Array.from(visited),
          stack: [...stack],
          description: `Found target node ${targetNode}!`,
          highlightedEdges: [],
          codeLine: 7,
        })
        break
      }
    }

    setTraversalSteps(steps)
    setCurrentPseudocode(pseudocodeDefinitions.dfs)
  }

  // === Dijkstra ===
  const performDijkstra = () => {
    if (!startNode) return
    const steps: TraversalStep[] = []
    const distances: { [key: string]: number } = {}
    const visited = new Set<string>()
    const parent: { [key: string]: string } = {}

    for (const node of nodes) distances[node.id] = node.id === startNode ? 0 : Infinity

    let pq: { node: string; dist: number }[] = [{ node: startNode, dist: 0 }]

    steps.push({
      visitedNodes: [],
      pq: [...pq],
      description: `Initialize distances: ${startNode}=0, others=∞`,
      highlightedEdges: [],
      distances: Object.fromEntries(Object.entries(distances).map(([k, v]) => [k, v === Infinity ? "∞" : v])),
      codeLine: 2,
    })

    while (pq.length > 0) {
      pq.sort((a, b) => a.dist - b.dist)
      const { node: u, dist } = pq.shift()!
      if (visited.has(u)) continue
      visited.add(u)

      steps.push({
        currentNode: u,
        visitedNodes: Array.from(visited),
        pq: [...pq],
        description: `Processing node ${u} (min distance = ${dist})`,
        highlightedEdges: [],
        distances: Object.fromEntries(Object.entries(distances).map(([k, v]) => [k, v === Infinity ? "∞" : v])),
        codeLine: 7,
      })

      const neighbors = getNeighbors(u, edges, isDirected)
      for (const v of neighbors) {
        const edge = edges.find(e => e.from === u && e.to === v) ||
          (!isDirected && edges.find(e => e.to === u && e.from === v))
        if (!edge || edge.weight === undefined) continue
        const alt = distances[u] + edge.weight
        if (alt < distances[v]) {
          distances[v] = alt
          parent[v] = u
          pq.push({ node: v, dist: alt })
          // Sort immediately for visual accuracy in priority queue
          pq.sort((a, b) => a.dist - b.dist)
          steps.push({
            currentNode: u,
            visitedNodes: Array.from(visited),
            pq: [...pq],
            description: `Relax edge ${u}→${v}: update dist[${v}] = ${alt}`,
            highlightedEdges: [`${u}-${v}`],
            distances: Object.fromEntries(Object.entries(distances).map(([k, v]) => [k, v === Infinity ? "∞" : v])),
            codeLine: 10,
          })
        }
      }
    }

    if (targetNode && distances[targetNode] !== Infinity) {
      const path = reconstructPath(edges, startNode, targetNode, parent)
      const lastStep = steps[steps.length - 1]
      steps.push({
        ...lastStep,
        pq: [],
        description: `Shortest path to ${targetNode}: [${path.join(" → ")}] (distance: ${distances[targetNode]})`,
        pathNodes: path,
        codeLine: -1,
      } as any)
    }

    setTraversalSteps(steps)
    setCurrentPseudocode(pseudocodeDefinitions.dijkstra)
  }

  // === Bellman-Ford ===
  const performBellmanFord = () => {
    if (!startNode) return
    const steps: TraversalStep[] = []
    const distances: { [key: string]: number } = {}

    for (const node of nodes) distances[node.id] = node.id === startNode ? 0 : Infinity

    steps.push({
      visitedNodes: [],
      description: `Initialize: ${startNode}=0, others=∞`,
      highlightedEdges: [],
      distances: Object.fromEntries(Object.entries(distances).map(([k, v]) => [k, v === Infinity ? "∞" : v])),
      codeLine: 2,
    })

    const V = nodes.length
    for (let i = 1; i <= V - 1; i++) {
      let updated = false
      steps.push({
        visitedNodes: [],
        description: `Iteration ${i} of ${V - 1}`,
        highlightedEdges: [],
        distances: Object.fromEntries(Object.entries(distances).map(([k, v]) => [k, v === Infinity ? "∞" : v])),
        codeLine: 4,
      })

      for (const edge of edges) {
        const u = edge.from
        const v = edge.to
        if (distances[u] !== Infinity && edge.weight !== undefined) {
          const alt = distances[u] + edge.weight
          if (alt < distances[v]) {
            distances[v] = alt
            updated = true
            steps.push({
              visitedNodes: [],
              description: `Relax edge ${u}→${v}: dist[${v}] = ${alt}`,
              highlightedEdges: [`${u}-${v}`],
              distances: Object.fromEntries(Object.entries(distances).map(([k, v]) => [k, v === Infinity ? "∞" : v])),
              codeLine: 6,
            })
          }
        }
        if (!isDirected && distances[v] !== Infinity && edge.weight !== undefined) {
          const alt2 = distances[v] + edge.weight
          if (alt2 < distances[u]) {
            distances[u] = alt2
            updated = true
            steps.push({
              visitedNodes: [],
              description: `Relax edge ${v}→${u}: dist[${u}] = ${alt2}`,
              highlightedEdges: [`${v}-${u}`],
              distances: Object.fromEntries(Object.entries(distances).map(([k, v]) => [k, v === Infinity ? "∞" : v])),
              codeLine: 6,
            })
          }
        }
      }
      if (!updated) break
    }

    setTraversalSteps(steps)
    setCurrentPseudocode(pseudocodeDefinitions["bellman-ford"])
  }

  // === Floyd-Warshall ===
  const performFloydWarshall = () => {
    const steps: TraversalStep[] = []
    const nodeIds = nodes.map(n => n.id)
    const dist: { [i: string]: { [j: string]: number | string } } = {}

    for (const i of nodeIds) {
      dist[i] = {}
      for (const j of nodeIds) {
        dist[i][j] = i === j ? 0 : "∞"
      }
    }
    for (const edge of edges) {
      dist[edge.from][edge.to] = edge.weight ?? 1
      if (!isDirected) dist[edge.to][edge.from] = edge.weight ?? 1
    }

    steps.push({
      visitedNodes: [],
      description: "Initialize distance matrix",
      highlightedEdges: [],
      allDistances: JSON.parse(JSON.stringify(dist)),
      codeLine: 2,
    })

    for (const k of nodeIds) {
      steps.push({
        visitedNodes: [],
        description: `Intermediate node: ${k}`,
        highlightedEdges: [],
        allDistances: JSON.parse(JSON.stringify(dist)),
        codeLine: 4,
      })
      for (const i of nodeIds) {
        for (const j of nodeIds) {
          const distIK = dist[i][k]
          const distKJ = dist[k][j]
          if (distIK !== "∞" && distKJ !== "∞") {
            const newDist = (distIK as number) + (distKJ as number)
            const current = dist[i][j]
            if (current === "∞" || newDist < (current as number)) {
              dist[i][j] = newDist
              steps.push({
                visitedNodes: [],
                description: `Update dist[${i}][${j}] via ${k}: ${newDist}`,
                highlightedEdges: [`${i}-${k}`, `${k}-${j}`],
                allDistances: JSON.parse(JSON.stringify(dist)),
                codeLine: 7,
              })
            }
          }
        }
      }
    }

    setTraversalSteps(steps)
    setCurrentPseudocode(pseudocodeDefinitions["floyd-warshall"])
  }

  const startAlgorithm = () => {
    resetGraph()
    setCurrentStep(0)
    switch (algorithm) {
      case "bfs": performBFS(); break
      case "dfs": performDFS(); break
      case "dijkstra": performDijkstra(); break
      case "bellman-ford": performBellmanFord(); break
      case "floyd-warshall": performFloydWarshall(); break
    }
  }

  const stepForward = () => {
    if (currentStep < traversalSteps.length - 1) setCurrentStep(currentStep + 1)
  }
  const stepBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }
  const play = () => {
    if (traversalSteps.length === 0) startAlgorithm()
    setIsPlaying(true)
  }
  const pause = () => setIsPlaying(false)
  const reset = () => resetGraph()

  useEffect(() => {
    if (isPlaying && currentStep < traversalSteps.length - 1) {
      const timer = setTimeout(() => stepForward(), 1500)
      return () => clearTimeout(timer)
    } else if (currentStep >= traversalSteps.length - 1) {
      setIsPlaying(false)
    }
  }, [isPlaying, currentStep, traversalSteps.length])

  useEffect(() => {
    if (traversalSteps.length > 0 && traversalSteps[currentStep]) {
      const codeLine = traversalSteps[currentStep].codeLine
      if (codeLine !== undefined) setCurrentCodeLine(codeLine)
    }
  }, [currentStep, traversalSteps])

  // Drag handlers
  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    setIsDragging(true)
    setDraggedNodeId(nodeId)
    const svgRect = svgRef.current?.getBoundingClientRect()
    if (svgRect) {
      setDragOffset({
        x: e.clientX - svgRect.left - node.x,
        y: e.clientY - svgRect.top - node.y,
      })
    }
    e.preventDefault()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggedNodeId || !svgRef.current) return
    const svgRect = svgRef.current.getBoundingClientRect()
    const newX = e.clientX - svgRect.left - dragOffset.x
    const newY = e.clientY - svgRect.top - dragOffset.y
    setNodes(prev =>
      prev.map(node =>
        node.id === draggedNodeId
          ? { ...node, x: Math.max(20, Math.min(780, newX)), y: Math.max(20, Math.min(480, newY)) }
          : node
      )
    )
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDraggedNodeId(null)
  }

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!svgRef.current) return
        const svgRect = svgRef.current.getBoundingClientRect()
        const newX = e.clientX - svgRect.left - dragOffset.x
        const newY = e.clientY - svgRect.top - dragOffset.y
        setNodes(prev =>
          prev.map(node =>
            node.id === draggedNodeId
              ? { ...node, x: Math.max(20, Math.min(780, newX)), y: Math.max(20, Math.min(480, newY)) }
              : node
          )
        )
      }
      const handleGlobalMouseUp = () => {
        setIsDragging(false)
        setDraggedNodeId(null)
      }
      window.addEventListener('mousemove', handleGlobalMouseMove)
      window.addEventListener('mouseup', handleGlobalMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove)
        window.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [isDragging, draggedNodeId, dragOffset])

  const renderGraph = (): JSX.Element => {
    const currentStepData = traversalSteps[currentStep]
    const pathNodes: string[] = (currentStepData as any)?.pathNodes || []
    return (
      <svg
        ref={svgRef}
        width="100%"
        height="500"
        className="border rounded-lg bg-white mx-auto block max-w-full"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {isDirected && (
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
            </marker>
          </defs>
        )}
        {edges.map((edge, index) => {
          const fromNode = nodes.find((n) => n.id === edge.from)
          const toNode = nodes.find((n) => n.id === edge.to)
          if (!fromNode || !toNode) return null
          const dx = toNode.x - fromNode.x
          const dy = toNode.y - fromNode.y
          const len = Math.sqrt(dx * dx + dy * dy)
          const offset = 20
          const normX = dx / len
          const normY = dy / len
          const startX = fromNode.x + normX * offset
          const startY = fromNode.y + normY * offset
          const endX = toNode.x - normX * offset
          const endY = toNode.y - normY * offset
          const isHighlighted = currentStepData?.highlightedEdges.includes(`${edge.from}-${edge.to}`)
          const isPathEdge =
            pathNodes.length > 1 &&
            pathNodes.some((id, idx) => idx < pathNodes.length - 1 && pathNodes[idx] === edge.from && pathNodes[idx + 1] === edge.to)
          return (
            <g key={index}>
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={isPathEdge ? "#22c55e" : isHighlighted ? "#6366f1" : "#e5e7eb"}
                strokeWidth={isPathEdge ? 4 : isHighlighted ? 3 : 2}
                markerEnd={isDirected ? "url(#arrowhead)" : undefined}
                style={{ transition: "stroke 0.3s, strokeWidth 0.3s" as any }}
              />
              {isWeighted && edge.weight !== undefined && (
                <text
                  x={(startX + endX) / 2 + 10 * -normY}
                  y={(startY + endY) / 2 + 10 * normX}
                  textAnchor="middle"
                  className="text-xs font-bold fill-blue-600"
                  style={{ userSelect: "none" }}
                >
                  {edge.weight}
                </text>
              )}
            </g>
          )
        })}
        {nodes.map((node) => {
          const isVisited = currentStepData?.visitedNodes.includes(node.id)
          const isCurrent = currentStepData?.currentNode === node.id
          const isStart = node.id === startNode
          const isTarget = node.id === targetNode
          const distance = currentStepData?.distances?.[node.id]
          const pathNodes: string[] = (currentStepData as any)?.pathNodes || []
          const isPathNode = pathNodes.includes(node.id)
          return (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r="20"
                fill={
                  isPathNode ? "#22c55e"
                    : isCurrent ? "#6366f1"
                      : isStart ? "#22c55e"
                        : isTarget ? "#ef4444"
                          : isVisited ? "#f59e0b"
                            : "#ffffff"
                }
                stroke={
                  isPathNode ? "#16a34a"
                    : isCurrent ? "#4f46e5"
                      : isStart ? "#16a34a"
                        : isTarget ? "#dc2626"
                          : isVisited ? "#d97706"
                            : "#6b7280"
                }
                strokeWidth="2"
                className="cursor-move"
                onMouseDown={(e) => handleMouseDown(node.id, e)}
                style={{ transition: "fill 0.3s, stroke 0.3s" }}
              />
              <text
                x={node.x}
                y={node.y + 5}
                textAnchor="middle"
                className="text-sm font-bold pointer-events-none"
                fill={isPathNode || isCurrent || isStart || isTarget || isVisited ? "#ffffff" : "#374151"}
              >
                {node.label}
              </text>
              {distance !== undefined && (
                <text x={node.x} y={node.y - 30} textAnchor="middle" className="text-xs font-bold fill-blue-600">
                  d: {distance}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    )
  }

  const currentAlgorithm = {
    name: algorithmDetails[algorithm].name,
    description: algorithmDetails[algorithm].overview,
    timeComplexity: algorithmDetails[algorithm].complexity.time,
    spaceComplexity: algorithmDetails[algorithm].complexity.space,
  }

  useEffect(() => {
    setCurrentPseudocode(pseudocodeDefinitions[algorithm])
    setCurrentCodeLine(-1)
  }, [algorithm])

  const handleEditEdgeWeight = () => {
    if (!editEdgeFrom || !editEdgeTo || !editEdgeWeight) return
    setEdges((prev) =>
      prev.map((e) =>
        e.from === editEdgeFrom && e.to === editEdgeTo
          ? { ...e, weight: Number(editEdgeWeight) }
          : e
      )
    )
    setEditEdgeFrom("")
    setEditEdgeTo("")
    setEditEdgeWeight("")
  }

  const detail = algorithmDetails[algorithm]

  const GraphConcepts = (
    <div className="space-y-6">
      <Card className="bg-card shadow-md border border-border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            What is a Graph?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm md:text-base text-muted-foreground">
          <p>
            A <strong>Graph</strong> is a non-linear data structure consisting of <strong>Vertices (Nodes)</strong> connected by <strong>Edges (Links)</strong>.
            It is the fundamental mathematical structure used to model pairwise relationships between objects.
          </p>
          <div className="p-4 bg-muted/30 border rounded-lg shadow-sm space-y-2 mt-4">
            <h4 className="font-semibold text-foreground text-sm">Key Terminologies:</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Directed via Undirected:</strong> In directed graphs, edges have a specific direction (A → B). In undirected, relationships are mutual (A ↔ B), like a two-way street.</li>
              <li><strong>Weighted vs Unweighted:</strong> Edges can carry "weights" representing cost, distance, or time. If unweighted, all edges are treated equally (cost of 1).</li>
              <li><strong>Adjacency List vs Matrix:</strong> Graphs are typically stored in code as either an Adjacency List (an array of arrays, great for sparse graphs) or an Adjacency Matrix (a 2D array grid, great for dense graphs). This visualizer uses an edge list approach under the hood.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {(Object.entries(algorithmDetails) as [AlgorithmType, typeof algorithmDetails[AlgorithmType]][]).map(([key, algoDetail]) => (
          <Card key={key} className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-foreground">
                {algoDetail.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col">
              <p className="text-xs">{algoDetail.overview}</p>

              <div className="grid grid-cols-2 gap-4 mt-2 bg-muted/20 p-3 rounded-lg border">
                <div>
                  <h4 className="font-semibold text-foreground mb-1 text-[11px] uppercase tracking-wider">Best For:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    {algoDetail.bestFor.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1 text-[11px] uppercase tracking-wider">Guarantees:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-green-700 dark:text-green-400">
                    {algoDetail.guarantees.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </div>
              </div>

              <div className="flex-1 mt-2">
                <h4 className="font-semibold text-foreground mb-1 text-[11px] uppercase tracking-wider">Core Idea (Step-by-Step):</h4>
                <ol className="list-decimal pl-5 space-y-1 text-xs">
                  {algoDetail.steps.map((x, i) => <li key={i}>{x}</li>)}
                </ol>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg border mt-2">
                <div>
                  <h4 className="font-semibold text-red-500 mb-1 text-[11px] uppercase tracking-wider">Limitations:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    {algoDetail.limitations.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-500 mb-1 text-[11px] uppercase tracking-wider">Tips & Pitfalls:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    {[...algoDetail.tips, ...algoDetail.pitfalls].map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-lg border border-border mt-2 flex items-center gap-2">
                <span className="font-semibold text-foreground text-xs uppercase tracking-wider">Example:</span>
                <span className="text-xs flex-1">{algoDetail.example}</span>
              </div>

              <div className="flex flex-wrap gap-2 mt-auto pt-4 text-[11px]">
                <Badge variant="outline" className="bg-muted/50 text-foreground font-mono">Time: {algoDetail.complexity.time}</Badge>
                <Badge variant="outline" className="bg-muted/50 text-foreground font-mono">Space: {algoDetail.complexity.space}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <VisualizerLayout
      title="Graph Algorithm Visualizer"
      description="Learn graph traversal and shortest path algorithms"
      difficulty="Advanced"
      isPlaying={isPlaying}
      onPlay={play}
      onPause={pause}
      onStepBack={stepBack}
      onStepForward={stepForward}
      onReset={reset}
      currentStep={currentStep}
      totalSteps={traversalSteps.length}
      complexity={{
        time: currentAlgorithm.timeComplexity,
        space: currentAlgorithm.spaceComplexity,
      }}
      applications={applications}
      concepts={GraphConcepts}
    >
      <div className="w-full space-y-6">

        {/* Algorithm Toggle Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-6 mt-4">
          <div className="inline-flex rounded-md border p-1 bg-muted w-full max-w-3xl overflow-x-auto whitespace-nowrap scrollbar-hide">
            {(["bfs", "dfs", "dijkstra", "bellman-ford", "floyd-warshall"] as AlgorithmType[]).map((algo) => (
              <button
                key={algo}
                onClick={() => setAlgorithm(algo)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-sm transition-colors ${algorithm === algo ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {algorithmDetails[algo].name}
              </button>
            ))}
          </div>
        </div>


        {/* Graph Canvas */}
        <div className="bg-muted/10 rounded-lg p-4 min-h-[500px] border relative overflow-hidden flex justify-center">
          {renderGraph()}
        </div>

        {/* Pseudocode Panel */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">Pseudocode</CardTitle>
          </CardHeader>
          <div className="font-mono text-sm bg-muted p-4 rounded-md max-h-96 overflow-y-auto">
            {currentPseudocode.map((line, index) => (
              <div
                key={index}
                className={`py-1 px-2 rounded ${currentCodeLine === index + 1
                  ? "bg-primary/20 border-l-4 border-primary text-primary-foreground"
                  : "text-muted-foreground"
                  }`}
              >
                <span className="text-xs text-muted-foreground/70 mr-3">{index + 1}</span>
                {line || "\u00A0"}
              </div>
            ))}
          </div>
        </Card>

        {/* Controls */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Graph Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch id="directed" checked={isDirected} onCheckedChange={setIsDirected} />
                <Label htmlFor="directed">Directed</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="weighted" checked={isWeighted} onCheckedChange={setIsWeighted} />
                <Label htmlFor="weighted">Weighted</Label>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Start/Target</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Select value={startNode} onValueChange={setStartNode}>
                <SelectTrigger><SelectValue placeholder="Start node" /></SelectTrigger>
                <SelectContent>
                  {nodes.map((node) => <SelectItem key={node.id} value={node.id}>{node.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={targetNode} onValueChange={setTargetNode}>
                <SelectTrigger><SelectValue placeholder="Target node" /></SelectTrigger>
                <SelectContent>
                  {nodes.map((node) => <SelectItem key={node.id} value={node.id}>{node.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Generate</CardTitle></CardHeader>
            <CardContent>
              <Button onClick={generateRandomGraph} className="w-full">
                <Shuffle className="h-4 w-4 mr-2" />
                Random Graph
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Run Algorithm</CardTitle></CardHeader>
            <CardContent>
              <Button onClick={startAlgorithm} className="w-full">Start Algorithm</Button>
            </CardContent>
          </Card>
        </div>

        {/* Add / Delete */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Add Vertex</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Vertex label"
                  value={newNodeLabel}
                  onChange={(e) => setNewNodeLabel(e.target.value)}
                  maxLength={1}
                />
                <Button onClick={addNode} disabled={!newNodeLabel}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Add Edge</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Select value={edgeFrom} onValueChange={setEdgeFrom}>
                  <SelectTrigger><SelectValue placeholder="From" /></SelectTrigger>
                  <SelectContent>
                    {nodes.map((node) => <SelectItem key={node.id} value={node.id}>{node.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={edgeTo} onValueChange={setEdgeTo}>
                  <SelectTrigger><SelectValue placeholder="To" /></SelectTrigger>
                  <SelectContent>
                    {nodes.map((node) => <SelectItem key={node.id} value={node.id}>{node.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {isWeighted && (
                  <Input
                    type="number"
                    placeholder="Weight"
                    value={edgeWeight}
                    onChange={(e) => setEdgeWeight(e.target.value)}
                    className="w-36"
                  />
                )}
                <Button onClick={addEdge} disabled={!edgeFrom || !edgeTo}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Delete Vertex</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Select value={deleteVertexId} onValueChange={setDeleteVertexId}>
                  <SelectTrigger><SelectValue placeholder="Select vertex" /></SelectTrigger>
                  <SelectContent>
                    {nodes.map((node) => <SelectItem key={node.id} value={node.id}>{node.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (deleteVertexId) {
                      removeNode(deleteVertexId)
                      setDeleteVertexId("")
                    }
                  }}
                  disabled={!deleteVertexId}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Delete Edge</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Select value={deleteEdgeFrom} onValueChange={setDeleteEdgeFrom}>
                  <SelectTrigger><SelectValue placeholder="From" /></SelectTrigger>
                  <SelectContent>
                    {nodes.map((node) => <SelectItem key={node.id} value={node.id}>{node.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={deleteEdgeTo} onValueChange={setDeleteEdgeTo}>
                  <SelectTrigger><SelectValue placeholder="To" /></SelectTrigger>
                  <SelectContent>
                    {nodes.map((node) => <SelectItem key={node.id} value={node.id}>{node.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (deleteEdgeFrom && deleteEdgeTo) {
                      removeEdge(deleteEdgeFrom, deleteEdgeTo)
                      setDeleteEdgeFrom("")
                      setDeleteEdgeTo("")
                    }
                  }}
                  disabled={!deleteEdgeFrom || !deleteEdgeTo}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {isWeighted && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Edit Edge Weight</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Select value={editEdgeFrom} onValueChange={setEditEdgeFrom}>
                    <SelectTrigger><SelectValue placeholder="From" /></SelectTrigger>
                    <SelectContent>
                      {nodes.map((node) => <SelectItem key={node.id} value={node.id}>{node.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={editEdgeTo} onValueChange={setEditEdgeTo}>
                    <SelectTrigger><SelectValue placeholder="To" /></SelectTrigger>
                    <SelectContent>
                      {nodes.map((node) => <SelectItem key={node.id} value={node.id}>{node.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Weight"
                    value={editEdgeWeight}
                    onChange={(e) => setEditEdgeWeight(e.target.value)}
                    className="w-36 text-base px-4 py-2"
                  />
                  <Button onClick={handleEditEdgeWeight} disabled={!editEdgeFrom || !editEdgeTo || !editEdgeWeight}>
                    Change
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">Select an edge and enter a new weight to update.</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{currentAlgorithm.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{currentAlgorithm.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-accent">{nodes.length}</div>
                <div className="text-sm text-muted-foreground">Vertices</div>
              </div>
              <div>
                <div className="text-lg font-bold text-accent">{edges.length}</div>
                <div className="text-sm text-muted-foreground">Edges</div>
              </div>
              <div>
                <div className="text-lg font-bold text-accent">
                  {traversalSteps[currentStep]?.visitedNodes.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Visited</div>
              </div>
              <div>
                <div className="text-lg font-bold text-accent">
                  {algorithm === "dijkstra"
                    ? (traversalSteps[currentStep]?.pq?.length || 0)
                    : (traversalSteps[currentStep]?.queue?.length || traversalSteps[currentStep]?.stack?.length || 0)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {algorithm === "bfs" ? "Queue" : algorithm === "dfs" ? "Stack" : algorithm === "dijkstra" ? "Priority Q" : "—"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {traversalSteps.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Auxiliary Data Structure & Details</CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm p-3 bg-accent/10 rounded-lg border border-accent/20 mb-4">
                {traversalSteps[currentStep]?.description || "Ready to start algorithm"}
              </div>
              {algorithm === "bfs" && traversalSteps[currentStep]?.queue && (
                <div>
                  <div className="text-sm font-medium mb-2">Queue (FIFO):</div>
                  <div className="flex gap-2 flex-wrap min-h-[40px] p-2 bg-muted/30 rounded-md border">
                    {traversalSteps[currentStep].queue!.length === 0 && <span className="text-muted-foreground text-sm italic">Empty</span>}
                    {traversalSteps[currentStep].queue!.map((nodeId, index) => (
                      <Badge key={index} variant="secondary" className="text-base px-3 py-1 bg-blue-100 text-blue-800 border-blue-200">
                        {nodeId}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {algorithm === "dfs" && traversalSteps[currentStep]?.stack && (
                <div>
                  <div className="text-sm font-medium mb-2">Stack (LIFO):</div>
                  <div className="flex gap-2 flex-wrap min-h-[40px] p-2 bg-muted/30 rounded-md border">
                    {traversalSteps[currentStep].stack!.length === 0 && <span className="text-muted-foreground text-sm italic">Empty</span>}
                    {traversalSteps[currentStep].stack!.map((nodeId, index) => (
                      <Badge key={index} variant="secondary" className="text-base px-3 py-1 bg-purple-100 text-purple-800 border-purple-200">
                        {nodeId}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {algorithm === "dijkstra" && traversalSteps[currentStep]?.pq && (
                <div>
                  <div className="text-sm font-medium mb-2">Priority Queue (Min-Heap):</div>
                  <div className="flex gap-2 flex-wrap min-h-[40px] p-2 bg-muted/30 rounded-md border">
                    {traversalSteps[currentStep].pq!.length === 0 && <span className="text-muted-foreground text-sm italic">Empty</span>}
                    {traversalSteps[currentStep].pq!.map((item, index) => (
                      <Badge key={index} variant="secondary" className="text-sm px-3 py-1 bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1">
                        <span className="font-bold">{item.node}</span>
                        <span className="text-xs opacity-70 border-l border-amber-300 pl-1 ml-1">d: {item.dist}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Legend</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border-2 border-gray-400 rounded-full"></div>
                <span>Unvisited</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>Start Node / Path Node</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span>Target Node</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span>Current Node</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span>Visited</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </VisualizerLayout>
  )
}
