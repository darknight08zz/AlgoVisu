"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { VisualizerLayout } from "../../../components/visualizer-layout"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { Plus, X, GitBranch } from "lucide-react"

interface AVLNode {
  value: number
  left: AVLNode | null
  right: AVLNode | null
  height: number
  id: string
  rotationType?: "LL" | "RR" | "LR" | "RL"
}

type AVLStep = {
  description: string
  tree: AVLNode | null
  highlightedNodes: string[]
  codeLine: number
}

const pseudocode = [
  "function insert(root, value):",
  "  if root is null: return new Node(value)",
  "  if value < root.value:",
  "    root.left = insert(root.left, value)",
  "  else if value > root.value:",
  "    root.right = insert(root.right, value)",
  "  else: return root  // duplicate",
  "  root.height = 1 + max(height(root.left), height(root.right))",
  "  balance = getBalance(root)",
  "  // Left Left",
  "  if balance > 1 and value < root.left.value:",
  "    return rotateRight(root)",
  "  // Right Right",
  "  if balance < -1 and value > root.right.value:",
  "    return rotateLeft(root)",
  "  // Left Right",
  "  if balance > 1 and value > root.left.value:",
  "    root.left = rotateLeft(root.left)",
  "    return rotateRight(root)",
  "  // Right Left",
  "  if balance < -1 and value < root.right.value:",
  "    root.right = rotateRight(root.right)",
  "    return rotateLeft(root)",
  "  return root",
  "",
  "function delete(root, value):",
  "  if root is null: return root",
  "  if value < root.value:",
  "    root.left = delete(root.left, value)",
  "  else if value > root.value:",
  "    root.right = delete(root.right, value)",
  "  else:",
  "    if root.left is null or root.right is null:",
  "      temp = root.left ? root.left : root.right",
  "      if temp is null:",
  "        root = null",
  "      else:",
  "        root = temp",
  "    else:",
  "      temp = minValueNode(root.right)",
  "      root.value = temp.value",
  "      root.right = delete(root.right, temp.value)",
  "  if root is null: return root",
  "  root.height = 1 + max(height(root.left), height(root.right))",
  "  balance = getBalance(root)",
  "  // Left Left",
  "  if balance > 1 and getBalance(root.left) >= 0:",
  "    return rotateRight(root)",
  "  // Left Right",
  "  if balance > 1 and getBalance(root.left) < 0:",
  "    root.left = rotateLeft(root.left)",
  "    return rotateRight(root)",
  "  // Right Right",
  "  if balance < -1 and getBalance(root.right) <= 0:",
  "    return rotateLeft(root)",
  "  // Right Left",
  "  if balance < -1 and getBalance(root.right) > 0:",
  "    root.right = rotateRight(root.right)",
  "    return rotateLeft(root)",
  "  return root",
]

let nodeIdCounter = 0

// create node with stable id base
const createNode = (value: number): AVLNode => ({
  value,
  left: null,
  right: null,
  height: 1,
  id: `node-${++nodeIdCounter}`,
  rotationType: undefined,
})

const getHeight = (node: AVLNode | null): number => node?.height || 0
const getBalance = (node: AVLNode | null): number => (node ? getHeight(node.left) - getHeight(node.right) : 0)

const rotateRight = (y: AVLNode): AVLNode => {
  const x = y.left!
  const T2 = x.right
  x.right = y
  y.left = T2
  y.height = Math.max(getHeight(y.left), getHeight(y.right)) + 1
  x.height = Math.max(getHeight(x.left), getHeight(x.right)) + 1
  x.rotationType = "LL"
  return x
}

const rotateLeft = (x: AVLNode): AVLNode => {
  const y = x.right!
  const T2 = y.left
  y.left = x
  x.right = T2
  x.height = Math.max(getHeight(x.left), getHeight(x.right)) + 1
  y.height = Math.max(getHeight(y.left), getHeight(y.right)) + 1
  y.rotationType = "RR"
  return y
}

const minValueNode = (node: AVLNode): AVLNode => {
  let current = node
  while (current.left !== null) {
    current = current.left
  }
  return current
}

