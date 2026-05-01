"use client"

import { useState, useEffect, useMemo } from "react"
import { VisualizerLayout } from "../../../components/visualizer-layout"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Plus, Trash2, ChevronRight, Repeat, ArrowLeftRight, ArrowLeft, Volume2, VolumeX } from "lucide-react"
import { Badge } from "../../../components/ui/badge"
import { useAudioNarration } from "../../../lib/hooks/useAudioNarration"
import { VideoEmbed } from "../../../components/ui/video-embed"

interface NodeItem {
  value: string | number
  isHighlighted?: boolean
  isRemoved?: boolean
  isTraversed?: boolean
  nextId?: number
  prevId?: number
}

type ListType = "singly" | "doubly" | "circular"

function buildPointers(nodes: NodeItem[], listType: ListType): NodeItem[] {
  return nodes.map((node, i) => ({
    ...node,
    nextId:
      i < nodes.length - 1
        ? i + 1
        : listType === "circular" && nodes.length > 1
          ? 0
          : undefined,
    prevId:
      (listType === "doubly" || listType === "circular") && i > 0
        ? i - 1
        : listType === "circular" && i === 0 && nodes.length > 1
          ? nodes.length - 1
          : undefined,
  }))
}

// --- Pseudocode Definitions ---
const pseudocodeDefinitions = {
  append: [
    "function append(value):",
    "  newNode = Node(value)",
    "  if head is null:",
    "    head = newNode",
    "    return",
    "  current = head",
    "  while current.next is not null:",
    "    current = current.next",
    "  current.next = newNode",
  ],
  prepend: [
    "function prepend(value):",
    "  newNode = Node(value)",
    "  newNode.next = head",
    "  head = newNode",
  ],
  remove: [
    "function remove(index):",
    "  if head is null:",
    "    return",
    "  if index == 0:",
    "    head = head.next",
    "    return",
    "  current = head",
    "  for i = 0 to index-1:",
    "    current = current.next",
    "  current.next = current.next.next",
  ],
  traverseForward: [
    "function traverseForward():",
    "  current = head",
    "  while current is not null:",
    "    visit(current)",
    "    current = current.next",
  ],
  traverseBackward: [
    "function traverseBackward():",
    "  current = tail",
    "  while current is not null:",
    "    visit(current)",
    "    current = current.prev",
  ],
}

// --- Static “About Linked Lists” content ---
const linkedListIntro = {
  bullets: [
    "A linked list is a linear collection of nodes where each node stores a value and pointers (links) to its neighbors.",
    "Unlike arrays, nodes are scattered in memory; links connect them. This makes insert/delete O(1) when you already have the node (no shifting).",
    "Random access is not supported — reaching index i typically takes O(i).",
    "Common operations: prepend (O(1)), append (O(n) unless you keep tail → O(1)), delete at index (O(n)), traversal (O(n)).",
  ],
  diagram: [
    "HEAD           next         next         next         null",
    "  │              │            │            │            │ ",
    " [10] ───────▶ [20] ───────▶ [30] ───────▶ [40] ───▶  null",
  ],
}

