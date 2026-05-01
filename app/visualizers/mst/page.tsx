"use client"
import { useState, useEffect, useRef } from "react"
import { VisualizerLayout } from "../../../components/visualizer-layout"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../components/ui/tabs"
import { Plus, Shuffle, Play, Pause, StepBack, StepForward, RotateCcw } from "lucide-react"
import type { JSX } from "react/jsx-runtime"

interface GraphNode {
  id: string
  label: string
  x: number
  y: number
  isVisited?: boolean
  isCurrentNode?: boolean
  isInMST?: boolean
}

interface GraphEdge {
  from: string
  to: string
  weight: number
  isHighlighted?: boolean
  isInMST?: boolean
}

interface MSTStep {
  description: string
  mstEdges: string[]
  visitedNodes?: string[]
  candidateEdges?: string[]
  codeLine?: number
  pq?: { node: string; key: number | string }[] // Changed key to string to support edge names in Kruskal's
  disjointSets?: { [root: string]: string[] }
}

type AlgorithmType = "prim" | "kruskal"

const pseudocodeDefinitions = {
  prim: [
    "function Prim(start):",
    "  initialize MST as empty",
    "  create min-priority queue Q",
    "  for each vertex v:",
    "    if v == start: key[v] = 0",
    "    else: key[v] = ∞",
    "    Q.insert(v, key[v])",
    "  while Q is not empty:",
    "    u = Q.extractMin()",
    "    add u to MST",
    "    for each neighbor v of u:",
    "      if v in Q and weight(u,v) < key[v]:",
    "        key[v] = weight(u,v)",
    "        parent[v] = u",
    "        Q.decreaseKey(v, key[v])",
  ],
  kruskal: [
    "function Kruskal():",
    "  initialize MST as empty",
    "  sort all edges by weight (ascending)",
    "  create disjoint-set (Union-Find) for all vertices",
    "  for each edge (u,v) in sorted order:",
    "    if Find(u) ≠ Find(v):",
    "      add (u,v) to MST",
    "      Union(u, v)",
  ],
}

// Union-Find for Kruskal
class UnionFind {
  parent: { [key: string]: string }
  rank: { [key: string]: number }

  constructor(nodes: string[]) {
    this.parent = {}
    this.rank = {}
    for (const node of nodes) {
      this.parent[node] = node
      this.rank[node] = 0
    }
  }

  find(x: string): string {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x])
    }
    return this.parent[x]
  }

  union(x: string, y: string): void {
    const rootX = this.find(x)
    const rootY = this.find(y)
    if (rootX === rootY) return
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX
    } else {
      this.parent[rootY] = rootX
      this.rank[rootX]++
    }
  }
}

// Get neighbors (undirected assumed for MST)
function getNeighbors(nodeId: string, edges: GraphEdge[]): string[] {
  const neighbors: string[] = []
  for (const edge of edges) {
    if (edge.from === nodeId) neighbors.push(edge.to)
    else if (edge.to === nodeId) neighbors.push(edge.from)
  }
  return neighbors
}

