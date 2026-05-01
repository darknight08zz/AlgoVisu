"use client"

import { useState, useEffect, useCallback } from "react"
import { VisualizerLayout } from "../../../components/visualizer-layout"
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { Plus, Trash2, RefreshCcw, GitBranch, Play, Square, RotateCcw } from "lucide-react"
import type { JSX } from "react/jsx-runtime"

interface TreeNode {
  value: number
  id: string
  left?: TreeNode | null
  right?: TreeNode | null
  x?: number
  y?: number
  isHighlighted?: boolean
  isVisited?: boolean
  isFound?: boolean
  isBeingInserted?: boolean
}

interface TraversalStep {
  node: TreeNode
  description: string
  visitedNodes: string[]
  currentPath: string[]
  codeLine?: number
  queueValues?: number[]
  callStackValues?: number[]
}

type TraversalType = "inorder" | "preorder" | "postorder" | "levelorder"
type TreeMode = "binary" | "bst"

/*\Size constants*/
const SVG_W = 900
const SVG_H = 430
const NODE_RADIUS = 25
const H_GAP_BASE = 250
const V_GAP = 88
const MIN_H_SPACING = 58


const treesIntro = {
  bullets: [
    "A tree is a hierarchical structure with a root node and child subtrees; there are no cycles.",
    "A Binary Tree (BT) allows up to two children per node (left/right) but has no ordering rule.",
    "A Binary Search Tree (BST) enforces an order: left < node < right, enabling efficient search.",
    "Height h is the longest path (in edges) from root to a leaf; many operations depend on h.",
  ],
  diagram: [
    "          (root)",
    "           /  \\",
    "        (L)    (R)",
    "        / \\    / \\",
    "      ... ... ... ...",
  ],
}

const modeDetails: Record<TreeMode, {
  title: string
  summary: string
  how: string[]
  pros: string[]
  cons: string[]
  useCases: string[]
  complexity: { insert: string; search: string; delete: string; traverse: string }
  diagram: string[]
}> = {
  binary: {
    title: "Binary Tree (BT)",
    summary:
      "A generic binary tree limits each node to at most two children. It does not impose ordering between left/right.",
    how: [
      "Each node has up to two pointers: left and right.",
      "Shape is arbitrary (not necessarily balanced).",
      "Commonly built level-by-level (BFS) for examples/demos.",
    ],
    pros: [
      "Very flexible — can represent expressions, heaps, segment trees, etc.",
      "Clear recursive structure for traversals (inorder/preorder/postorder).",
    ],
    cons: [
      "No value-based ordering, so search is O(n).",
      "Without additional constraints/balancing, height can be large.",
    ],
    useCases: [
      "Expression/Syntax Trees (Compilers/Calculators)",
      "Heaps (priority queues, but with heap property instead of BST order)",
      "Complete/Full tree demonstrations in education",
    ],
    complexity: { insert: "O(1)–O(n) (depends on strategy)", search: "O(n)", delete: "O(n)", traverse: "O(n)" },
    diagram: [
      "     10",
      "    /  \\",
      "  20    30",
      " / \\   / \\",
      "40 50 60 70",
    ],
  },
  bst: {
    title: "Binary Search Tree (BST)",
    summary:
      "A BST enforces ordering: left subtree values < node < right subtree values. Average search/insert/delete are O(log n) when height is small.",
    how: [
      "Insert compares and descends left/right based on value.",
      "Search follows the same rule (like binary search on a path).",
      "Delete handles 0/1/2-child cases (replace with inorder successor/predecessor).",
    ],
    pros: [
      "Efficient average search/insert/delete: O(log n) if height is small.",
      "Keeps elements in sorted order (inorder traversal yields ascending values).",
    ],
    cons: [
      "Can become skewed (degraded to a linked list) → O(n) operations.",
      "Needs balancing (AVL, Red-Black, etc.) to guarantee O(log n).",
    ],
    useCases: [
      "Symbol tables / dictionaries (conceptually)",
      "Auto-complete ranges (with augmented data)",
      "Maintaining a dynamic sorted set of keys",
    ],
    complexity: {
      insert: "O(log n) avg, O(n) worst",
      search: "O(log n) avg, O(n) worst",
      delete: "O(log n) avg, O(n) worst",
      traverse: "O(n)",
    },
    diagram: [
      "        50",
      "       /  \\",
      "     30    70",
      "    / \\   / \\",
      "  20  40 60  80",
      " (L<R<Node<R)",
    ],
  },
}


