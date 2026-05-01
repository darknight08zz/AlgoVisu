"use client"

import { useState, useEffect, useMemo } from "react"
import { VisualizerLayout } from "../../../components/visualizer-layout"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { Layers, Plus, Trash2, Eye, RotateCcw, Star, ArrowLeftRight, RotateCcw as ResetIcon, Volume2, VolumeX } from "lucide-react"

import { useAudioNarration } from "../../../lib/hooks/useAudioNarration"
import { VideoEmbed } from "../../../components/ui/video-embed"

// Types
interface QueueElement {
  id: number
  value: number
  priority?: number
  isNew?: boolean
  isRemoving?: boolean
}

type QueueType = "linear" | "circular" | "priority" | "deque"

const applicationsMap: Record<QueueType, { title: string; description: string; examples: string[] }[]> = {
  linear: [
    { title: "Task Scheduling", description: "Queues manage tasks in order of arrival.", examples: ["Print queue", "CPU scheduling"] },
  ],
  circular: [
    { title: "Streaming Buffers", description: "Efficiently reuse memory in fixed-size buffers.", examples: ["Audio streaming", "Sensor data"] },
  ],
  priority: [
    { title: "Emergency Systems", description: "Serve high-priority items first.", examples: ["Hospital triage", "Network QoS"] },
  ],
  deque: [
    { title: "Sliding Window", description: "Efficiently maintain window of recent elements.", examples: ["Max in subarray", "Rate limiting"] },
  ],
}

const makeId = () => Date.now() + Math.floor(Math.random() * 1000)

const initialQueues: Record<QueueType, QueueElement[]> = {
  linear: [{ id: 1, value: 10 }, { id: 2, value: 20 }, { id: 3, value: 30 }],
  circular: [{ id: 4, value: 10 }, { id: 5, value: 20 }, { id: 6, value: 30 }],
  priority: [
    { id: 7, value: 10, priority: 3 },
    { id: 8, value: 20, priority: 1 },
    { id: 9, value: 30, priority: 2 },
  ],
  deque: [{ id: 10, value: 10 }, { id: 11, value: 20 }, { id: 12, value: 30 }],
}

// Per-type details (from previous step)
const queueTypeDetails: Record<
  QueueType,
  {
    label: string
    description: string
    howItWorks: string[]
    useCases: string[]
    complexity: { time: string; space: string }
    notes?: string[]
  }
> = {
  linear: {
    label: "Linear Queue",
    description:
      "A standard FIFO structure: enqueue at the rear, dequeue at the front. Simple to implement using arrays or linked lists.",
    howItWorks: [
      "Elements enter at the rear and leave from the front (FIFO).",
      "Array-based versions may shift pointers instead of data for efficiency.",
      "When the front moves forward, freed slots may be unused without wrap-around.",
    ],
    useCases: ["Print spooling", "CPU ready queues (simplified models)", "Customer service lines / call centers"],
    complexity: { time: "O(1) amortized for enqueue/dequeue (with two-pointer design)", space: "O(n)" },
    notes: ["Avoid O(n) shifting by using head/tail indices."],
  },
  circular: {
    label: "Circular Queue",
    description:
      "A fixed-size queue where front/rear wrap around the buffer. Maximizes space usage without shifting elements.",
    howItWorks: [
      "Use modulo arithmetic for head/tail indices.",
      "Detect full/empty with size counter or (tail+1==head) convention.",
      "Ideal for bounded buffers and streaming data.",
    ],
    useCases: ["Audio/video streaming buffers", "Producer–consumer bounded buffers", "Embedded systems"],
    complexity: { time: "O(1) enqueue/dequeue", space: "O(k) fixed (buffer size)" },
    notes: ["Be careful with full vs empty conventions (off-by-one issues)."],
  },
  priority: {
    label: "Priority Queue",
    description:
      "Removes items by priority rather than arrival time. Often implemented with a binary heap for O(log n) updates.",
    howItWorks: [
      "Each element has a priority; the smallest (or largest) priority is served first.",
      "Binary heap gives O(log n) insert and remove-min/max.",
      "Stable ordering for equal priority needs extra metadata if required.",
    ],
    useCases: ["Hospital triage", "Dijkstra’s shortest path", "Network QoS"],
    complexity: { time: "O(log n) enqueue/dequeue (heap); O(1) peek", space: "O(n)" },
    notes: ["Heaps guarantee the top element only; the rest are not fully sorted."],
  },
  deque: {
    label: "Deque (Double-Ended Queue)",
    description:
      "Supports insertion and removal at both front and back. Useful for sliding-window problems and as a building block for other structures.",
    howItWorks: [
      "pushFront/popFront and pushBack/popBack operations.",
      "Can be implemented via linked lists or circular buffers.",
      "Great for monotonic-queue patterns.",
    ],
    useCases: ["Sliding window max/min", "Browser history", "Schedulers mixing LIFO/FIFO"],
    complexity: { time: "O(1) for all four ends in typical implementations", space: "O(n)" },
    notes: ["Monotonic deque yields O(n) window-max over an array."],
  },
}