// --- Per-type dynamic content ---
const typeDetails: Record<ListType, {
  title: string
  description: string
  howItWorks: string[]
  pros: string[]
  cons: string[]
  useCases: string[]
  complexity: { prepend: string; append: string; deleteAtI: string; traverse: string }
  diagram: string[]
}> = {
  singly: {
    title: "Singly Linked List (SLL)",
    description: "Each node holds a value and a pointer to next. Traversal is forward-only. Tail points to null.",
    howItWorks: [
      "Node = { value, next }",
      "HEAD stores first node; follow next to traverse.",
      "TAIL is the last node with next = null.",
    ],
    pros: [
      "Simple structure, minimal extra memory.",
      "Prepend is O(1).",
      "Delete-after-node is O(1).",
    ],
    cons: [
      "No backward traversal.",
      "Deleting a node without its previous pointer requires O(n) scan.",
      "Append is O(n) unless tail pointer is maintained.",
    ],
    useCases: ["Stacks/Queues (as building blocks)", "Adjacency lists", "Incremental logs"],
    complexity: { prepend: "O(1)", append: "O(n) (with tail → O(1))", deleteAtI: "O(n)", traverse: "O(n)" },
    diagram: [
      "HEAD           next         next         null",
      "  │              │            │            │",
      " [A] ───────▶  [B] ───────▶ [C] ───────▶ null",
    ],
  },
  doubly: {
    title: "Doubly Linked List (DLL)",
    description: "Each node holds prev and next pointers, enabling traversal in both directions.",
    howItWorks: [
      "Node = { value, prev, next }",
      "HEAD.prev = null; TAIL.next = null.",
      "Maintain prev on insert/delete.",
    ],
    pros: [
      "Bidirectional traversal.",
      "Delete given node in O(1) (when node known).",
      "Easier to remove tail or insert before a node.",
    ],
    cons: [
      "Extra memory for prev pointers.",
      "More pointer bookkeeping on updates.",
    ],
    useCases: ["LRU caches (with hash map + DLL)", "Undo/Redo", "Text editors (gaps/lists)"],
    complexity: { prepend: "O(1)", append: "O(n) (with tail → O(1))", deleteAtI: "O(n)", traverse: "O(n)" },
    diagram: [
      "null        prev   next        prev   next        prev   next    null",
      "  │           │     │            │     │            │     │        │ ",
      " [A] ◀────▶ [B] ◀────▶ [C] ◀────▶ [D] ◀────▶ [E] ──▶ null",
    ],
  },
  circular: {
    title: "Circular Linked List (CLL)",
    description: "Tail’s next points back to head (and in circular DLL, head.prev points to tail). No null at ends.",
    howItWorks: [
      "SLL-CLL: TAIL.next = HEAD.",
      "DLL-CLL: additionally HEAD.prev = TAIL.",
      "Stop traversal when you loop back.",
    ],
    pros: [
      "Great for round-robin scheduling and buffering.",
      "No null checks at ends.",
    ],
    cons: [
      "Careful to avoid infinite loops.",
      "Edge cases with 1 node (self-loop).",
    ],
    useCases: ["CPU scheduling (round-robin)", "Multiplayer turn rotation", "Circular buffers"],
    complexity: { prepend: "O(1)", append: "O(n) (with tail → O(1))", deleteAtI: "O(n)", traverse: "O(n)" },
    diagram: [
      "               ┌──────────────────────────────────────┐",
      "               │                                      │",
      " HEAD          ▼             next          next       │",
      "  │         [A] ─────────▶  [B]  ───────▶  [C]  ──────┘",
      "  └───────────────────────────────◀─────────────────── ",
    ],
  },
}