// IMPORTANT: cloneNode used to create snapshots for steps
// We must ensure cloned snapshots have unique IDs to prevent duplicate React keys.
const cloneNode = (node: AVLNode | null): AVLNode | null => {
  if (!node) return null
  // append a short unique suffix so every snapshot node key is unique
  const suffix = `-snap-${Math.random().toString(36).slice(2, 8)}`
  return {
    ...node,
    id: `${node.id}${suffix}`,
    left: cloneNode(node.left),
    right: cloneNode(node.right),
    // keep rotationType & height as-is
  }
}

export default function AVLVisualizer() {
  const [root, setRoot] = useState<AVLNode | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [steps, setSteps] = useState<AVLStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [currentCodeLine, setCurrentCodeLine] = useState<number>(-1)

  const applications = [
    {
      title: "Database Indexing",
      description: "AVL trees ensure O(log n) lookups for indexed columns",
      examples: ["MySQL indexes", "File systems", "Symbol tables"],
    },
    {
      title: "In-Memory Data Stores",
      description: "Balanced trees maintain performance under dynamic loads",
      examples: ["Caches", "Session stores", "Leaderboards"],
    },
    {
      title: "Compiler Design",
      description: "Efficient symbol table management during parsing",
      examples: ["Variable scoping", "Function lookup", "Optimization passes"],
    },
  ]

  const resetTree = () => {
    setRoot(null)
    setSteps([])
    setCurrentStep(0)
    setCurrentCodeLine(-1)
    nodeIdCounter = 0
  }

  // helper to push a step into a local snapshot array (used by recursive insert/delete)
  const pushStep = (arr: AVLStep[], description: string, tree: AVLNode | null, highlighted: string[], codeLine: number) => {
    arr.push({
      description,
      tree: cloneNode(tree),
      highlightedNodes: [...highlighted],
      codeLine,
    })
  }

  // insert recursive that appends to stepsSnapshot
  const insertRecursive = (
    node: AVLNode | null,
    value: number,
    stepsSnapshot: AVLStep[],
    path: string[] = []
  ): AVLNode => {
    if (!node) {
      const newNode = createNode(value)
      pushStep(stepsSnapshot, `Inserted ${value}.`, newNode, [newNode.id], 2)
      return newNode
    }

    path.push(node.id)

    if (value < node.value) {
      pushStep(stepsSnapshot, `Going left from ${node.value} to insert ${value}.`, node, [node.id], 3)
      node.left = insertRecursive(node.left, value, stepsSnapshot, path)
    } else if (value > node.value) {
      pushStep(stepsSnapshot, `Going right from ${node.value} to insert ${value}.`, node, [node.id], 5)
      node.right = insertRecursive(node.right, value, stepsSnapshot, path)
    } else {
      pushStep(stepsSnapshot, `Value ${value} is duplicate. No insertion.`, node, [node.id], 6)
      return node // duplicate
    }

    node.height = 1 + Math.max(getHeight(node.left), getHeight(node.right))
    const balance = getBalance(node)

    if (balance > 1 && value < (node.left?.value || 0)) {
      pushStep(stepsSnapshot, `LL imbalance at ${node.value}. Performing right rotation.`, node, [node.id], 11)
      return rotateRight(node)
    }
    if (balance < -1 && value > (node.right?.value || 0)) {
      pushStep(stepsSnapshot, `RR imbalance at ${node.value}. Performing left rotation.`, node, [node.id], 14)
      return rotateLeft(node)
    }
    if (balance > 1 && value > (node.left?.value || 0)) {
      pushStep(stepsSnapshot, `LR imbalance at ${node.value}. Left rotate child, then right rotate.`, node, [node.id], 17)
      node.left = rotateLeft(node.left!)
      node.left.rotationType = "LR"
      return rotateRight(node)
    }
    if (balance < -1 && value < (node.right?.value || 0)) {
      pushStep(stepsSnapshot, `RL imbalance at ${node.value}. Right rotate child, then left rotate.`, node, [node.id], 21)
      node.right = rotateRight(node.right!)
      node.right.rotationType = "RL"
      return rotateLeft(node)
    }

    return node
  }

  const deleteRecursive = (
    node: AVLNode | null,
    value: number,
    stepsSnapshot: AVLStep[],
    path: string[] = []
  ): AVLNode | null => {
    if (!node) return null

    path.push(node.id)

    if (value < node.value) {
      pushStep(stepsSnapshot, `Going left from ${node.value} to delete ${value}.`, node, [node.id], 28)
      node.left = deleteRecursive(node.left, value, stepsSnapshot, path)
    } else if (value > node.value) {
      pushStep(stepsSnapshot, `Going right from ${node.value} to delete ${value}.`, node, [node.id], 30)
      node.right = deleteRecursive(node.right, value, stepsSnapshot, path)
    } else {
      if (!node.left || !node.right) {
        const temp = node.left || node.right
        if (!temp) {
          pushStep(stepsSnapshot, `Deleting leaf node ${value}.`, node, [node.id], 34)
          return null
        } else {
          pushStep(stepsSnapshot, `Deleting node ${value} with one child.`, node, [node.id], 36)
          return temp
        }
      } else {
        const temp = minValueNode(node.right)
        node.value = temp.value
        pushStep(stepsSnapshot, `Replacing ${value} with inorder successor ${temp.value}.`, node, [node.id, temp.id], 40)
        node.right = deleteRecursive(node.right, temp.value, stepsSnapshot, [...path])
      }
    }

    if (!node) return null

    node.height = 1 + Math.max(getHeight(node.left), getHeight(node.right))
    const balance = getBalance(node)

    if (balance > 1 && getBalance(node.left) >= 0) {
      pushStep(stepsSnapshot, `LL imbalance at ${node.value}. Right rotation.`, node, [node.id], 44)
      return rotateRight(node)
    }
    if (balance > 1 && getBalance(node.left) < 0) {
      pushStep(stepsSnapshot, `LR imbalance at ${node.value}. Left rotation on left child, then right rotation.`, node, [node.id], 47)
      node.left = rotateLeft(node.left!)
      node.left.rotationType = "LR"
      return rotateRight(node)
    }
    if (balance < -1 && getBalance(node.right) <= 0) {
      pushStep(stepsSnapshot, `RR imbalance at ${node.value}. Left rotation.`, node, [node.id], 51)
      return rotateLeft(node)
    }
    if (balance < -1 && getBalance(node.right) > 0) {
      pushStep(stepsSnapshot, `RL imbalance at ${node.value}. Right rotation on right child, then left rotation.`, node, [node.id], 54)
      node.right = rotateRight(node.right!)
      node.right.rotationType = "RL"
      return rotateLeft(node)
    }

    return node
  }

  // Handlers: Insert/Delete
  // We will produce stepsSnapshot first, then update steps[] (snapshots).
  // To avoid React remount flicker we update root slightly after steps (small timeout).
  const handleInsert = () => {
    const val = Number(inputValue)
    if (isNaN(val)) return

    const stepsSnapshot: AVLStep[] = []
    const newRoot = insertRecursive(root, val, stepsSnapshot)

    // Save snapshots (cloned inside pushStep) - these snapshots contain unique ids
    setSteps(stepsSnapshot)
    setCurrentStep(0)
    setCurrentCodeLine(stepsSnapshot[0]?.codeLine ?? -1)

    // Small delay to avoid sudden remount and visual flicker when we replace root
    // The steps list is what UI will use for the step-by-step display; after a
    // brief moment we update the actual root to the new balanced tree.
    setTimeout(() => {
      setRoot(newRoot)
    }, 120)

    setInputValue("")
  }

  const handleDelete = () => {
    const val = Number(inputValue)
    if (isNaN(val)) return

    const stepsSnapshot: AVLStep[] = []
    const newRoot = deleteRecursive(root, val, stepsSnapshot)

    setSteps(stepsSnapshot)
    setCurrentStep(0)
    setCurrentCodeLine(stepsSnapshot[0]?.codeLine ?? -1)

    setTimeout(() => {
      setRoot(newRoot)
    }, 120)

    setInputValue("")
  }

  const stepForward = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
  }
  const stepBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }
  const reset = () => resetTree()

  useEffect(() => {
    if (steps[currentStep]) {
      setCurrentCodeLine(steps[currentStep].codeLine)
    }
  }, [currentStep, steps])

  const currentStepData = steps[currentStep] || {
    description: "Ready to perform an operation.",
    tree: root,
    highlightedNodes: [],
    codeLine: -1,
  }

  // Render tree nodes recursively with motion; use unique key composed of node.id + props to avoid duplicates
  const renderNode = (node: AVLNode | null, depth = 0): JSX.Element | null => {
    if (!node) return null

    const isHighlighted = currentStepData.highlightedNodes.includes(node.id)

    return (
      <motion.div
        key={`${node.id}-${node.value}-${node.height}`}
        layout
        initial={{ opacity: 0, scale: 0.75 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.6 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <motion.div
          layout
          className={`
            w-16 h-16 rounded-full flex items-center justify-center border-2 font-bold relative
            ${isHighlighted ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-muted bg-background"}
          `}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          {node.value}
          {node.rotationType && (
            <Badge variant="outline" className="absolute -top-2 -right-2 text-xs bg-yellow-100 text-yellow-800 border-yellow-500">
              {node.rotationType}
            </Badge>
          )}
        </motion.div>

        <div className="text-xs text-muted-foreground mt-1">h:{node.height}</div>

        <div className="flex space-x-6 mt-3">
          <AnimatePresence mode="popLayout">
            {node.left && (
              <motion.div key={`L-${node.left.id}`} layout>
                {renderNode(node.left, depth + 1)}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="popLayout">
            {node.right && (
              <motion.div key={`R-${node.right.id}`} layout>
                {renderNode(node.right, depth + 1)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    )
  }

  const applicationsShort = applications

  const AVLConcepts = (
    <div className="space-y-6">
      <Card className="bg-card shadow-md border border-border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            What is an AVL Tree?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm md:text-base">
          <p>
            An <strong>AVL Tree</strong> is a highly evolved, self-balancing Binary Search Tree (BST) named after its inventors, Adelson-Velsky and Landis. It was the very first self-balancing data structure ever invented.
          </p>
          <div className="p-4 bg-muted/30 border rounded-lg shadow-sm space-y-2 mt-4">
            <h4 className="font-semibold text-foreground text-sm">The Golden Rule:</h4>
            <p>
              An AVL tree enforces one strict property: <strong>The difference in height between the left and right subtrees of ANY node cannot exceed 1.</strong> This difference is called the <em>Balance Factor</em>.
            </p>
            <div className="bg-gray-900 border border-border p-3 rounded-md shadow-sm mt-2">
              <code className="text-green-400 font-mono text-xs">Balance Factor = Height(Left Subtree) - Height(Right Subtree)</code>
              <p className="text-xs text-gray-400 mt-2">Valid values are strictly <span className="text-white">-1, 0, or 1</span>. If a node hits 2 or -2, the tree instantly rotates to heal itself.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary" />
              The Art of Rotation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1">
            <p className="text-xs">
              When an insertion or deletion breaks the Balance Factor (becomes ±2), the AVL tree immediately performs a localized <strong>Rotation</strong> to restore balance without breaking the standard BST sorting property.
            </p>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-muted/30 p-2 rounded">
                <Badge variant="outline" className="mb-1 bg-yellow-100 text-yellow-800 border-yellow-500 text-[10px]">LL Imbalance</Badge>
                <p className="text-[10px] leading-tight mt-1">Left-heavy line. Fixed by a swift <strong>Right Rotation</strong> pulling the middle node up.</p>
              </div>
              <div className="bg-muted/30 p-2 rounded">
                <Badge variant="outline" className="mb-1 bg-yellow-100 text-yellow-800 border-yellow-500 text-[10px]">RR Imbalance</Badge>
                <p className="text-[10px] leading-tight mt-1">Right-heavy line. Fixed by a swift <strong>Left Rotation</strong> pulling the middle node up.</p>
              </div>
              <div className="bg-muted/30 p-2 rounded">
                <Badge variant="outline" className="mb-1 bg-yellow-100 text-yellow-800 border-yellow-500 text-[10px]">LR Imbalance</Badge>
                <p className="text-[10px] leading-tight mt-1">Left child, then right child. Fixed by a <strong>Left Rotate</strong> (on child) then <strong>Right Rotate</strong>.</p>
              </div>
              <div className="bg-muted/30 p-2 rounded">
                <Badge variant="outline" className="mb-1 bg-yellow-100 text-yellow-800 border-yellow-500 text-[10px]">RL Imbalance</Badge>
                <p className="text-[10px] leading-tight mt-1">Right child, then left child. Fixed by a <strong>Right Rotate</strong> (on child) then <strong>Left Rotate</strong>.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Performance & Trade-offs
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Complexity Profile</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col bg-muted/50 p-2 rounded">
                    <span className="font-medium text-muted-foreground mb-1">Search, Insert, Delete</span>
                    <span className="font-mono text-foreground font-semibold text-green-600">O(log n) guaranteed</span>
                  </div>
                  <div className="flex flex-col bg-muted/50 p-2 rounded">
                    <span className="font-medium text-muted-foreground mb-1">Space</span>
                    <span className="font-mono text-foreground">O(n)</span>
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 p-3 rounded-lg text-xs">
                <h4 className="font-semibold text-red-600 dark:text-red-400 mb-1">The Catch: Rotation Overhead</h4>
                <p className="leading-relaxed">
                  AVL trees are <em>strictly</em> balanced. While this makes lookups blazing fast, it means frequent Inserts and Deletes trigger lots of costly rotational calculations. If your application writes data constantly but searches rarely, the computational overhead of rotating an AVL tree will slow you down. In write-heavy scenarios, a Red-Black Tree (which is slightly less strictly balanced, meaning fewer rotations) is often preferred.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <VisualizerLayout
      title="AVL Tree Visualizer"
      description="Self-balancing binary search trees with automatic rotations to maintain O(log n) height"
      difficulty="Advanced"

      complexity={{
        time: "Insert/Delete/Search: O(log n)",
        space: "O(n)",
      }}
      applications={applicationsShort}
      concepts={AVLConcepts}
    >
      <div className="w-full space-y-8">

        {/* Controls */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Operations</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2 flex-wrap">
              <Input
                type="number"
                placeholder="Value"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 min-w-[120px]"
              />
              <Button onClick={handleInsert} className="gap-1">
                <Plus className="h-4 w-4" /> Insert
              </Button>
              <Button variant="destructive" onClick={handleDelete} className="gap-1">
                <X className="h-4 w-4" /> Delete
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reset</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={reset} className="w-full" variant="outline">
                Clear Tree
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>AVL Tree</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-64 p-4 bg-muted/10 rounded flex justify-center items-start overflow-auto">
              <div className="w-full flex justify-center py-4">
                <AnimatePresence mode="popLayout">
                  {currentStepData.tree ? (
                    // Render snapshot tree if steps active, else render live root
                    renderNode(currentStepData.tree)
                  ) : root ? (
                    renderNode(root)
                  ) : (
                    <div className="text-muted-foreground italic">Tree is empty</div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pseudocode */}
        <Card>
          <CardHeader>
            <CardTitle>Pseudocode (Insert & Delete)</CardTitle>
          </CardHeader>
          <div className="font-mono text-sm bg-muted p-4 rounded-md max-h-96 overflow-y-auto">
            {pseudocode.map((line, index) => (
              <div
                key={index}
                className={`
                  py-1 px-2 rounded
                  ${currentCodeLine === index + 1
                    ? "bg-primary/20 border-l-4 border-primary text-primary-foreground"
                    : "text-muted-foreground"
                  }
                `}
              >
                <span className="text-xs text-muted-foreground/70 mr-3">{index + 1}</span>
                {line || "\u00A0"}
              </div>
            ))}
          </div>
        </Card>

        {/* Current Step */}
        {steps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Current Step</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm p-3 bg-accent/10 rounded-lg border border-accent/20">
                {currentStepData.description}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Button onClick={stepBack} variant="outline">Back</Button>
                <div className="text-sm">{currentStep + 1} / {steps.length}</div>
                <Button onClick={stepForward} variant="outline">Forward</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle>Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border-2 border-primary bg-primary/10"></div>
                <span>Highlighted Node</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-500">LL</Badge>
                <span>Rotation Type</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs">h:3</span>
                <span>Height</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </VisualizerLayout>
  )
}