export default function QueueVisualizerPage() {
  const [queueType, setQueueType] = useState<QueueType>("linear")
  const [queue, setQueue] = useState<QueueElement[]>(() => [...initialQueues["linear"]])
  const [inputValue, setInputValue] = useState("")
  const [priorityValue, setPriorityValue] = useState("1")
  const [peekedValue, setPeekedValue] = useState<number | null>(null)

  const { isAudioEnabled, toggleAudio, announce, stop } = useAudioNarration()

  useEffect(() => {
    setQueue([...initialQueues[queueType]])
    setPeekedValue(null)
    setInputValue("")
    setPriorityValue("1")
    stop()
  }, [queueType, stop])

  const applications = applicationsMap[queueType]

  const resetQueue = () => {
    setQueue([...initialQueues[queueType]])
    setPeekedValue(null)
    setInputValue("")
    setPriorityValue("1")
    stop()
  }

  // --- Operations with animations ---
  const enqueue = () => {
    const num = Number(inputValue)
    if (!inputValue || isNaN(num)) return

    if (queueType === "priority") {
      const prio = Number(priorityValue) || 1
      const newElement: QueueElement = { id: makeId(), value: num, priority: prio, isNew: true }
      const newQueue = [...queue, newElement].sort((a, b) => (a.priority || 0) - (b.priority || 0))
      setQueue(newQueue)
      // remove highlight after a short delay
      setTimeout(() => {
        setQueue(prev => prev.map(el => ({ ...el, isNew: false })))
      }, 450)
    } else {
      const newElement: QueueElement = { id: makeId(), value: num, isNew: true }
      setQueue(prev => [...prev, newElement])
      setTimeout(() => {
        setQueue(prev => prev.map(el => ({ ...el, isNew: false })))
      }, 450)
    }
    setInputValue("")
    announce(`Enqueued ${num}`)
  }

  const dequeue = () => {
    if (queue.length === 0) return
    // animate removal of front
    const firstId = queue[0].id
    setQueue(prev => prev.map(el => (el.id === firstId ? { ...el, isRemoving: true } : el)))
    setPeekedValue(null)
    setTimeout(() => {
      setQueue(prev => prev.filter(el => el.id !== firstId))
    }, 300)
    const dequeuedValue = queue[0].value
    announce(`Dequeued ${dequeuedValue}`)
  }

  const peek = () => {
    if (queue.length > 0) {
      const top = queue[0].value
      setPeekedValue(top)
      announce(`Peeked at ${top}`)
    }
  }

  const pushFront = () => {
    const num = Number(inputValue)
    if (!inputValue || isNaN(num)) return
    const newEl: QueueElement = { id: makeId(), value: num, isNew: true }
    setQueue(prev => [newEl, ...prev])
    setTimeout(() => setQueue(prev => prev.map(el => ({ ...el, isNew: false }))), 450)
    setInputValue("")
    announce(`Pushed ${num} to front`)
  }

  const pushBack = () => {
    const num = Number(inputValue)
    if (!inputValue || isNaN(num)) return
    const newEl: QueueElement = { id: makeId(), value: num, isNew: true }
    setQueue(prev => [...prev, newEl])
    setTimeout(() => setQueue(prev => prev.map(el => ({ ...el, isNew: false }))), 450)
    setInputValue("")
    announce(`Pushed ${num} to back`)
  }

  const popFront = () => dequeue()

  const popBack = () => {
    if (queue.length === 0) return
    const lastId = queue[queue.length - 1].id
    setQueue(prev => prev.map(el => (el.id === lastId ? { ...el, isRemoving: true } : el)))
    setPeekedValue(null)
    setTimeout(() => setQueue(prev => prev.filter(el => el.id !== lastId)), 300)
    const poppedValue = queue[queue.length - 1].value
    announce(`Popped ${poppedValue} from back`)
  }

  const MAX_CIRCULAR_SIZE = 5
  const isCircularFull = queueType === "circular" && queue.length >= MAX_CIRCULAR_SIZE

  // --- Render Queue Elements (BIGGER + animations) ---
  const renderQueueElements = () => {
    if (queue.length === 0) {
      return <span className="text-muted-foreground">Queue is empty</span>
    }

    return queue.map((element, index) => {
      const isFront = index === 0
      const isBack = index === queue.length - 1 && queueType === "deque"

      return (
        <div key={element.id} className="relative">
          <div
            className={`
              w-24 h-24 md:w-28 md:h-28 border-2 rounded-xl flex flex-col items-center justify-center
              transition-all duration-300 ease-out cursor-pointer group
              ${element.isNew ? "ring-2 ring-primary/40 scale-105 translate-y-[-4px]" : ""}
              ${element.isRemoving ? "opacity-0 -translate-y-3" : ""}
              ${isFront
                ? "bg-blue-100 border-blue-500 text-blue-800"
                : queueType === "priority"
                  ? "bg-yellow-100 border-yellow-500 text-yellow-800"
                  : "bg-card border-border hover:border-accent/50"
              }
            `}
          >
            <span className="font-mono font-bold text-lg">{element.value}</span>
            {queueType === "priority" && element.priority !== undefined && (
              <span className="text-xs text-muted-foreground mt-0.5">P{element.priority}</span>
            )}
            <span className="text-[11px] text-muted-foreground">[{index}]</span>
            {isFront && <Badge variant="outline" className="mt-1 text-[10px]">Front</Badge>}
            {isBack && <Badge variant="secondary" className="mt-1 text-[10px]">Back</Badge>}
            {peekedValue !== null && isFront && (
              <Badge variant="secondary" className="mt-1 text-[10px]">Peeked</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => {
              // animate removal of this element
              const thisId = element.id
              setQueue(prev => prev.map(el => (el.id === thisId ? { ...el, isRemoving: true } : el)))
              setPeekedValue(null)
              setTimeout(() => setQueue(prev => prev.filter(el => el.id !== thisId)), 300)
            }}
            aria-label={`Remove item ${element.value}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )
    })
  }

  // --- Render Controls (with Peek + Reset side-by-side) ---
  const renderPeekResetCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Peek & Reset
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button onClick={peek} disabled={queue.length === 0} className="flex-1">
            <Eye className="h-4 w-4 mr-2" />
            Peek
          </Button>
          <Button onClick={resetQueue} variant="secondary" className="flex-1">
            <ResetIcon className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const renderControls = () => {
    switch (queueType) {
      case "priority":
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Enqueue (Priority)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Value"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Priority"
                    value={priorityValue}
                    onChange={(e) => setPriorityValue(e.target.value)}
                    className="w-24"
                    min="1"
                  />
                  <Button onClick={enqueue} disabled={!inputValue}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>


            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dequeue</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={dequeue} disabled={queue.length === 0} className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Dequeue
                </Button>
              </CardContent>
            </Card>

            {renderPeekResetCard()}
          </>
        )

      case "deque":
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  Push Front
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Value"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                  <Button onClick={pushFront} disabled={!inputValue}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Push Back
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Value"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                  <Button onClick={pushBack} disabled={!inputValue}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pop Front</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={popFront} disabled={queue.length === 0} className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Pop Front
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pop Back</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={popBack} disabled={queue.length === 0} className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Pop Back
                </Button>
              </CardContent>
            </Card>

            {renderPeekResetCard()}
          </>
        )

      default:
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {queueType === "circular" ? <RotateCcw className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                  Enqueue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Enter number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                  <Button
                    onClick={enqueue}
                    disabled={!inputValue || (queueType === "circular" && isCircularFull)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {queueType === "circular" && isCircularFull && (
                  <div className="text-xs text-red-500">Queue full (max {MAX_CIRCULAR_SIZE})</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dequeue</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={dequeue} disabled={queue.length === 0} className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Dequeue
                </Button>
              </CardContent>
            </Card>

            {renderPeekResetCard()}
          </>
        )
    }
  }

  const complexity = useMemo(() => {
    switch (queueType) {
      case "priority":
        return { time: "O(log n)", space: "O(n)" }
      default:
        return { time: "O(1)", space: "O(n)" }
    }
  }, [queueType])

  const typeInfo = queueTypeDetails[queueType]

  const QueueConcepts = (
    <div className="space-y-6">
      <Card className="bg-card shadow-md border border-border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            What is a Queue?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm md:text-base">
          <p>
            A <strong>Queue</strong> is a linear data structure fundamentally based on the <strong>First-In-First-Out (FIFO)</strong> principle. The very first element that is added into the queue will strictly be the first one to be removed out of it.
          </p>
          <p>
            Think of a physical line at an amusement park or a grocery store checkout. People join the line at the back (<strong>Enqueue</strong>), and they are served and leave the line from the front (<strong>Dequeue</strong>).
          </p>
          <div className="p-4 bg-muted/30 border rounded-lg shadow-sm space-y-2 mt-4">
            <h4 className="font-semibold text-foreground text-sm">Real-World Analogies & Applications:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Task Scheduling:</strong> Operating systems queuing background processes or CPU threads.</li>
              <li><strong>Network Printers:</strong> Multiple print jobs are spooled and managed in the exact order they were received.</li>
              <li><strong>Data Buffers:</strong> Audio/Video streaming where bytes of data are received and played back sequentially.</li>
              <li><strong>Breadth-First Search (BFS):</strong> Graph and tree traversal algorithms use queues to explore nodes level-by-level.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {(Object.entries(queueTypeDetails) as [QueueType, typeof queueTypeDetails[QueueType]][]).map(([key, info]) => (
          <Card key={key} className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                {key === "circular" && <RotateCcw className="w-5 h-5 text-primary" />}
                {key === "deque" && <ArrowLeftRight className="w-5 h-5 text-primary" />}
                {key === "priority" && <Star className="w-5 h-5 text-primary" />}
                {key === "linear" && <Layers className="w-5 h-5 text-primary" />}
                {info.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
              <div>
                <p className="font-medium text-foreground mb-3">{info.description}</p>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Mechanics:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {info.howItWorks.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>

                  <div className="bg-muted/30 p-3 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-1">Use Cases:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      {info.useCases.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-semibold text-foreground mb-2 text-xs uppercase tracking-wider">Complexity Profile</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col bg-muted/50 p-2 rounded">
                    <span className="font-medium text-muted-foreground mb-1">Time</span>
                    <span className="font-mono text-foreground">{info.complexity.time}</span>
                  </div>
                  <div className="flex flex-col bg-muted/50 p-2 rounded">
                    <span className="font-medium text-muted-foreground mb-1">Space</span>
                    <span className="font-mono text-foreground">{info.complexity.space}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 bg-muted/20 border-l-4 border-amber-500 p-4 rounded-r-lg">
        <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">Edge Cases & Memory Leaks</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Standard array-based <strong>Linear Queues</strong> suffer from a severe flaw: as elements are removed from the front, the empty space at the beginning of the array becomes unusable unless all remaining elements are repeatedly shifted left (an expensive <code>O(n)</code> operation). This is why <strong>Circular Queues</strong> (Ring Buffers) were invented, allowing the rear pointer to wrap around to the empty spaces at the front via modulo arithmetic, yielding a true <code>O(1)</code> space-efficient structure.
        </p>
      </div>

      <div className="mt-6 mb-6">
        <VideoEmbed youtubeId="wjI1WNcIntg" title="Data Structures: Stacks and Queues (HackerRank)" />
      </div>
    </div>
  );

  return (
    <VisualizerLayout
      title="Queue Visualizer"
      description="Explore 4 types of queues: Linear, Circular, Priority, and Deque"
      difficulty="Beginner"
      onReset={resetQueue}
      complexity={complexity}
      applications={applications}
      concepts={QueueConcepts}
    >
      <div className="w-full space-y-6">

        {/* Queue Type Selector */}
        <div className="flex justify-center mb-6 mt-4">
          <div className="inline-flex rounded-md border p-1 bg-muted w-full max-w-md">
            {(["linear", "circular", "priority", "deque"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setQueueType(type)}
                className={`
                  flex-1 py-2 text-sm font-medium rounded-sm transition-colors
                  ${queueType === type
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAudio}
            title={isAudioEnabled ? "Disable Narration" : "Enable Narration"}
            className={`flex items-center gap-2 mt-4 md:mt-0 ${isAudioEnabled ? 'bg-green-100/50 text-green-600 border-green-200 hover:bg-green-200/50 hover:text-green-700' : 'text-muted-foreground hover:bg-muted'}`}
          >
            {isAudioEnabled ? <><Volume2 className="h-4 w-4" /> Audio On</> : <><VolumeX className="h-4 w-4" /> Audio Off</>}
          </Button>
        </div>

        {/* Queue Visualization (BIGGER) */}
        <div className="flex flex-wrap gap-5 justify-center min-h-[220px] md:min-h-[260px] items-center
             p-6 bg-gradient-to-br from-muted/30 to-background rounded-2xl border border-border shadow-sm">
          {renderQueueElements()}
        </div>

        {/* Controls */}
        <div className="grid md:grid-cols-3 gap-4">{renderControls()}</div>
      </div>
    </VisualizerLayout>
  )
}