export default function TreeVisualizerPage() {
  const [root, setRoot] = useState<TreeNode | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [searchValue, setSearchValue] = useState("")
  const [traversalType, setTraversalType] = useState<TraversalType>("inorder")
  const [traversalSteps, setTraversalSteps] = useState<TraversalStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [traversalResult, setTraversalResult] = useState<number[]>([])
  const [treeHeight, setTreeHeight] = useState(0)
  const [nodeCount, setNodeCount] = useState(0)
  const [speed, setSpeed] = useState<[number]>([1000])
  const [deleteValue, setDeleteValue] = useState("")
  const [mode, setMode] = useState<TreeMode>("bst")

  const applications = [
    {
      title: "Database Indexing",
      description: "B-trees and B+ trees optimize database queries and storage efficiency",
      examples: ["MySQL InnoDB indexes", "PostgreSQL B-tree indexes", "Database query optimization"],
    },
    {
      title: "File System Organization",
      description: "Operating systems use tree structures to organize files and directories",
      examples: ["Directory hierarchies", "File allocation tables", "Filesystem metadata"],
    },
    {
      title: "Expression Parsing",
      description: "Compilers use syntax trees to parse and evaluate mathematical expressions",
      examples: ["Abstract syntax trees", "Compiler design", "Mathematical expression evaluation"],
    },
    {
      title: "Decision Making Systems",
      description: "Decision trees help in machine learning and automated decision processes",
      examples: ["Machine learning algorithms", "Expert systems", "Game AI decision trees"],
    },
  ]

  useEffect(() => {
    resetTree()
  }, [mode])

  const resetTree = () => {
    if (mode === "bst") {
      const sampleBST: TreeNode = {
        value: 50, id: "50",
        left: { value: 30, id: "30", left: { value: 20, id: "20" }, right: { value: 40, id: "40" } },
        right: { value: 70, id: "70", left: { value: 60, id: "60" }, right: { value: 80, id: "80" } },
      }
      setRoot(sampleBST)
      calculateTreeMetrics(sampleBST)
    } else {
      const sampleBT: TreeNode = {
        value: 10, id: "10",
        left: { value: 20, id: "20", left: { value: 40, id: "40" }, right: { value: 50, id: "50" } },
        right: { value: 30, id: "30", left: { value: 60, id: "60" }, right: { value: 70, id: "70" } },
      }
      setRoot(sampleBT)
      calculateTreeMetrics(sampleBT)
    }
    resetTraversal()
  }

  const resetTraversal = () => {
    setTraversalSteps([])
    setTraversalResult([])
    setCurrentStep(0)
    setIsPlaying(false)
  }

  const calculateTreeMetrics = (node: TreeNode | null): void => {
    if (!node) {
      setTreeHeight(0)
      setNodeCount(0)
      return
    }
    const getHeight = (n: TreeNode | null): number => (!n ? 0 : 1 + Math.max(getHeight(n.left || null), getHeight(n.right || null)))
    const countNodes = (n: TreeNode | null): number => (!n ? 0 : 1 + countNodes(n.left || null) + countNodes(n.right || null))
    setTreeHeight(getHeight(node))
    setNodeCount(countNodes(node))
  }

  const insertNode = (value: number): void => {
    if (value === undefined || value === null || isNaN(value)) return
    const newNode: TreeNode = { value, id: `${value}-${Date.now()}` }

    if (!root) {
      setRoot(newNode)
      calculateTreeMetrics(newNode)
      setInputValue("")
      resetTraversal()
      return
    }

    if (mode === "bst") {
      const insert = (node: TreeNode | null, val: number): TreeNode => {
        if (!node) return { value: val, id: val.toString() }
        if (val < node.value) node.left = insert(node.left || null, val)
        else if (val > node.value) node.right = insert(node.right || null, val)
        return node
      }
      const newRoot = insert(root, value)
      setRoot({ ...newRoot })
      calculateTreeMetrics(newRoot)
    } else {

      const insertLevelOrder = (r: TreeNode, n: TreeNode): TreeNode => {
        const q: TreeNode[] = [r]
        while (q.length) {
          const cur = q.shift()!
          if (!cur.left) { cur.left = n; return r }
          if (!cur.right) { cur.right = n; return r }
          q.push(cur.left)
          q.push(cur.right)
        }
        return r
      }
      const newRoot = insertLevelOrder({ ...root }, newNode)
      setRoot(newRoot)
      calculateTreeMetrics(newRoot)
    }

    setInputValue("")
    resetTraversal()
  }

  const searchNode = (value: number): boolean => {
    if (!root) return false
    const search = (node: TreeNode | null, val: number): boolean => {
      if (!node) return false
      if (node.value === val) { node.isFound = true; return true }
      node.isVisited = true
      return search(node.left || null, val) || search(node.right || null, val)
    }
    resetNodeStates(root)
    const found = search(root, value)
    setRoot({ ...root })
    return found
  }

  const resetNodeStates = (node: TreeNode | null): void => {
    if (!node) return
    node.isHighlighted = node.isVisited = node.isFound = node.isBeingInserted = false
    resetNodeStates(node.left || null)
    resetNodeStates(node.right || null)
  }

  const deleteNode = (value: number): void => {
    if (!root) return
    if (mode === "bst") {
      const findMin = (n: TreeNode): TreeNode => { while (n.left) n = n.left; return n }
      const helper = (n: TreeNode | null, val: number): TreeNode | null => {
        if (!n) return null
        if (val < n.value) n.left = helper(n.left || null, val)
        else if (val > n.value) n.right = helper(n.right || null, val)
        else {
          if (!n.left) return n.right || null
          if (!n.right) return n.left || null
          const minRight = findMin(n.right!)
          n.value = minRight.value
          n.id = minRight.id
          n.right = helper(n.right, minRight.value)
        }
        return n
      }
      const newRoot = helper(root, value)
      setRoot(newRoot)
      calculateTreeMetrics(newRoot)
    } else {
      alert("Deletion in generic Binary Tree is complex and often not visualized. Try BST mode for deletion.")
      return
    }
    resetTraversal()
  }

  const pseudocodeDefinitions = {
    inorder: [
      "function inorder(node):",
      "  if node is null:",
      "    return",
      "  inorder(node.left)",
      "  visit(node)",
      "  inorder(node.right)",
    ],
    preorder: [
      "function preorder(node):",
      "  if node is null:",
      "    return",
      "  visit(node)",
      "  preorder(node.left)",
      "  preorder(node.right)",
    ],
    postorder: [
      "function postorder(node):",
      "  if node is null:",
      "    return",
      "  postorder(node.left)",
      "  postorder(node.right)",
      "  visit(node)",
    ],
    levelorder: [
      "function levelorder(root):",
      "  if root is null:",
      "    return",
      "  queue = [root]",
      "  while queue is not empty:",
      "    node = queue.pop()",
      "    visit(node)",
      "    if node.left:",
      "      queue.push(node.left)",
      "    if node.right:",
      "      queue.push(node.right)",
    ],
  }

  const performTraversal = (type: TraversalType): void => {
    if (!root) return

    const steps: TraversalStep[] = []
    const result: number[] = []
    const visited: string[] = []

    const pushStep = (node: TreeNode, description: string, codeLine: number, currentPath: string[] = [], qValues?: number[], csValues?: number[]) => {
      steps.push({ node, description, visitedNodes: [...visited], currentPath, codeLine, queueValues: qValues, callStackValues: csValues })
    }

    const inorderTraversal = (node: TreeNode | null, path: string[] = [], valuePath: number[] = []): void => {
      if (!node) { pushStep({ value: -1, id: "null" } as TreeNode, "Node is null, return", 2, path, undefined, valuePath); return }
      const p = [...path, node.id]
      const vp = [...valuePath, node.value]
      pushStep(node, `Traverse left of ${node.value}`, 4, p, undefined, vp)
      inorderTraversal(node.left || null, p, vp)
      visited.push(node.id); result.push(node.value)
      pushStep(node, `Visit node ${node.value}`, 5, p, undefined, vp)
      pushStep(node, `Traverse right of ${node.value}`, 6, p, undefined, vp)
      inorderTraversal(node.right || null, p, vp)
    }

    const preorderTraversal = (node: TreeNode | null, path: string[] = [], valuePath: number[] = []): void => {
      if (!node) { pushStep({ value: -1, id: "null" } as TreeNode, "Node is null, return", 2, path, undefined, valuePath); return }
      const p = [...path, node.id]
      const vp = [...valuePath, node.value]
      visited.push(node.id); result.push(node.value)
      pushStep(node, `Visit node ${node.value}`, 4, p, undefined, vp)
      pushStep(node, `Traverse left of ${node.value}`, 5, p, undefined, vp)
      preorderTraversal(node.left || null, p, vp)
      pushStep(node, `Traverse right of ${node.value}`, 6, p, undefined, vp)
      preorderTraversal(node.right || null, p, vp)
    }

    const postorderTraversal = (node: TreeNode | null, path: string[] = [], valuePath: number[] = []): void => {
      if (!node) { pushStep({ value: -1, id: "null" } as TreeNode, "Node is null, return", 2, path, undefined, valuePath); return }
      const p = [...path, node.id]
      const vp = [...valuePath, node.value]
      pushStep(node, `Traverse left of ${node.value}`, 4, p, undefined, vp)
      postorderTraversal(node.left || null, p, vp)
      pushStep(node, `Traverse right of ${node.value}`, 5, p, undefined, vp)
      postorderTraversal(node.right || null, p, vp)
      visited.push(node.id); result.push(node.value)
      pushStep(node, `Visit node ${node.value}`, 6, p, undefined, vp)
    }

    const levelorderTraversal = (): void => {
      const queue: TreeNode[] = [root]
      let level = 0
      while (queue.length) {
        const size = queue.length
        steps.push({ node: root!, description: `Processing level ${level}`, visitedNodes: [...visited], currentPath: [], queueValues: queue.map(q => q.value) })
        for (let i = 0; i < size; i++) {
          const node = queue.shift()!
          visited.push(node.id); result.push(node.value)

          if (node.left) queue.push(node.left)
          if (node.right) queue.push(node.right)

          steps.push({ node, description: `Visited ${node.value}, added children to queue`, visitedNodes: [...visited], currentPath: [node.id], queueValues: queue.map(q => q.value) })
        }
        level++
      }
    }

    resetNodeStates(root)

    if (type === "inorder") inorderTraversal(root)
    else if (type === "preorder") preorderTraversal(root)
    else if (type === "postorder") postorderTraversal(root)
    else levelorderTraversal()

    setTraversalSteps(steps)
    setTraversalResult(result)
    setCurrentStep(0)
    setIsPlaying(true)
  }

  const calculateNodePositions = useCallback((node: TreeNode | null, x = SVG_W / 2, y = 60, level = 0): TreeNode | null => {
    if (!node) return null
    const spacing = Math.max(H_GAP_BASE / (level + 1), MIN_H_SPACING)
    return {
      ...node,
      x, y,
      left: node.left ? calculateNodePositions(node.left, x - spacing, y + V_GAP, level + 1) : null,
      right: node.right ? calculateNodePositions(node.right, x + spacing, y + V_GAP, level + 1) : null,
    }
  }, [])

  const renderTree = (node: TreeNode | null): JSX.Element | null => {
    if (!node) return null
    const currentStepData = traversalSteps[currentStep]
    const isCurrent = currentStepData?.node.id === node.id
    const isVisited = currentStepData?.visitedNodes.includes(node.id)

    return (
      <g key={node.id}>
        {node.left && <line x1={node.x} y1={node.y} x2={node.left.x} y2={node.left.y} stroke="#e5e7eb" strokeWidth="2" />}
        {node.right && <line x1={node.x} y1={node.y} x2={node.right.x} y2={node.right.y} stroke="#e5e7eb" strokeWidth="2" />}

        {renderTree(node.left)}
        {renderTree(node.right)}

        <circle
          cx={node.x}
          cy={node.y}
          r={NODE_RADIUS}
          fill={
            node.isFound ? "#22c55e"
              : isCurrent ? "#6366f1"
                : isVisited ? "#f59e0b"
                  : node.isVisited ? "#ef4444"
                    : "#ffffff"
          }
          stroke={
            node.isFound ? "#16a34a"
              : isCurrent ? "#4f46e5"
                : isVisited ? "#d97706"
                  : node.isVisited ? "#dc2626"
                    : "#6b7280"
          }
          strokeWidth="2"
          className="transition-all duration-300"
        />
        <text
          x={node.x}
          y={node.y + 5}
          textAnchor="middle"
          className="text-sm font-bold"
          fill={node.isFound || isCurrent || isVisited || node.isVisited ? "#ffffff" : "#374151"}
        >
          {node.value}
        </text>
      </g>
    )
  }

  const stepForward = () => {
    if (currentStep < traversalSteps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      setIsPlaying(false)
    }
  }

  useEffect(() => {
    if (isPlaying && currentStep < traversalSteps.length - 1) {
      const t = setTimeout(stepForward, speed[0])
      return () => clearTimeout(t)
    } else if (currentStep >= traversalSteps.length - 1) {
      setIsPlaying(false)
    }
  }, [isPlaying, currentStep, traversalSteps.length, speed])

  const positionedRoot = calculateNodePositions(root)
  const currentPseudocode = pseudocodeDefinitions[traversalType]
  const currentCodeLine = traversalSteps[currentStep]?.codeLine ?? -1

  const handleStart = () => {
    if (traversalSteps.length === 0) performTraversal(traversalType)
    else setIsPlaying(true)
  }

  const handlePause = () => setIsPlaying(false)

  const handleResetTraversal = () => {
    resetTraversal()
    resetNodeStates(root)
    setRoot(root ? { ...root } : null)
  }

  const TreeConcepts = (
    <div className="space-y-6">
      <Card className="bg-card shadow-md border border-border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            Understanding Trees
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm md:text-base text-muted-foreground">
          <ul className="list-disc list-inside space-y-2 pl-2">
            {treesIntro.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
          <div className="rounded-md bg-gray-900 border border-border p-4 overflow-x-auto text-gray-100 shadow-inner mt-4">
            <div className="font-mono text-xs md:text-sm leading-6 whitespace-pre">
              {treesIntro.diagram.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </div>
          <div className="p-4 bg-muted/30 border rounded-lg shadow-sm space-y-2 mt-4">
            <h4 className="font-semibold text-foreground text-sm">Key Terminology:</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Root:</strong> The absolute top node of the tree.</li>
              <li><strong>Leaf:</strong> A node that has absolutely zero children.</li>
              <li><strong>Height:</strong> The length of the longest path from the Root to any Leaf.</li>
              <li><strong>Depth:</strong> The length of the path from the Root to a specific node.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {(Object.entries(modeDetails) as [TreeMode, typeof modeDetails[TreeMode]][]).map(([key, info]) => (
          <Card key={key} className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-foreground">
                {info.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
              <div>
                <p className="font-medium text-foreground mb-3">{info.summary}</p>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Mechanics:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      {info.how.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-green-600 dark:text-green-400 mb-1">Advantages</h4>
                      <ul className="list-disc pl-5 space-y-1 text-xs">
                        {info.pros.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-600 dark:text-red-400 mb-1">Trade-offs</h4>
                      <ul className="list-disc pl-5 space-y-1 text-xs">
                        {info.cons.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-1 mt-2">Use Cases:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      {info.useCases.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="rounded-md bg-gray-900 border border-border p-3 overflow-x-auto text-gray-100 mb-4 shadow-sm">
                  <div className="font-mono text-[10px] md:text-xs leading-5 whitespace-pre">
                    {info.diagram.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                </div>

                <h4 className="font-semibold text-foreground mb-2 text-xs uppercase tracking-wider">Complexity Profile</h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex flex-col bg-muted/50 p-2 rounded items-center">
                    <span className="font-medium mb-1">Insert</span>
                    <Badge variant="secondary" className="font-mono">{info.complexity.insert}</Badge>
                  </div>
                  <div className="flex flex-col bg-muted/50 p-2 rounded items-center">
                    <span className="font-medium mb-1">Search</span>
                    <Badge variant="secondary" className="font-mono">{info.complexity.search}</Badge>
                  </div>
                  <div className="flex flex-col bg-muted/50 p-2 rounded items-center">
                    <span className="font-medium mb-1">Delete</span>
                    <Badge variant="secondary" className="font-mono">{info.complexity.delete}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 bg-muted/20 border-l-4 border-amber-500 p-4 rounded-r-lg">
        <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">The Danger of Unbalanced Trees</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          While Binary Search Trees offer incredible <code>O(log n)</code> performance, they are extremely susceptible to input order. If you strictly insert pre-sorted data (e.g., <code>1, 2, 3, 4, 5</code>) into a standard BST, it will degrade into a straight line—a <strong>Linked List</strong>. When this extreme edge case occurs, the tree's height skyrockets to <code>n</code>, utterly destroying its efficiency and reducing search/insert/delete times to a miserable <code>O(n)</code>. This specific catastrophe is exactly why self-balancing trees like AVL Trees and Red-Black Trees were invented.
        </p>
      </div>
    </div>
  );

  return (
    <VisualizerLayout
      title="Binary Tree & BST Visualizer"
      description="Compare generic binary trees and binary search trees with interactive operations"
      difficulty="Intermediate"
      complexity={{
        time: mode === "bst" ? "O(log n) avg, O(n) worst" : "O(n)",
        space: "O(h)",
      }}
      applications={applications}
      concepts={TreeConcepts}
    >
      <div className="w-full space-y-6">

        {/* Mode Selector */}
        <div className="flex justify-center mb-6 mt-4">
          <div className="inline-flex rounded-md border p-1 bg-muted w-full max-w-md">
            <button
              onClick={() => setMode("binary")}
              className={`flex-1 py-2 text-sm font-medium rounded-sm transition-colors ${mode === "binary" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Binary Tree (BT)
            </button>
            <button
              onClick={() => setMode("bst")}
              className={`flex-1 py-2 text-sm font-medium rounded-sm transition-colors ${mode === "bst" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Binary Search Tree (BST)
            </button>
          </div>
        </div>

        {/* Tree Visualization */}
        <div className="bg-muted/10 rounded-lg p-4 min-h-[440px] overflow-auto flex justify-center">
          <svg width={SVG_W} height={SVG_H} className="mx-auto block">
            {positionedRoot && renderTree(positionedRoot)}
          </svg>
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap gap-4 mb-2">
          <button
            onClick={() => generateRandomTree()}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
            title="Generate Random Tree"
          >
            <RefreshCcw className="h-5 w-5" />
            Random Tree
          </button>
        </div>

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

          {/* Auxiliary Data Structure (Queue / Call Stack) */}
          <Card className="h-fit flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                {traversalType === "levelorder" ? "Queue (BFS)" : "Call Stack (DFS)"}
              </CardTitle>
            </CardHeader>
            <div className="p-4 flex-1 flex flex-col justify-end bg-muted/30 rounded-b-md min-h-[160px] border-t">
              {traversalSteps.length > 0 && currentStep < traversalSteps.length ? (
                traversalType === "levelorder" ? (
                  /* Queue Visualization (Horizontal) */
                  <div className="w-full overflow-x-auto pb-4">
                    <div className="flex gap-2 items-center min-w-max px-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase mr-2 shrink-0">Front</span>
                      {!traversalSteps[currentStep].queueValues || traversalSteps[currentStep].queueValues!.length === 0 ? (
                        <div className="px-4 py-2 border-2 border-dashed border-muted rounded-md text-muted-foreground italic text-sm">Empty Queue</div>
                      ) : (
                        traversalSteps[currentStep].queueValues!.map((val, idx) => (
                          <div key={`${idx}-${val}`} className="flex items-center">
                            <div className={`w-12 h-12 flex items-center justify-center font-bold rounded-md shadow-sm border ${idx === 0 ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-background border-border text-foreground'}`}>
                              {val}
                            </div>
                            {idx < traversalSteps[currentStep].queueValues!.length - 1 && (
                              <div className="text-muted-foreground mx-1">←</div>
                            )}
                          </div>
                        ))
                      )}
                      <span className="text-xs font-bold text-muted-foreground uppercase ml-2 shrink-0">Back</span>
                    </div>
                  </div>
                ) : (
                  /* Call Stack Visualization (Vertical) */
                  <div className="flex flex-col gap-1 w-full max-w-xs mx-auto justify-end flex-1">
                    {!traversalSteps[currentStep].callStackValues || traversalSteps[currentStep].callStackValues!.length === 0 ? (
                      <div className="w-full py-6 text-center border-2 border-dashed border-muted rounded-md text-muted-foreground italic text-sm">
                        Call Stack Empty
                      </div>
                    ) : (
                      traversalSteps[currentStep].callStackValues!.slice().reverse().map((val, idx) => {
                        const isTop = idx === 0;
                        return (
                          <div key={`${idx}-${val}`} className={`w-full py-2 text-center font-mono font-bold rounded-sm border shadow-sm ${isTop ? 'bg-purple-100 border-purple-400 text-purple-900 translate-y-[-2px] transition-transform' : 'bg-background border-border text-muted-foreground opacity-80'}`}>
                            {traversalType}({val})
                          </div>
                        )
                      })
                    )}
                    <div className="w-full border-t-4 border-slate-400 mt-1"></div>
                    <span className="text-xs text-center text-muted-foreground font-bold uppercase mt-1">Stack Base</span>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground italic">
                  Start traversal to view {traversalType === "levelorder" ? "Queue" : "Call Stack"}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Tree Operations */}
        <div className="grid md:grid-cols-4 gap-4">
          {/* Insert */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Insert Node
              </CardTitle>
            </CardHeader>
            <div className="p-4 pt-0 space-y-3">
              <input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Enter value"
                className="w-full px-3 py-2 border rounded-md"
                onKeyDown={(e) => e.key === "Enter" && insertNode(Number(inputValue))}
              />
              <button
                onClick={() => insertNode(Number(inputValue))}
                disabled={!inputValue}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Insert
              </button>
            </div>
          </Card>

          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search Node</CardTitle>
            </CardHeader>
            <div className="p-4 pt-0 space-y-3">
              <input
                type="number"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Enter value to search"
                className="w-full px-3 py-2 border rounded-md"
                onKeyDown={(e) => e.key === "Enter" && searchNode(Number(searchValue))}
              />
              <button
                onClick={() => searchNode(Number(searchValue))}
                disabled={!searchValue}
                className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Search
              </button>
            </div>
          </Card>

          {/* Delete */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Delete Node
              </CardTitle>
            </CardHeader>
            <div className="p-4 pt-0 space-y-3">
              <input
                type="number"
                value={deleteValue}
                onChange={(e) => setDeleteValue(e.target.value)}
                placeholder="Enter value to delete"
                className="w-full px-3 py-2 border rounded-md"
                onKeyDown={(e) => e.key === "Enter" && handleDeleteNode()}
              />
              <button
                onClick={handleDeleteNode}
                disabled={!deleteValue || mode === "binary"}
                className={`w-full py-2 rounded-md ${mode === "binary"
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                title={mode === "binary" ? "Deletion not supported in generic Binary Tree mode" : ""}
              >
                {mode === "binary" ? "Delete (BST Only)" : "Delete"}
              </button>
            </div>
          </Card>

          {/* Traversal Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tree Traversal</CardTitle>
            </CardHeader>
            <div className="p-4 pt-0 space-y-3">
              <select
                value={traversalType}
                onChange={(e) => { setTraversalType(e.target.value as TraversalType); resetTraversal() }}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="inorder">Inorder (L-Root-R)</option>
                <option value="preorder">Preorder (Root-L-R)</option>
                <option value="postorder">Postorder (L-R-Root)</option>
                <option value="levelorder">Level Order (BFS)</option>
              </select>
              <div className="flex gap-2">
                {!isPlaying ? (
                  <button
                    onClick={handleStart}
                    className="flex-1 bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 flex items-center justify-center gap-1"
                  >
                    <Play className="h-4 w-4" /> Start
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="flex-1 bg-yellow-600 text-white py-2 rounded-md hover:bg-yellow-700 flex items-center justify-center gap-1"
                  >
                    <Square className="h-4 w-4" /> Pause
                  </button>
                )}
                <button
                  onClick={handleResetTraversal}
                  className="flex-1 bg-gray-600 text-white py-2 rounded-md hover:bg-gray-700 flex items-center justify-center gap-1"
                >
                  <RotateCcw className="h-4 w-4" /> Reset
                </button>
              </div>
            </div>
          </Card>

          {/* Speed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Speed</CardTitle>
            </CardHeader>
            <div className="p-4 pt-0 space-y-3">
              <input
                type="range"
                min={200}
                max={2000}
                step={100}
                value={speed[0]}
                onChange={e => setSpeed([parseInt(e.target.value)])}
                className="w-full"
                disabled={isPlaying}
              />
              <div className="text-sm text-muted-foreground text-center">
                {speed[0] <= 400 ? "Fast" : speed[0] <= 1000 ? "Medium" : "Slow"}
              </div>
            </div>
          </Card>
        </div>

        {/* Metrics */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Tree Height</CardTitle></CardHeader>
            <div className="p-4 pt-0"><div className="text-2xl font-bold text-blue-600">{treeHeight}</div></div>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Node Count</CardTitle></CardHeader>
            <div className="p-4 pt-0"><div className="text-2xl font-bold text-green-600">{nodeCount}</div></div>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Traversal Result</CardTitle></CardHeader>
            <div className="p-4 pt-0">
              <div className="text-sm font-mono bg-muted p-2 rounded">[{traversalResult.join(", ")}]</div>
            </div>
          </Card>
        </div>

        {/* Step Info */}
        {traversalSteps.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Traversal Progress & Auxiliary Data</CardTitle></CardHeader>
            <div className="p-4 pt-0">
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Step {currentStep + 1} of {traversalSteps.length}</div>
                  <div className="text-base font-medium">{traversalSteps[currentStep]?.description}</div>
                </div>

                {traversalType === 'levelorder' ? (
                  <div>
                    <div className="text-sm font-medium mb-1 text-muted-foreground">Queue (FIFO):</div>
                    <div className="flex gap-2 flex-wrap min-h-[40px] p-2 bg-muted/30 rounded-md border">
                      {traversalSteps[currentStep]?.queueValues?.length === 0 && <span className="text-muted-foreground text-sm italic">Empty</span>}
                      {traversalSteps[currentStep]?.queueValues?.map((val, index) => (
                        <Badge key={index} variant="secondary" className="px-3 py-1 bg-blue-100 text-blue-800 border-blue-200">
                          {val}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-medium mb-1 text-muted-foreground">Call Stack (LIFO):</div>
                    <div className="flex gap-2 flex-wrap min-h-[40px] p-2 bg-muted/30 rounded-md border">
                      {traversalSteps[currentStep]?.callStackValues?.length === 0 && <span className="text-muted-foreground text-sm italic">Empty</span>}
                      {traversalSteps[currentStep]?.callStackValues?.map((val, index) => (
                        <Badge key={index} variant="secondary" className="px-3 py-1 bg-purple-100 text-purple-800 border-purple-200">
                          {val}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-sm text-muted-foreground">Visited: [{traversalSteps[currentStep]?.visitedNodes.map(id => id.split('-')[0]).join(", ")}]</div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </VisualizerLayout>
  )

  /* Utility: random tree */
  function generateRandomTree(count = 7, min = 10, max = 99) {
    const vals = new Set<number>()
    while (vals.size < count) vals.add(Math.floor(Math.random() * (max - min + 1)) + min)
    const arr = Array.from(vals)
    let newRoot: TreeNode | null = null

    if (mode === "bst") {
      const insert = (n: TreeNode | null, v: number): TreeNode => {
        if (!n) return { value: v, id: v.toString() }
        if (v < n.value) n.left = insert(n.left || null, v)
        else if (v > n.value) n.right = insert(n.right || null, v)
        return n
      }
      for (const v of arr) newRoot = insert(newRoot, v)
    } else {
      if (arr.length === 0) return
      newRoot = { value: arr[0], id: `${arr[0]}-${Date.now()}` }
      const q: TreeNode[] = [newRoot]
      for (let i = 1; i < arr.length; i++) {
        const parent = q[0]
        const node: TreeNode = { value: arr[i], id: `${arr[i]}-${Date.now()}` }
        if (!parent.left) parent.left = node
        else { parent.right = node; q.shift() }
        q.push(node)
      }
    }
    setRoot(newRoot)
    calculateTreeMetrics(newRoot)
    resetTraversal()
  }

  function handleDeleteNode() {
    if (!deleteValue) return
    deleteNode(Number(deleteValue))
    setDeleteValue("")
  }
}
