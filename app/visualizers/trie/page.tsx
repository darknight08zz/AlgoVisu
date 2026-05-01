"use client"

import { useState, useEffect } from "react"
import { VisualizerLayout } from "../../../components/visualizer-layout"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { Plus, X, Search, GitBranch } from "lucide-react"

//
// Types
//
interface TrieNode {
  children: (TrieNode | null)[]
  isEndOfWord: boolean
  char: string          // for visualization
  id: string            // stable path-like id
}

type Operation = "insert" | "search" | "delete"

interface Step {
  description: string
  trieSnapshot: TrieNode
  highlightedNodes: string[]
  pathNodes: string[]
  codeLine: number
}

//
// Pseudocode (now includes delete)
//
const pseudocode = [
  "class TrieNode:",
  "  children = array of size 26 (null)",
  "  isEndOfWord = false",
  "",
  "function insert(root, key):",
  "  node = root",
  "  for each c in key:",
  "    idx = c - 'a'",
  "    if node.children[idx] == null:",
  "      node.children[idx] = new TrieNode()",
  "    node = node.children[idx]",
  "  node.isEndOfWord = true",
  "",
  "function search(root, key):",
  "  node = root",
  "  for each c in key:",
  "    idx = c - 'a'",
  "    if node.children[idx] == null:",
  "      return false",
  "    node = node.children[idx]",
  "  return node.isEndOfWord",
  "",
  "function delete(root, key):",
  "  // unmark end; prune nodes with no children",
  "  stack = []  // (node, idx)",
  "  node = root",
  "  for each c in key:",
  "    idx = c - 'a'",
  "    if node.children[idx] == null: return // not found",
  "    push (node, idx) to stack; node = node.children[idx]",
  "  node.isEndOfWord = false",
  "  while stack not empty and node has no children and node.isEndOfWord == false:",
  "    parent, idx = pop stack",
  "    parent.children[idx] = null",
  "    node = parent",
]

const ALPHABET_SIZE = 26

//
// Utilities
//
const createNode = (id: string, char: string = ""): TrieNode => ({
  children: new Array(ALPHABET_SIZE).fill(null),
  isEndOfWord: false,
  char,
  id,
})

const deepClone = (node: TrieNode): TrieNode => {
  const cloned: TrieNode = {
    id: node.id,
    char: node.char,
    isEndOfWord: node.isEndOfWord,
    children: new Array(ALPHABET_SIZE).fill(null),
  }
  for (let i = 0; i < ALPHABET_SIZE; i++) {
    if (node.children[i]) cloned.children[i] = deepClone(node.children[i]!)
  }
  return cloned
}

const hasChildren = (n: TrieNode): boolean => n.children.some(c => c !== null)