export default function LinkedListVisualizerPage() {
  const [nodes, setNodes] = useState<NodeItem[]>(
    buildPointers([{ value: 10 }, { value: 20 }, { value: 30 }], "singly")
  )
  const [inputValue, setInputValue] = useState("")
  const [currentStep, setCurrentStep] = useState(0)
  const [operations, setOperations] = useState<string[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [traversalIndex, setTraversalIndex] = useState<number | null>(null)
  const [traversalDone, setTraversalDone] = useState(false)
  const [listType, setListType] = useState<ListType>("singly")
  const [traversalDirection, setTraversalDirection] = useState<"forward" | "backward">("forward")
  const [speed, setSpeed] = useState<[number]>([1000]) // ms
  const [currentPseudocode, setCurrentPseudocode] = useState<string[]>(
    pseudocodeDefinitions.traverseForward
  )
  const [currentCodeLine, setCurrentCodeLine] = useState<number>(-1)

  const { isAudioEnabled, toggleAudio, announce, stop } = useAudioNarration()

  // Operation explainer (micro-lesson)
  const [opHint, setOpHint] = useState<{ title: string; points: string[] } | null>(null)

  // Head and tail indices
  const headIndex = nodes.length > 0 ? 0 : null
  const tailIndex = nodes.length > 0 ? nodes.length - 1 : null

  const getNodeByIndex = (index: number | null) =>
    index !== null && index >= 0 && index < nodes.length ? nodes[index] : null

  // Rebuild pointers on list type change
  useEffect(() => {
    setNodes(prev => buildPointers(prev, listType))
    setTraversalIndex(null)
    setTraversalDone(false)
    setCurrentStep(0)
    // Reset explainer to list-type concept
    const t = typeDetails[listType]
    setOpHint({
      title: t.title,
      points: [
        t.description,
        `Complexity → Prepend: ${t.complexity.prepend}, Append: ${t.complexity.append}, Delete@i: ${t.complexity.deleteAtI}, Traverse: ${t.complexity.traverse}`,
      ],
    })
  }, [listType])

  const resetList = () => {
    setNodes(buildPointers([{ value: 10 }, { value: 20 }, { value: 30 }], listType))
    setOperations([])
    setCurrentStep(0)
    setIsPlaying(false)
    setTraversalIndex(null)
    setTraversalDone(false)
    setOpHint(null)
    stop()
  }

  // --- Pseudocode Step Helpers ---
  const highlightPseudocode = (operation: keyof typeof pseudocodeDefinitions, line: number) => {
    setCurrentPseudocode(pseudocodeDefinitions[operation])
    setCurrentCodeLine(line)
  }

  // --- Operations (with hints) ---
  const appendNode = () => {
    if (!inputValue.trim()) return
    highlightPseudocode("append", 1)
    const newValue = isNaN(Number(inputValue)) ? inputValue : Number(inputValue)

    setTimeout(() => highlightPseudocode("append", 2), 200)
    setTimeout(() => {
      if (nodes.length === 0) {
        highlightPseudocode("append", 3)
        setTimeout(() => highlightPseudocode("append", 4), 200)
      } else {
        highlightPseudocode("append", 5)
        setTimeout(() => highlightPseudocode("append", 6), 200)
        setTimeout(() => highlightPseudocode("append", 7), 400)
        setTimeout(() => highlightPseudocode("append", 8), 600)
      }
    }, 400)

    setNodes(prev => buildPointers([...prev, { value: newValue, isHighlighted: true }], listType))
    setOperations(prev => [...prev, `Appended ${newValue}`])
    announce(`Appended ${newValue}`)
    setInputValue("")
    setTraversalDone(false)

    setOpHint({
      title: "Append: why O(n)?",
      points: [
        "We must walk to the last node to link it.",
        "If we maintained a tail pointer, append could be O(1).",
        "Updates: last.next → new; new.next → null (or head in circular).",
      ],
    })

    setTimeout(() => {
      setNodes(prev => prev.map(n => ({ ...n, isHighlighted: false })))
      setCurrentCodeLine(-1)
    }, 1000)
  }

  const prependNode = () => {
    if (!inputValue.trim()) return
    highlightPseudocode("prepend", 1)
    const newValue = isNaN(Number(inputValue)) ? inputValue : Number(inputValue)
    setTimeout(() => highlightPseudocode("prepend", 2), 200)
    setTimeout(() => highlightPseudocode("prepend", 3), 400)
    setTimeout(() => highlightPseudocode("prepend", 4), 600)

    setNodes(prev => buildPointers([{ value: newValue, isHighlighted: true }, ...prev], listType))
    setOperations(prev => [...prev, `Prepended ${newValue}`])
    announce(`Prepended ${newValue}`)
    setInputValue("")
    setTraversalDone(false)

    setOpHint({
      title: "Prepend: O(1)",
      points: [
        "We rewrite head to the new node.",
        "New node next points to previous head.",
        "Prev pointers updated in doubly/circular lists.",
      ],
    })

    setTimeout(() => {
      setNodes(prev => prev.map(n => ({ ...n, isHighlighted: false })))
      setCurrentCodeLine(-1)
    }, 1000)
  }

  const removeNode = (index: number) => {
    if (nodes.length === 0 || index < 0 || index >= nodes.length) return

    highlightPseudocode("remove", 1)
    setTimeout(() => highlightPseudocode("remove", 2), 200)
    setTimeout(() => highlightPseudocode("remove", 3), 400)
    setTimeout(() => {
      if (index === 0) {
        highlightPseudocode("remove", 4)
        setTimeout(() => highlightPseudocode("remove", 5), 200)
      } else {
        highlightPseudocode("remove", 6)
        setTimeout(() => highlightPseudocode("remove", 7), 200)
        setTimeout(() => highlightPseudocode("remove", 8), 400)
        setTimeout(() => highlightPseudocode("remove", 9), 600)
      }
    }, 600)

    setNodes(prev => prev.map((n, i) => (i === index ? { ...n, isRemoved: true } : n)))
    const node = nodes[index]
    setOperations(prev => [...prev, `Removed ${node?.value}`])
    announce(`Removed ${node?.value}`)

    setOpHint({
      title: "Delete at index i: O(n)",
      points: [
        "We must reach node i−1 to splice next pointers.",
        "In DLL, also update prev pointers.",
        "Edge case: deleting head/tail is simpler.",
      ],
    })

    setTimeout(() => {
      setNodes(prev => buildPointers(prev.filter((_, i) => i !== index), listType))
      setTraversalIndex(null)
      setTraversalDone(false)
      setCurrentCodeLine(-1)
    }, 1000)
  }

  const startTraversal = (direction: "forward" | "backward" = "forward") => {
    setNodes(prev => prev.map(n => ({ ...n, isTraversed: false })))
    setTraversalDirection(direction)
    if (direction === "forward") {
      setTraversalIndex(headIndex)
      setOperations(prev => [...prev, `Started forward traversal`])
      announce("Started forward traversal")
      setCurrentPseudocode(pseudocodeDefinitions.traverseForward)
      setCurrentCodeLine(1)
      setOpHint({
        title: "Forward traversal",
        points: [
          "Start at head.",
          "Visit node, then follow next.",
          listType === "circular" ? "Stop when we loop back to head." : "Stop at null (tail).",
        ],
      })
    } else {
      setTraversalIndex(tailIndex)
      setOperations(prev => [...prev, `Started backward traversal`])
      announce("Started backward traversal")
      setCurrentPseudocode(pseudocodeDefinitions.traverseBackward)
      setCurrentCodeLine(1)
      setOpHint({
        title: "Backward traversal (DLL/Circular)",
        points: [
          "Start at tail.",
          "Visit node, then follow prev.",
          listType === "circular" ? "Stop when we loop back to tail." : "Stop at null (head).",
        ],
      })
    }
    setCurrentStep(0)
    setTraversalDone(false)
  }

  const stepForward = () => {
    if (traversalIndex === null) return
    setNodes(prev => prev.map((n, i) => (i === traversalIndex ? { ...n, isTraversed: true } : n)))
    const current = getNodeByIndex(traversalIndex)
    if (current) announce(`Visiting node ${current.value}`)
    let nextIndex: number | null | undefined
    if (traversalDirection === "forward") {
      nextIndex = current?.nextId
      if (listType === "circular" && nextIndex === headIndex) nextIndex = null
    } else {
      nextIndex = current?.prevId
      if (listType === "circular" && nextIndex === tailIndex) nextIndex = null
    }
    if (nextIndex !== undefined && nextIndex !== null && getNodeByIndex(nextIndex)) {
      setTraversalIndex(nextIndex)
      setCurrentStep(s => s + 1)
    } else {
      setTraversalIndex(null)
      setIsPlaying(false)
      setTraversalDone(true)
    }
  }

  const stepBack = () => {
    if (traversalIndex === null) return
    let prevIndex: number | null | undefined
    if (traversalDirection === "forward") {
      prevIndex = getNodeByIndex(traversalIndex)?.prevId
    } else {
      prevIndex = getNodeByIndex(traversalIndex)?.nextId
    }
    if (prevIndex !== undefined && prevIndex !== null && prevIndex >= 0 && prevIndex < nodes.length) {
      setNodes(prev => prev.map((n, i) => (i === prevIndex ? { ...n, isTraversed: false } : n)))
      setTraversalIndex(prevIndex)
      setCurrentStep(s => Math.max(0, s - 1))
      setTraversalDone(false)
    }
  }

  const play = () => {
    if (nodes.length === 0) return
    setIsPlaying(true)
    if (traversalIndex === null) startTraversal(traversalDirection)
    setTraversalDone(false)
  }

  const pause = () => setIsPlaying(false)

  // --- Speed-controlled traversal (single effect) ---
  useEffect(() => {
    if (isPlaying && traversalIndex !== null) {
      const codeLine = 3
      setCurrentCodeLine(codeLine)
      const timer = setTimeout(() => {
        stepForward()
        setCurrentCodeLine(4)
      }, speed[0])
      return () => clearTimeout(timer)
    }
  }, [isPlaying, traversalIndex, speed])

  useEffect(() => {
    if (traversalDone) {
      setNodes(prev => prev.map(n => ({ ...n, isTraversed: true })))
    }
  }, [traversalDone])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if ([" ", "arrowleft", "arrowright", "r"].includes(k)) e.preventDefault()
      if (k === " ") setIsPlaying(prev => !prev)
      else if (k === "arrowright") stepForward()
      else if (k === "arrowleft") stepBack()
      else if (k === "r") resetList()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [traversalIndex])

  // List type selection UI
  const listTypeOptions = [
    { value: "singly", label: "Singly Linked List", icon: <ChevronRight className="inline h-4 w-4" /> },
    { value: "doubly", label: "Doubly Linked List", icon: <ArrowLeftRight className="inline h-4 w-4" /> },
    { value: "circular", label: "Circular Linked List", icon: <Repeat className="inline h-4 w-4" /> },
  ] as const

  // Render in pointer-following order starting at head
  const renderNodes = useMemo(() => {
    if (nodes.length === 0) return []
    const result: (NodeItem & { index: number })[] = []
    const visited = new Set<number>()
    let currentIndex = headIndex
    while (currentIndex !== null && !visited.has(currentIndex)) {
      const node = getNodeByIndex(currentIndex)
      if (!node) break
      result.push({ ...node, index: currentIndex })
      visited.add(currentIndex)
      if (listType === "circular" && result.length > 1 && currentIndex === headIndex) break
      currentIndex = node.nextId ?? null
    }
    return result
  }, [nodes, headIndex, listType])

  const applications = [
    {
      title: "Dynamic Memory",
      description: "Linked lists allow efficient insertions and deletions without reallocating entire structures",
      examples: ["Memory allocators", "Adjacency lists", "Undo/Redo lists"],
    },
    {
      title: "Flexible Data Structures",
      description: "Used where size changes frequently and random access is not required",
      examples: ["Implementing stacks/queues", "Graph representations", "Sparse data"],
    },
  ]

  const t = typeDetails[listType]

  const LinkedListConcepts = (
    <div className="space-y-6">
      <Card className="bg-card shadow-md border border-border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            Understanding Linked Lists
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm md:text-base text-muted-foreground">
          <p>
            Unlike arrays which store elements in contiguous memory, a <strong>Linked List</strong> stores elements in discrete nodes scattered across memory. Each node contains its data and a <em>pointer</em> (or reference) to the next node in the sequence.
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            {linkedListIntro.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <div className="rounded-md bg-gray-900 border border-border p-4 overflow-x-auto text-gray-100 shadow-inner mt-4">
            <div className="font-mono text-xs md:text-sm leading-6 whitespace-pre">
              {linkedListIntro.diagram.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 mb-6">
        <VideoEmbed youtubeId="njTh_OwMCEs" title="Data Structures: Linked Lists (HackerRank)" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {(Object.entries(typeDetails) as [ListType, typeof typeDetails[ListType]][]).map(([key, info]) => (
          <Card key={key} className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                {key === "singly" && <ChevronRight className="w-5 h-5 text-primary" />}
                {key === "doubly" && <ArrowLeftRight className="w-5 h-5 text-primary" />}
                {key === "circular" && <Repeat className="w-5 h-5 text-primary" />}
                {info.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
              <div>
                <p className="font-medium text-foreground mb-3">{info.description}</p>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Mechanics:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground select-none">
                      {info.howItWorks.map((item, i) => <li key={i}>{item}</li>)}
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
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between items-center bg-muted/50 p-2 rounded">
                    <span className="font-medium">Prepend</span>
                    <Badge variant="secondary" className="font-mono">{info.complexity.prepend}</Badge>
                  </div>
                  <div className="flex justify-between items-center bg-muted/50 p-2 rounded">
                    <span className="font-medium">Append</span>
                    <Badge variant="secondary" className="font-mono">{info.complexity.append}</Badge>
                  </div>
                  <div className="flex justify-between items-center bg-muted/50 p-2 rounded">
                    <span className="font-medium">Delete (at index)</span>
                    <Badge variant="secondary" className="font-mono">{info.complexity.deleteAtI}</Badge>
                  </div>
                  <div className="flex justify-between items-center bg-muted/50 p-2 rounded">
                    <span className="font-medium">Traverse</span>
                    <Badge variant="secondary" className="font-mono">{info.complexity.traverse}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 bg-muted/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
        <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Memory Overhead & Safety</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          While Linked Lists excel at <code>O(1)</code> insertions without needing large contiguous blocks of memory, they inherently suffer from <strong>cache locality issues</strong> because adjacent nodes might be far apart in actual hardware memory. Furthermore, doubling the pointers (as seen in Doubly Linked Lists) increases the memory overhead per node. Implementers must also be extremely careful with pointer management to avoid memory leaks or "orphan nodes" that remain inaccessible.
        </p>
      </div>
    </div>
  );

  return (
    <VisualizerLayout
      title="Linked List Visualizer"
      description="Visualize singly, doubly, and circular linked list operations: insert, delete, and traversal"
      difficulty="Advanced"
      isPlaying={isPlaying}
      onPlay={play}
      onPause={pause}
      onStepBack={stepBack}
      onStepForward={stepForward}
      onReset={resetList}
      currentStep={currentStep}
      totalSteps={Math.max(operations.length, nodes.length)}
      complexity={{ time: "O(n)", space: "O(n)" }}
      applications={applications}
      concepts={LinkedListConcepts}
    >
      <div className="w-full space-y-6">
        {/* List type selection */}
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6 mt-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="font-semibold">List Type:</span>
            {listTypeOptions.map(opt => (
              <Button
                key={opt.value}
                variant={listType === opt.value ? "secondary" : "outline"}
                size="sm"
                onClick={() => setListType(opt.value as ListType)}
                className="flex items-center gap-1"
              >
                {opt.icon}
                {opt.label}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAudio}
            title={isAudioEnabled ? "Disable Narration" : "Enable Narration"}
            className={`flex items-center gap-2 ${isAudioEnabled ? 'bg-green-100/50 text-green-600 border-green-200 hover:bg-green-200/50 hover:text-green-700' : 'text-muted-foreground hover:bg-muted'}`}
          >
            {isAudioEnabled ? <><Volume2 className="h-4 w-4" /> Audio On</> : <><VolumeX className="h-4 w-4" /> Audio Off</>}
          </Button>
        </div>

        {/* Operation Complexity Strip */}
        <div className="flex flex-wrap gap-2 text-[11px] mb-4">
          <Badge variant="outline">
            Append: {t.complexity.append}
          </Badge>
          <Badge variant="outline">Prepend: {t.complexity.prepend}</Badge>
          <Badge variant="outline">Delete@i: {t.complexity.deleteAtI}</Badge>
          <Badge variant="outline">Traverse: {t.complexity.traverse}</Badge>
          {listType === "circular" && <Badge variant="secondary">Circular wraps to head</Badge>}
        </div>

        <div className="flex-1 flex items-center gap-4 overflow-x-auto py-12 px-4 min-h-[280px]">
          {renderNodes.length === 0 ? (
            <div className="text-muted-foreground">List is empty</div>
          ) : (
            <div className="flex items-center relative">
              {/* HEAD indicator */}
              {listType !== "circular" && (
                <div className="flex flex-col items-center mr-4">
                  <div className="text-xs text-muted-foreground mb-1">HEAD</div>
                  <div className="w-8 h-0.5 bg-primary" />
                </div>
              )}

              {/* Nodes + Arrows */}
              {renderNodes.map((node) => {
                const hasNext =
                  node.nextId !== undefined && node.nextId >= 0 && node.nextId < nodes.length
                return (
                  <div key={node.index} className="flex items-center gap-3 relative">
                    {/* Node */}
                    <div
                      className={`
                        w-28 h-24 border-2 rounded-lg flex flex-col items-center justify-center relative
                        transition-all duration-300 z-10
                        ${node.isRemoved
                          ? "bg-red-100 border-red-500 opacity-60 line-through"
                          : traversalIndex === node.index
                            ? "bg-blue-200 border-blue-500 scale-105 shadow-lg"
                            : node.isTraversed
                              ? "bg-green-200 border-green-500"
                              : node.isHighlighted
                                ? "bg-accent/20 border-accent scale-105"
                                : "bg-card border-border"
                        }
                      `}
                      style={{
                        transform:
                          traversalIndex === node.index
                            ? "translateY(-4px)"
                            : node.isHighlighted
                              ? "translateY(-2px)"
                              : "translateY(0)",
                      }}
                    >
                      <div className="font-mono font-bold text-lg">{node.value}</div>
                      {/* Index */}
                      <div className="absolute -bottom-6 text-[11px] text-muted-foreground">
                        Index: {node.index}
                      </div>
                      {/* Pointer metadata */}
                      <div className="absolute -bottom-10 text-[11px] text-muted-foreground leading-tight">
                        next: {node.nextId ?? "null"}
                        {(listType === "doubly" || listType === "circular") && (
                          <> · prev: {node.prevId ?? "null"}</>
                        )}
                      </div>
                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 hover:opacity-100 transition-opacity"
                        onClick={() => removeNode(node.index)}
                        aria-label={`Delete node ${node.value}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>

                    {/* Arrows */}
                    {hasNext && (
                      <div className="flex flex-col items-center">
                        {(listType === "singly" || listType === "circular") && (
                          <ChevronRight className="h-6 w-6 text-accent" />
                        )}
                        {listType === "doubly" && (
                          <div className="flex flex-col items-center">
                            <ChevronRight className="h-6 w-6 text-accent" />
                            <ArrowLeft className="h-6 w-6 text-accent -mt-2" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* TAIL indicator + null */}
              {listType !== "circular" && (
                <div className="flex items-center ml-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-0.5 bg-primary" />
                    <div className="text-xs text-muted-foreground mt-1">TAIL</div>
                  </div>
                  <Badge variant="outline" className="ml-2 text-[11px]">
                    null
                  </Badge>
                </div>
              )}

              {/* Circular curved bridge */}
              {listType === "circular" && renderNodes.length > 1 && (
                <svg
                  className="absolute w-full h-20 -bottom-6 text-accent -z-10"
                  viewBox="0 0 100 40"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 10 30 C 40 0, 60 0, 90 30"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <polygon points="90,30 86,27 86,33" fill="currentColor" />
                </svg>
              )}
            </div>
          )}
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

        {/* Controls */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Insert
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Value to insert"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === "Enter" && appendNode()}
              />
              <div className="flex gap-2">
                <Button onClick={appendNode} disabled={!inputValue.trim()} className="w-full">
                  Append
                </Button>
                <Button onClick={prependNode} disabled={!inputValue.trim()} className="w-full" variant="outline">
                  Prepend
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Delete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Click the trash icon on a node to remove it</p>
              <div className="flex flex-wrap gap-2">
                {renderNodes.map(n => (
                  <Button key={n.index} variant="destructive" size="sm" onClick={() => removeNode(n.index)}>
                    Delete {n.value}
                  </Button>
                ))}
                {renderNodes.length === 0 && (
                  <div className="text-sm text-muted-foreground">No nodes to delete</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">Traverse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => startTraversal("forward")} disabled={renderNodes.length === 0} className="w-full sm:w-auto">
                  Start Forward
                </Button>
                {(listType === "doubly" || listType === "circular") && (
                  <Button
                    onClick={() => startTraversal("backward")}
                    disabled={renderNodes.length === 0}
                    className="w-full sm:w-auto"
                    variant="outline"
                  >
                    Start Backward
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={stepBack} disabled={traversalIndex === null} variant="outline">
                  Back
                </Button>
                <Button onClick={stepForward} disabled={traversalIndex === null} variant="outline">
                  Next
                </Button>
                <Button onClick={() => (isPlaying ? pause() : play())} disabled={renderNodes.length === 0}>
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <Button variant="ghost" onClick={resetList}>
                  Reset
                </Button>
              </div>

              <div className="text-sm text-muted-foreground mt-2">
                Current:{" "}
                {traversalIndex === null
                  ? "—"
                  : `${getNodeByIndex(traversalIndex)?.value} (index ${traversalIndex})`}
                {traversalIndex !== null && ` | Direction: ${traversalDirection}`}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Speed Control */}
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

        {/* Operation Explainer */}
        {opHint && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{opHint.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                {opHint.points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Operations / Steps */}
        {operations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {operations.map((op, i) => (
                  <div
                    key={i}
                    className={`text-sm p-2 rounded ${i === currentStep
                      ? "bg-accent/20 border border-accent"
                      : i < currentStep
                        ? "bg-muted/50 text-muted-foreground"
                        : "text-muted-foreground"
                      }`}
                  >
                    <Badge variant="outline" className="mr-2 text-xs">
                      {i + 1}
                    </Badge>
                    {op}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </VisualizerLayout>
  )
}