export default function MSTVisualizerPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [algorithm, setAlgorithm] = useState<AlgorithmType>("prim")
  const [startNode, setStartNode] = useState<string>("")
  const [newNodeLabel, setNewNodeLabel] = useState("")
  const [edgeFrom, setEdgeFrom] = useState("")
  const [edgeTo, setEdgeTo] = useState("")
  const [edgeWeight, setEdgeWeight] = useState("1")
  const [mstSteps, setMstSteps] = useState<MSTStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentPseudocode, setCurrentPseudocode] = useState<string[]>(pseudocodeDefinitions.prim)
  const [currentCodeLine, setCurrentCodeLine] = useState<number>(-1)

  // Delete controls
  const [deleteVertexId, setDeleteVertexId] = useState<string>("")
  const [deleteEdgeFrom, setDeleteEdgeFrom] = useState<string>("")
  const [deleteEdgeTo, setDeleteEdgeTo] = useState<string>("")

  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  // Initialize with sample graph
  useEffect(() => {
    const sampleNodes: GraphNode[] = [
      { id: "A", label: "A", x: 150, y: 100 },
      { id: "B", label: "B", x: 300, y: 50 },
      { id: "C", label: "C", x: 450, y: 100 },
      { id: "D", label: "D", x: 150, y: 250 },
      { id: "E", label: "E", x: 300, y: 200 },
      { id: "F", label: "F", x: 450, y: 250 },
    ]
    const sampleEdges: GraphEdge[] = [
      { from: "A", to: "B", weight: 4 },
      { from: "A", to: "D", weight: 2 },
      { from: "B", to: "C", weight: 3 },
      { from: "B", to: "E", weight: 1 },
      { from: "C", to: "F", weight: 2 },
      { from: "D", to: "E", weight: 5 },
      { from: "E", to: "F", weight: 1 },
      { from: "D", to: "B", weight: 6 },
    ]
    setNodes(sampleNodes)
    setEdges(sampleEdges)
    setStartNode("A")
  }, [])

  const addNode = () => {
    if (!newNodeLabel.trim()) return
    const id = newNodeLabel.toUpperCase()
    if (nodes.some(n => n.id === id)) return
    const newNode: GraphNode = {
      id,
      label: id,
      x: Math.random() * 400 + 100,
      y: Math.random() * 200 + 100,
    }
    setNodes([...nodes, newNode])
    setNewNodeLabel("")
  }

  const removeNode = (nodeId: string) => {
    setNodes(nodes.filter(n => n.id !== nodeId))
    setEdges(edges.filter(e => e.from !== nodeId && e.to !== nodeId))
    if (startNode === nodeId) setStartNode("")
  }

  const addEdge = () => {
    if (!edgeFrom || !edgeTo || edgeFrom === edgeTo) return
    const weight = Number(edgeWeight) || 1
    if (edges.some(e => (e.from === edgeFrom && e.to === edgeTo) || (e.from === edgeTo && e.to === edgeFrom))) return
    setEdges([...edges, { from: edgeFrom, to: edgeTo, weight }])
    setEdgeFrom("")
    setEdgeTo("")
    setEdgeWeight("1")
  }

  const removeEdge = (from: string, to: string) => {
    setEdges(edges.filter(e => !(e.from === from && e.to === to) && !(e.from === to && e.to === from)))
  }

  const generateRandomGraph = () => {
    const nodeCount = 6
    const newNodes: GraphNode[] = []
    const newEdges: GraphEdge[] = []
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i * 2 * Math.PI) / nodeCount
      const radius = 120
      const centerX = 300
      const centerY = 150
      newNodes.push({
        id: String.fromCharCode(65 + i),
        label: String.fromCharCode(65 + i),
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      })
    }
    const edgeSet = new Set<string>()
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (Math.random() > 0.5) {
          const weight = Math.floor(Math.random() * 9) + 1
          const edge: GraphEdge = { from: newNodes[i].id, to: newNodes[j].id, weight }
          const key = `${edge.from}-${edge.to}`
          if (!edgeSet.has(key)) {
            edgeSet.add(key)
            newEdges.push(edge)
          }
        }
      }
    }
    setNodes(newNodes)
    setEdges(newEdges)
    setStartNode(newNodes[0]?.id || "")
  }

  const resetGraph = () => {
    setNodes(nodes.map(n => ({ ...n, isVisited: false, isCurrentNode: false, isInMST: false })))
    setEdges(edges.map(e => ({ ...e, isHighlighted: false, isInMST: false })))
    setMstSteps([])
    setCurrentStep(0)
    setIsPlaying(false)
  }

  const performPrims = () => {
    if (!startNode || nodes.length === 0) return
    const steps: MSTStep[] = []
    const mstEdges: string[] = []
    const visited = new Set<string>()
    const key: { [key: string]: number } = {}
    const parent: { [key: string]: string | null } = {}
    const inQueue = new Set<string>(nodes.map(n => n.id))

    for (const node of nodes) {
      key[node.id] = node.id === startNode ? 0 : Infinity
      parent[node.id] = null
    }

    const getPQ = () => Array.from(inQueue).map(n => ({ node: n, key: key[n] })).sort((a, b) => a.key - b.key)

    steps.push({
      description: `Initialize keys. Start node: ${startNode}`,
      mstEdges: [],
      pq: getPQ(),
      codeLine: 6,
    })

    while (inQueue.size > 0) {
      let minNode = ""
      let minKey = Infinity
      for (const nodeId of inQueue) {
        if (key[nodeId] < minKey) {
          minKey = key[nodeId]
          minNode = nodeId
        }
      }
      if (minKey === Infinity) break

      inQueue.delete(minNode)
      visited.add(minNode)

      if (parent[minNode] !== null) {
        const edgeKey = `${parent[minNode]}-${minNode}`
        mstEdges.push(edgeKey)
        steps.push({
          description: `Added edge ${edgeKey} (weight: ${key[minNode]}) to MST`,
          mstEdges: [...mstEdges],
          visitedNodes: Array.from(visited),
          pq: getPQ(),
          codeLine: 10,
        })
      } else {
        steps.push({
          description: `Started from node ${minNode}`,
          mstEdges: [...mstEdges],
          visitedNodes: Array.from(visited),
          pq: getPQ(),
          codeLine: 9,
        })
      }

      const neighbors = getNeighbors(minNode, edges)
      for (const v of neighbors) {
        if (inQueue.has(v)) {
          const edge = edges.find(e =>
            (e.from === minNode && e.to === v) || (e.from === v && e.to === minNode)
          )
          if (edge && edge.weight < key[v]) {
            key[v] = edge.weight
            parent[v] = minNode
            steps.push({
              description: `Updated key of ${v} to ${edge.weight} via ${minNode}`,
              mstEdges: [...mstEdges],
              candidateEdges: [`${minNode}-${v}`],
              pq: getPQ(),
              codeLine: 13,
            })
          }
        }
      }
    }

    setMstSteps(steps)
    setCurrentPseudocode(pseudocodeDefinitions.prim)
  }

  const performKruskal = () => {
    if (nodes.length === 0) return
    const steps: MSTStep[] = []
    const mstEdges: string[] = []
    const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight)
    const uf = new UnionFind(nodes.map(n => n.id))

    const getDisjointSets = () => {
      const sets: { [root: string]: string[] } = {}
      for (const node of nodes) {
        const root = uf.find(node.id)
        if (!sets[root]) sets[root] = []
        sets[root].push(node.id)
      }
      return sets
    }

    steps.push({
      description: "Sorted all edges by weight",
      mstEdges: [],
      pq: sortedEdges.map(e => ({ node: `${e.from}-${e.to}`, key: e.weight })),
      disjointSets: getDisjointSets(),
      codeLine: 3,
    })

    for (const edge of sortedEdges) {
      const u = edge.from
      const v = edge.to
      const rootU = uf.find(u)
      const rootV = uf.find(v)

      steps.push({
        description: `Checking edge ${u}-${v} (weight: ${edge.weight})`,
        mstEdges: [...mstEdges],
        candidateEdges: [`${u}-${v}`],
        pq: sortedEdges.slice(sortedEdges.indexOf(edge)).map(e => ({ node: `${e.from}-${e.to}`, key: e.weight })),
        disjointSets: getDisjointSets(),
        codeLine: 5,
      })

      if (rootU !== rootV) {
        uf.union(u, v)
        mstEdges.push(`${u}-${v}`)
        steps.push({
          description: `Added edge ${u}-${v} to MST`,
          mstEdges: [...mstEdges],
          pq: sortedEdges.slice(sortedEdges.indexOf(edge) + 1).map(e => ({ node: `${e.from}-${e.to}`, key: e.weight })),
          disjointSets: getDisjointSets(),
          codeLine: 7,
        })
      } else {
        steps.push({
          description: `Skipped edge ${u}-${v} (would form cycle)`,
          mstEdges: [...mstEdges],
          pq: sortedEdges.slice(sortedEdges.indexOf(edge) + 1).map(e => ({ node: `${e.from}-${e.to}`, key: e.weight })),
          disjointSets: getDisjointSets(),
          codeLine: 5,
        })
      }

      if (mstEdges.length === nodes.length - 1) break
    }

    setMstSteps(steps)
    setCurrentPseudocode(pseudocodeDefinitions.kruskal)
  }

  const startAlgorithm = () => {
    resetGraph()
    setCurrentStep(0)
    if (algorithm === "prim") {
      performPrims()
    } else {
      performKruskal()
    }
  }

  const stepForward = () => {
    if (currentStep < mstSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const stepBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const play = () => {
    if (mstSteps.length === 0) startAlgorithm()
    setIsPlaying(true)
  }

  const pause = () => setIsPlaying(false)

  const reset = () => resetGraph()

  useEffect(() => {
    if (isPlaying && currentStep < mstSteps.length - 1) {
      const timer = setTimeout(stepForward, 1500)
      return () => clearTimeout(timer)
    } else if (currentStep >= mstSteps.length - 1) {
      setIsPlaying(false)
    }
  }, [isPlaying, currentStep, mstSteps.length])

  useEffect(() => {
    if (mstSteps[currentStep]?.codeLine !== undefined) {
      setCurrentCodeLine(mstSteps[currentStep].codeLine)
    }
  }, [currentStep, mstSteps])

  // Drag handlers
  const svgRefLocal = svgRef
  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    setIsDragging(true)
    setDraggedNodeId(nodeId)
    const svgRect = svgRefLocal.current?.getBoundingClientRect()
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
          ? { ...node, x: Math.max(20, Math.min(580, newX)), y: Math.max(20, Math.min(280, newY)) }
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
              ? { ...node, x: Math.max(20, Math.min(580, newX)), y: Math.max(20, Math.min(280, newY)) }
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
    const current = mstSteps[currentStep] || { mstEdges: [], candidateEdges: [] }
    const mstEdgeSet = new Set(current.mstEdges)
    const candidateSet = new Set(current.candidateEdges || [])

    return (
      <svg
        ref={svgRef}
        viewBox="0 0 600 300"
        className="w-full h-auto max-w-[600px] border rounded-lg bg-white"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {edges.map((edge, index) => {
          const fromNode = nodes.find(n => n.id === edge.from)
          const toNode = nodes.find(n => n.id === edge.to)
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

          const edgeKey1 = `${edge.from}-${edge.to}`
          const edgeKey2 = `${edge.to}-${edge.from}`
          const isInMST = mstEdgeSet.has(edgeKey1) || mstEdgeSet.has(edgeKey2)
          const isCandidate = candidateSet.has(edgeKey1) || candidateSet.has(edgeKey2)

          return (
            <g key={index}>
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={isInMST ? "#22c55e" : isCandidate ? "#6366f1" : "#e5e7eb"}
                strokeWidth={isInMST ? "4" : isCandidate ? "3" : "2"}
                style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
              />
              <text
                x={(startX + endX) / 2 + 10 * -normY}
                y={(startY + endY) / 2 + 10 * normX}
                textAnchor="middle"
                className="text-xs font-bold fill-blue-600"
                style={{ userSelect: "none" }}
              >
                {edge.weight}
              </text>
            </g>
          )
        })}
        {nodes.map((node) => {
          const isInMST = mstSteps[currentStep]?.mstEdges?.some(e =>
            e.includes(node.id)
          ) || node.id === startNode
          const isVisited = mstSteps[currentStep]?.visitedNodes?.includes(node.id)
          const isCurrent = algorithm === "prim" && mstSteps[currentStep]?.visitedNodes?.at(-1) === node.id

          return (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r="20"
                fill={isInMST ? "#22c55e" : isCurrent ? "#6366f1" : isVisited ? "#f59e0b" : "#ffffff"}
                stroke={isInMST ? "#16a34a" : isCurrent ? "#4f46e5" : isVisited ? "#d97706" : "#6b7280"}
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
                fill={isInMST || isCurrent || isVisited ? "#ffffff" : "#374151"}
              >
                {node.label}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }

  const algorithmInfo = {
    prim: {
      name: "Prim's Algorithm",
      description: "Grows an MST from a chosen start vertex by repeatedly taking the cheapest edge that connects the tree to a new vertex.",
      timeComplexity: "O(E log V) with a binary heap (dense graphs often perform well).",
      spaceComplexity: "O(V) for keys/parents/queue.",
      whenToUse: [
        "Graphs where you care about connecting from a specific start.",
        "Dense graphs (Prim’s with heaps is efficient).",
      ],
      keyIdeas: [
        "Maintain a key (best known edge weight) for each non-tree vertex.",
        "Use a priority structure to pick the minimum key vertex.",
      ],
    },
    kruskal: {
      name: "Kruskal's Algorithm",
      description: "Sorts all edges by weight and adds the next lightest edge that doesn’t make a cycle, using Union–Find to detect cycles.",
      timeComplexity: "O(E log E) for edge sort (≈ O(E log V)).",
      spaceComplexity: "O(V) for Union–Find.",
      whenToUse: [
        "Sparse graphs.",
        "You want a simple global greedy rule independent of a start vertex.",
      ],
      keyIdeas: [
        "Sort edges by weight.",
        "Use Union–Find (Disjoint Sets) to avoid cycles.",
      ],
    },
  }

  const currentAlgorithm = algorithmInfo[algorithm]

  useEffect(() => {
    setCurrentPseudocode(pseudocodeDefinitions[algorithm])
    setCurrentCodeLine(-1)
  }, [algorithm])

  const applications = [
    {
      title: "Network Design",
      description: "Designing cost-effective telecom or computer networks",
      examples: ["Cable TV networks", "Road planning", "Electrical grids"],
    },
    {
      title: "Clustering",
      description: "Grouping data points by minimizing intra-cluster distance",
      examples: ["Image segmentation", "Gene expression analysis"],
    },
    {
      title: "Approximation Algorithms",
      description: "Used in approximations for NP-hard problems like TSP",
      examples: ["Traveling Salesman heuristic", "Facility location"],
    },
  ]

  const MSTConcepts = (
    <div className="space-y-6">
      <Card className="bg-card shadow-md border border-border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            What is a Minimum Spanning Tree?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm md:text-base">
          <p>
            An <strong>MST</strong> is a subset of edges that connects all vertices of a connected, undirected, weighted graph with the minimum possible total edge weight, without forming any cycles.
          </p>
          <div className="p-4 bg-muted/30 border rounded-lg shadow-sm space-y-2 mt-4">
            <h4 className="font-semibold text-foreground text-sm">Key Properties:</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>For a graph with <strong>V</strong> vertices, an MST always contains exactly <strong>V - 1</strong> edges.</li>
              <li>If all edge weights in the graph are unique, there is only exactly <strong>one</strong> true MST. If weights repeat, there can be multiple valid MSTs with the same total minimum weight.</li>
              <li>An MST is not necessarily the shortest path between any two specific nodes (that's Dijkstra's job). Instead, it minimizes the cost of connecting the <em>entire network</em>.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              Prim's Algorithm (Vertex-Centric)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
            <p className="text-xs">
              Prim's grows a single, contiguous tree outward. It drops a seed (a chosen start vertex) and repeatedly pulls in the closest, cheapest neighbor to its expanding tree until everyone is connected.
            </p>

            <div className="space-y-3 mt-2">
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">How it works:</h4>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>Start at an arbitrary vertex.</li>
                  <li>Look at all available edges radiating out from your current tree.</li>
                  <li>Pick the very cheapest one that connects to an unvisited vertex.</li>
                  <li>Repeat until all vertices are reached.</li>
                </ul>
              </div>
              <div className="bg-muted/30 p-2 rounded">
                <h4 className="font-semibold text-foreground mb-1 text-[11px] uppercase tracking-wider">Time Complexity & Use Case</h4>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="font-mono bg-muted/50 border-primary/20">O(E log V)</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">Very efficient for <strong>dense graphs</strong> (where V &lt;&lt; E). Uses a Min-Priority Queue to instantly find the next cheapest edge.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              Kruskal's Algorithm (Edge-Centric)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
            <p className="text-xs">
              Kruskal's ignores where edges are. Instead, it sorts every single edge in the world by price from cheapest to most expensive, and buys them one by one as long as they don't create a loop.
            </p>

            <div className="space-y-3 mt-2">
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">How it works:</h4>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>Sort all edges by weight, lowest to highest.</li>
                  <li>Iterate through the sorted queue. If adding the edge creates a cycle, throw it away.</li>
                  <li>If it connects two separate clusters safely, keep it.</li>
                </ul>
              </div>
              <div className="bg-muted/30 p-2 rounded flex flex-col">
                <h4 className="font-semibold text-foreground mb-1 text-[11px] uppercase tracking-wider">Time Complexity & Use Case</h4>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="font-mono bg-muted/50 border-primary/20">O(E log E) or O(E log V)</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">Often preferred for <strong>sparse graphs</strong>. Heavily relies on the <strong>Union-Find (Disjoint Set)</strong> data structure to detect cycles instantly in near <code>O(1)</code> time.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <VisualizerLayout
      title="Minimum Spanning Tree Visualizer"
      description="Learn Prim's and Kruskal's algorithms for MST"
      difficulty="Advanced"
      currentStep={currentStep}
      totalSteps={mstSteps.length}
      complexity={{
        time: algorithm === "prim" ? "O(E log V)" : "O(E log E)",
        space: "O(V)",
      }}
      applications={applications}
      concepts={MSTConcepts}
    >
      <div className="w-full space-y-6">

        {/* ===== TOP: Algorithm Selector & Controls ===== */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Choose Algorithm</CardTitle>
              <CardDescription className="space-y-4 text-sm text-muted-foreground">Select the algorithm to visualize</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={algorithm}
                onValueChange={(val: string) => setAlgorithm(val as AlgorithmType)}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="prim">Prim&apos;s</TabsTrigger>
                  <TabsTrigger value="kruskal">Kruskal&apos;s</TabsTrigger>
                </TabsList>
                {/* Small inline hints */}
                <TabsContent value="prim" className="mt-3 text-sm text-muted-foreground">
                  Start-based, great for dense graphs. Set a <b>Start Node</b> below if needed.
                </TabsContent>
                <TabsContent value="kruskal" className="mt-3 text-sm text-muted-foreground">
                  Edge-sorted approach, simple with Union–Find, ideal for sparse graphs.
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Algorithm Controls</CardTitle>
              <CardDescription className="space-y-4 text-sm text-muted-foreground">Play, pause, and step through the algorithm</CardDescription>
            </CardHeader>
            <CardContent className="h-full flex flex-col justify-center pb-8">
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={play} disabled={isPlaying || currentStep === mstSteps.length - 1}>
                  <Play className="w-4 h-4 mr-2" /> Play
                </Button>
                <Button onClick={pause} disabled={!isPlaying} variant="outline">
                  <Pause className="w-4 h-4 mr-2" /> Pause
                </Button>
                <Button onClick={stepBack} disabled={isPlaying || currentStep === 0} variant="outline">
                  <StepBack className="w-4 h-4" />
                </Button>
                <Button onClick={stepForward} disabled={isPlaying || currentStep === mstSteps.length - 1} variant="outline">
                  <StepForward className="w-4 h-4" />
                </Button>
                <Button onClick={reset} disabled={isPlaying || (currentStep === 0 && mstSteps.length === 0)} variant="outline">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Graph */}
        <div className="flex justify-center p-4 bg-muted/10 rounded-lg">{renderGraph()}</div>

        {/* Pseudocode and Aux Panel */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="h-fit">
            <CardHeader className="pb-3">
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

          {/* Auxiliary Data Structure (Min-PQ / Disjoint Sets) */}
          <Card className="h-fit flex flex-col md:col-span-2 lg:col-span-1 border-primary/20">
            <CardHeader className="py-3 px-4 bg-muted/50 border-b">
              <CardTitle className="flex items-center justify-between text-sm">
                <span>{algorithm === "prim" ? "Min-Priority Queue" : "Edge Queue & Disjoint Sets"}</span>
              </CardTitle>
            </CardHeader>
            <div className="p-4 flex-1 flex flex-col gap-4 bg-muted/10 rounded-b-md min-h-[220px] overflow-hidden">
              {mstSteps.length > 0 && currentStep < mstSteps.length ? (
                algorithm === "prim" ? (
                  /* Prim's Priority Queue Visualization */
                  <div className="w-full overflow-x-auto pb-2">
                    <div className="flex gap-2 items-center min-w-max px-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase mr-2 shrink-0">Min</span>
                      {!mstSteps[currentStep].pq || mstSteps[currentStep].pq!.length === 0 ? (
                        <div className="px-4 py-2 border-2 border-dashed border-muted rounded-md text-muted-foreground italic text-sm">Empty Queue</div>
                      ) : (
                        mstSteps[currentStep].pq!.map((item, idx) => (
                          <div key={`${idx}-${item.node}`} className="flex flex-col items-center">
                            <div className={`w-14 h-14 flex flex-col items-center justify-center font-bold rounded-md shadow-sm border ${idx === 0 ? 'bg-orange-100 border-orange-400 text-orange-900 scale-105' : 'bg-background border-border text-foreground'}`}>
                              <span className="text-sm">{item.node}</span>
                              <span className="text-xs text-muted-foreground font-mono mt-0.5">{item.key === Infinity ? '∞' : item.key}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  /* Kruskal's Queue + sets */
                  <div className="flex flex-col gap-4 h-full">
                    {/* Edge Queue */}
                    <div className="w-full overflow-x-auto pb-2">
                      <div className="flex gap-2 items-center min-w-max px-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase mr-2 shrink-0">Eval</span>
                        {!mstSteps[currentStep].pq || mstSteps[currentStep].pq!.length === 0 ? (
                          <div className="px-4 py-2 border-2 border-dashed border-muted rounded-md text-muted-foreground italic text-sm">Empty</div>
                        ) : (
                          mstSteps[currentStep].pq!.map((item, idx) => (
                            <div key={`${idx}-${item.node}`} className="flex flex-col items-center">
                              <div className={`px-3 py-1.5 flex flex-col items-center justify-center font-bold rounded-sm shadow-sm border ${idx === 0 ? 'bg-blue-100 border-blue-400 text-blue-900 scale-105' : 'bg-background border-border text-foreground'}`}>
                                <span className="text-xs">{item.node}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">w:{item.key}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    {/* Disjoint Sets Visualization */}
                    <div className="w-full h-full flex flex-wrap gap-2 content-start overflow-y-auto max-h-[150px] p-1 border-t pt-3">
                      <div className="w-full text-xs font-bold text-muted-foreground uppercase mb-1">Union-Find Trees</div>
                      {!mstSteps[currentStep].disjointSets || Object.keys(mstSteps[currentStep].disjointSets!).length === 0 ? (
                        <div className="w-full py-4 text-center border-2 border-dashed border-muted rounded-md text-muted-foreground italic text-sm">
                          Initializing Sets...
                        </div>
                      ) : (
                        Object.entries(mstSteps[currentStep].disjointSets!).map(([root, members], idx) => (
                          <div key={root} className="flex flex-col border border-border rounded-md shadow-sm bg-background overflow-hidden flex-1 min-w-[80px]">
                            <div className="bg-slate-100 px-2 text-[10px] font-bold text-center border-b">Root: {root}</div>
                            <div className="p-1.5 flex gap-1 flex-wrap justify-center">
                              {members.map(member => (
                                <span key={member} className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full text-white ${member === root ? 'bg-indigo-600' : 'bg-indigo-400'}`}>
                                  {member}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground italic">
                  Start algorithm to view {algorithm === "prim" ? "Priority Queue" : "Data Structures"}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Controls */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* (Moved algorithm selection to top — this card now shows start node + actions/info) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Start Node (Prim&apos;s)</CardTitle>
              <CardDescription>Only used when Prim&apos;s is selected</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={startNode} onValueChange={setStartNode} disabled={algorithm !== "prim"}>
                <SelectTrigger>
                  <SelectValue placeholder="Start node" />
                </SelectTrigger>
                <SelectContent>
                  {nodes.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={generateRandomGraph} className="w-full">
                <Shuffle className="h-4 w-4 mr-2" />
                Random Graph
              </Button>
              <Button variant="secondary" onClick={startAlgorithm} className="w-full">
                Run {algorithm === "prim" ? "Prim's" : "Kruskal's"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Graph Info</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div>Vertices: {nodes.length}</div>
              <div>Edges: {edges.length}</div>
              <div className="text-muted-foreground mt-1">MST requires undirected, weighted graph</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Run Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>• Press <b>Play</b> for auto steps or step manually.</div>
              <div>• Add/remove nodes/edges to test scenarios.</div>
              <div>• Edge colors: <span className="text-green-600 font-medium">MST</span>, <span className="text-blue-600 font-medium">Candidate</span>.</div>
            </CardContent>
          </Card>
        </div>

        {/* Add/Delete */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Vertex</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Label (A-Z)"
                  value={newNodeLabel}
                  onChange={(e) => setNewNodeLabel(e.target.value)}
                  maxLength={1}
                />
                <Button onClick={addNode} disabled={!newNodeLabel.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Edge</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Select value={edgeFrom} onValueChange={setEdgeFrom}>
                  <SelectTrigger><SelectValue placeholder="From" /></SelectTrigger>
                  <SelectContent>
                    {nodes.map(n => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={edgeTo} onValueChange={setEdgeTo}>
                  <SelectTrigger><SelectValue placeholder="To" /></SelectTrigger>
                  <SelectContent>
                    {nodes.map(n => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Weight"
                  value={edgeWeight}
                  onChange={(e) => setEdgeWeight(e.target.value)}
                  className="w-24"
                  min="1"
                />
                <Button onClick={addEdge} disabled={!edgeFrom || !edgeTo}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Delete */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delete Vertex</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Select value={deleteVertexId} onValueChange={setDeleteVertexId}>
                  <SelectTrigger><SelectValue placeholder="Vertex" /></SelectTrigger>
                  <SelectContent>
                    {nodes.map(n => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (deleteVertexId) removeNode(deleteVertexId)
                    setDeleteVertexId("")
                  }}
                  disabled={!deleteVertexId}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delete Edge</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Select value={deleteEdgeFrom} onValueChange={setDeleteEdgeFrom}>
                  <SelectTrigger><SelectValue placeholder="From" /></SelectTrigger>
                  <SelectContent>
                    {nodes.map(n => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={deleteEdgeTo} onValueChange={setDeleteEdgeTo}>
                  <SelectTrigger><SelectValue placeholder="To" /></SelectTrigger>
                  <SelectContent>
                    {nodes.map(n => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
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

        {/* Current Step */}
        {mstSteps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step Details & Auxiliary Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm p-3 bg-accent/10 rounded-lg border border-accent/20">
                {mstSteps[currentStep]?.description || "Ready to start"}
              </div>

              {algorithm === "prim" && mstSteps[currentStep]?.pq && (
                <div>
                  <div className="text-sm font-medium mb-2 text-muted-foreground">Priority Queue (Min-Heap):</div>
                  <div className="flex gap-2 flex-wrap min-h-[40px] p-2 bg-muted/30 rounded-md border">
                    {mstSteps[currentStep].pq!.length === 0 && <span className="text-muted-foreground text-sm italic">Empty</span>}
                    {mstSteps[currentStep].pq!.map((item, index) => (
                      <Badge key={index} variant="secondary" className="text-sm px-3 py-1 bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1">
                        <span className="font-bold">{item.node}</span>
                        <span className="text-xs opacity-70 border-l border-amber-300 pl-1 ml-1">{item.key === Infinity ? '∞' : item.key}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {algorithm === "kruskal" && mstSteps[currentStep]?.disjointSets && (
                <div>
                  <div className="text-sm font-medium mb-2 text-muted-foreground">Disjoint Sets (Union-Find):</div>
                  <div className="flex gap-2 flex-wrap min-h-[40px] p-2 bg-muted/30 rounded-md border">
                    {Object.entries(mstSteps[currentStep].disjointSets!).map(([root, members], index) => (
                      <div key={index} className="flex flex-col border rounded-md overflow-hidden text-xs">
                        <div className="bg-slate-200 text-slate-800 font-bold px-2 py-1 text-center border-b">Set {root}</div>
                        <div className="bg-slate-50 px-2 py-1">{members.join(", ")}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mstSteps[currentStep]?.mstEdges && (
                <div>
                  <div className="text-sm font-medium mb-1 text-muted-foreground">MST Edges ({mstSteps[currentStep].mstEdges.length}):</div>
                  <div className="flex gap-1 flex-wrap">
                    {mstSteps[currentStep].mstEdges.length === 0 && <span className="text-muted-foreground text-sm italic">None</span>}
                    {mstSteps[currentStep].mstEdges.map((e, i) => (
                      <Badge key={i} variant="outline" className="bg-green-50 text-green-800 border-green-200">{e}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border-2 border-gray-400 rounded-full"></div>
                <span>Not in MST</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>In MST</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span>Current / Candidate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span>Visited (Prim&apos;s)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </VisualizerLayout>
  )
}