//
// Component
//
export default function TrieVisualizer() {
  const [root, setRoot] = useState<TrieNode>(createNode("root", ""))
  const [word, setWord] = useState("")
  const [operation, setOperation] = useState<Operation>("insert")

  const [steps, setSteps] = useState<Step[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [currentCodeLine, setCurrentCodeLine] = useState<number>(-1)

  // Info blocks to help understanding
  const applications = [
    {
      title: "Autocomplete & Prefix Search",
      description: "Tries store words by shared prefixes, making prefix queries lightning-fast.",
      examples: ["Search bars", "IDE IntelliSense", "Command completion"],
    },
    {
      title: "Spell Checking",
      description: "O(m) lookups validate if a word exists and support close matches by exploring branches.",
      examples: ["Word processors", "Keyboards", "Grammar tools"],
    },
    {
      title: "Networking (IP Routing)",
      description: "Binary/Compressed tries power longest-prefix matching for routing decisions.",
      examples: ["Routers", "CDNs", "Load balancers"],
    },
  ]

  const moreInfo = [
    {
      title: "Why a Trie?",
      bullets: [
        "Lookups are O(m) where m is word length — independent of number of words.",
        "Naturally supports prefix queries (e.g., “app” → apple, apply, application).",
        "Deterministic path per character avoids hash collisions.",
      ],
    },
    {
      title: "Trade-offs",
      bullets: [
        "High memory: 26 pointers per node (for a-z).",
        "Sparse tries waste space unless compressed (radix trie / Patricia).",
        "Unicode requires larger alphabets or a map/dictionary per node.",
      ],
    },
    {
      title: "Variants",
      bullets: [
        "Compressed/Radix/Patricia: store substrings per edge to save memory.",
        "Ternary Search Tree: 3 pointers per node, memory-friendlier, ordered traversal.",
        "DAWG (Directed Acyclic Word Graph): merges suffixes for maximal sharing.",
      ],
    },
  ]

  //
  // Reset
  //
  const resetTrie = () => {
    setRoot(createNode("root", ""))
    setSteps([])
    setCurrentStep(0)
    setCurrentCodeLine(-1)
    setWord("")
  }

  //
  // Step builder (build locally, then set once)
  //
  const makeStep = (
    list: Step[],
    description: string,
    trie: TrieNode,
    highlighted: string[],
    path: string[],
    codeLine: number
  ) => {
    list.push({
      description,
      trieSnapshot: deepClone(trie),
      highlightedNodes: [...highlighted],
      pathNodes: [...path],
      codeLine,
    })
  }

  //
  // INSERT
  //
  const handleInsert = () => {
    const clean = word.trim().toLowerCase()
    if (!clean) return
    if (!/^[a-z]+$/.test(clean)) {
      alert("Only lowercase letters a-z are supported.")
      return
    }

    const localSteps: Step[] = []
    // Clone working trie we will mutate; snapshots capture state
    const work = deepClone(root)
    const path: string[] = []
    let node = work

    makeStep(localSteps, `Start inserting "${clean}"`, work, [], [], 5)

    for (let i = 0; i < clean.length; i++) {
      const c = clean[i]
      const idx = c.charCodeAt(0) - 97
      path.push(node.id)

      if (node.children[idx] === null) {
        const newId = `${node.id}-${c}`
        node.children[idx] = createNode(newId, c)
        makeStep(localSteps, `Created node for '${c}' at index ${idx}`, work, [newId], [...path], 9)
      }

      node = node.children[idx]!
      makeStep(localSteps, `Moved to '${c}'`, work, [node.id], [...path, node.id], 11)
    }

    node.isEndOfWord = true
    makeStep(localSteps, `Marked end of word "${clean}"`, work, [node.id], [...path, node.id], 12)

    // Commit
    setRoot(work)
    setSteps(localSteps)
    setCurrentStep(0)
    setWord("")
  }

  //
  // SEARCH (fixed: fresh steps, snapshot per step, uses current root)
  //
  const handleSearch = () => {
    const clean = word.trim().toLowerCase()
    if (!clean) return
    if (!/^[a-z]+$/.test(clean)) {
      alert("Only lowercase letters a-z are supported.")
      return
    }

    const localSteps: Step[] = []
    const work = deepClone(root) // snapshot base
    const path: string[] = []
    let node: TrieNode = work

    makeStep(localSteps, `Start searching "${clean}"`, work, [], [], 14)

    for (let i = 0; i < clean.length; i++) {
      const c = clean[i]
      const idx = c.charCodeAt(0) - 97
      path.push(node.id)

      if (node.children[idx] === null) {
        makeStep(
          localSteps,
          `Character '${c}' not found at index ${idx}. "${clean}" does not exist.`,
          work,
          [],
          [...path],
          18
        )
        setSteps(localSteps)
        setCurrentStep(0)
        setWord("")
        return
      }

      node = node.children[idx]!
      makeStep(localSteps, `Found '${c}' at index ${idx}`, work, [node.id], [...path, node.id], 20)
    }

    if (node.isEndOfWord) {
      makeStep(localSteps, `Word "${clean}" found (isEndOfWord = true)`, work, [node.id], [...path, node.id], 21)
    } else {
      makeStep(localSteps, `"${clean}" is only a prefix (isEndOfWord = false)`, work, [node.id], [...path, node.id], 21)
    }

    setSteps(localSteps)
    setCurrentStep(0)
    setWord("")
  }

  //
  // DELETE (with pruning)
  //
  const handleDelete = () => {
    const clean = word.trim().toLowerCase()
    if (!clean) return
    if (!/^[a-z]+$/.test(clean)) {
      alert("Only lowercase letters a-z are supported.")
      return
    }

    const localSteps: Step[] = []
    const work = deepClone(root)
    let node: TrieNode = work
    const pathIds: string[] = []
    const stack: { parent: TrieNode; idx: number; childId: string }[] = []

    makeStep(localSteps, `Start deletion of "${clean}"`, work, [], [], 23)

    // Traverse down, collecting stack for pruning
    for (let i = 0; i < clean.length; i++) {
      const c = clean[i]
      const idx = c.charCodeAt(0) - 97
      pathIds.push(node.id)

      if (node.children[idx] === null) {
        makeStep(localSteps, `Cannot delete: '${c}' missing at index ${idx}`, work, [], [...pathIds], 26)
        setSteps(localSteps)
        setCurrentStep(0)
        setWord("")
        return
      }

      stack.push({ parent: node, idx, childId: node.children[idx]!.id })
      node = node.children[idx]!
      makeStep(localSteps, `Traverse to '${c}'`, work, [node.id], [...pathIds, node.id], 26)
    }

    // Unmark end if it was a word
    if (!node.isEndOfWord) {
      makeStep(localSteps, `"${clean}" not a complete word (isEndOfWord=false). Nothing to delete.`, work, [node.id], [...pathIds, node.id], 28)
      setSteps(localSteps)
      setCurrentStep(0)
      setWord("")
      return
    }

    node.isEndOfWord = false
    makeStep(localSteps, `Unmarked end of "${clean}"`, work, [node.id], [...pathIds, node.id], 28)

    // Prune upwards while the child has no children and is not an end
    while (stack.length > 0 && !hasChildren(node) && !node.isEndOfWord) {
      const { parent, idx, childId } = stack.pop()!
      parent.children[idx] = null
      makeStep(localSteps, `Pruned node '${childId.split("-").pop() ?? ''}'`, work, [parent.id], [...pathIds], 30)
      node = parent
    }

    setRoot(work)
    setSteps(localSteps)
    setCurrentStep(0)
    setWord("")
  }

  //
  // Navigation
  //
  const stepForward = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1)
  }
  const stepBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }
  const reset = () => resetTrie()

  useEffect(() => {
    if (steps[currentStep]) {
      setCurrentCodeLine(steps[currentStep].codeLine)
    }
  }, [currentStep, steps])

  const currentStepData = steps[currentStep] || {
    description: "Ready to perform an operation.",
    trieSnapshot: root,
    highlightedNodes: [],
    pathNodes: [],
    codeLine: -1,
  }

  //
  // Render (uses snapshot for the current step)
  //
  const renderNode = (node: TrieNode): JSX.Element => {
    const isHighlighted = currentStepData.highlightedNodes.includes(node.id)
    const isPath = currentStepData.pathNodes.includes(node.id)
    const isEnd = node.isEndOfWord

    return (
      <div className="ml-4" key={node.id}>
        <div
          className={[
            "flex items-center gap-2 p-2 rounded border mb-1",
            isPath ? "bg-primary/10 border-primary" : "bg-background border-muted",
            isHighlighted ? "ring-2 ring-primary/50" : "",
          ].join(" ")}
        >
          <span className="font-mono w-6 text-center">{node.char || "•"}</span>
          {isEnd && (
            <Badge variant="outline" className="text-xs border-green-500 text-green-700 bg-green-50">END</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {node.children.map((child) => (child ? renderNode(child) : null))}
        </div>
      </div>
    )
  }

  const TrieConcepts = (
    <div className="space-y-6">
      <Card className="bg-card shadow-md border border-border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            What is a Trie?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm md:text-base">
          <p>
            A <strong>Trie</strong> (pronounced "try", coming from the word re<em>trie</em>val) is a highly specialized tree data structure designed specifically for extremely fast string matching. It is often called a <em>Prefix Tree</em>.
          </p>
          <p>
            Unlike a typical Binary Search Tree where each node stores a full value, a Trie node <strong>only stores a single character</strong>. An entire word is represented by the <em>path</em> taken from the Root node down to a node marked as the end of a word. Because nodes share prefixes (e.g., "cat" and "cap" share the "ca" path), Tries naturally compress overlapping data and make prefix-based searches instantaneous.
          </p>
          <div className="p-4 bg-muted/30 border rounded-lg shadow-sm space-y-2 mt-4">
            <h4 className="font-semibold text-foreground text-sm">Key Properties:</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>The Root is Empty:</strong> The root node never holds a character. It acts as the branching-off point for the first letters of all words.</li>
              <li><strong>End Flags:</strong> A boolean flag (<code>isEndOfWord</code>) is crucial to distinguish between a strict prefix (e.g., "ap") and an actual inserted word (e.g., "app").</li>
              <li><strong>Deterministic Indexing:</strong> For an English lowercase alphabet, each node has an array of exactly 26 pointers. The letter 'a' is always at index 0, 'b' at index 1, etc.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {moreInfo.map((sec, i) => (
          <Card key={i} className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-foreground">{sec.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground leading-relaxed space-y-3 text-sm flex-1 flex flex-col">
              <ul className="list-disc pl-5 space-y-2">
                {sec.bullets.map((b, j) => (<li key={j}>{b}</li>))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card shadow-md border border-border rounded-2xl border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Complexity Deep Dive
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tries execute searches in strict <strong>O(m)</strong> time, where <code>m</code> is the length of the string you are searching for. This means finding "cat" takes exactly 3 steps, regardless of whether the Trie contains 100 words or 10 million words. The major trade-off is <strong>Space Complexity</strong>: standard Tries consume massive amounts of memory because every single node, even if it only has one actual child, allocates an array of 26 pointers (most of which will be <code>null</code>).
          </p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <VisualizerLayout
      title="Trie Visualizer"
      description="Visualize insert, search, and delete with step-by-step snapshots"
      difficulty="Intermediate"
      isPlaying={false}
      onPlay={() => { }}
      onPause={() => { }}
      onStepBack={stepBack}
      onStepForward={stepForward}
      onReset={reset}
      currentStep={currentStep}
      totalSteps={steps.length}
      complexity={{
        time: "Insert/Search/Delete: O(m) (m = word length)",
        space: "Up to O(ALPHABET_SIZE × nodes)",
      }}
      applications={applications}
      concepts={TrieConcepts}
    >
      <div className="w-full space-y-6">


        {/* Controls */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Operation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={operation === "insert" ? "default" : "outline"}
                size="sm"
                onClick={() => setOperation("insert")}
                className="w-full justify-start"
              >
                <Plus className="h-4 w-4 mr-2" /> Insert
              </Button>
              <Button
                variant={operation === "search" ? "default" : "outline"}
                size="sm"
                onClick={() => setOperation("search")}
                className="w-full justify-start"
              >
                <Search className="h-4 w-4 mr-2" /> Search
              </Button>
              <Button
                variant={operation === "delete" ? "default" : "outline"}
                size="sm"
                onClick={() => setOperation("delete")}
                className="w-full justify-start"
              >
                <X className="h-4 w-4 mr-2" /> Delete
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Word Input</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input
                placeholder="Enter a word (a-z only)"
                value={word}
                onChange={(e) => setWord(e.target.value.toLowerCase())}
                className="flex-1"
              />
              <Button
                onClick={
                  operation === "insert"
                    ? handleInsert
                    : operation === "search"
                      ? handleSearch
                      : handleDelete
                }
                className="gap-1"
              >
                {operation === "insert" ? "Insert" : operation === "search" ? "Search" : "Delete"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reset</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={reset} className="w-full" variant="outline">
                Clear Trie
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Sample Words */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Add (Samples)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {["a", "an", "and", "ant", "ants", "bat", "batch", "batches", "cat", "cape"].map(w => (
              <Button
                key={w}
                variant="outline"
                size="sm"
                onClick={() => { setWord(w); setOperation("insert"); }}
                className="px-3"
              >
                {w}
              </Button>
            ))}
            <Button size="sm" onClick={handleInsert} className="ml-auto">Insert Selected</Button>
          </CardContent>
        </Card>

        {/* Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>Trie Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/10 p-4 rounded min-h-64 overflow-auto">
              {currentStepData.trieSnapshot.children.every(child => child === null) ? (
                <div className="text-muted-foreground italic">Trie is empty</div>
              ) : (
                <div className="font-sans">{renderNode(currentStepData.trieSnapshot)}</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pseudocode */}
        <Card>
          <CardHeader>
            <CardTitle>Pseudocode (Insert / Search / Delete)</CardTitle>
          </CardHeader>
          <div className="font-mono text-sm bg-muted p-4 rounded-md max-h-60 overflow-y-auto">
            {pseudocode.map((line, index) => (
              <div
                key={index}
                className={[
                  "py-1 px-2 rounded",
                  currentCodeLine === index + 1
                    ? "bg-primary/20 border-l-4 border-primary text-primary-foreground"
                    : "text-muted-foreground",
                ].join(" ")}
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
                <span className="font-mono">•</span>
                <span>Root (no character)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-green-500 text-green-700 bg-green-50">END</Badge>
                <span>Complete Word</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-primary bg-primary/10"></div>
                <span>Highlighted Node</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-l-2 border-muted pl-2"></div>
                <span>Path Traversal</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </VisualizerLayout>
  )
}
