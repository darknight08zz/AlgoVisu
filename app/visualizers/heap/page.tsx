"use client"

import { useState, useEffect } from "react"
import { VisualizerLayout } from "../../../components/visualizer-layout"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { Plus, X, BarChart3, Zap, Volume2, VolumeX } from "lucide-react"

import { useAudioNarration } from "../../../lib/hooks/useAudioNarration"
import { VideoEmbed } from "../../../components/ui/video-embed"

type HeapType = "min" | "max"
type HeapStep = {
  description: string
  heap: number[]
  highlightedIndices: number[]
  codeLine: number
}

const pseudocode = [
  "function insert(value):",
  "  heap.push(value)",
  "  heapifyUp(heap.length - 1)",
  "",
  "function heapifyUp(index):",
  "  while index > 0:",
  "    parent = (index - 1) // 2",
  "    if satisfiesHeapProperty(parent, index): break",
  "    swap(heap[parent], heap[index])",
  "    index = parent",
  "",
  "function extractRoot():",
  "  if heap empty: return null",
  "  root = heap[0]",
  "  heap[0] = heap.pop()",
  "  heapifyDown(0)",
  "  return root",
  "",
  "function heapifyDown(index):",
  "  while true:",
  "    left = 2*index + 1",
  "    right = 2*index + 2",
  "    bestChild = chooseChildByHeapType(left, right)", // min: smaller; max: larger
  "    if bestChild out of range or satisfiesHeapProperty(index, bestChild): break",
  "    swap(heap[index], heap[bestChild])",
  "    index = bestChild",
  "",
  "// Floyd's Build-Heap (O(n))",
  "function buildHeap(arr):",
  "  heap = arr",
  "  start = floor(heap.length / 2) - 1",
  "  for i = start down to 0:",
  "    heapifyDown(i)",
]

export default function HeapVisualizer() {
  const [heapType, setHeapType] = useState<HeapType>("min")
  const [heap, setHeap] = useState<number[]>([])
  const [inputValue, setInputValue] = useState("")
  const [arrayInput, setArrayInput] = useState("")
  const [steps, setSteps] = useState<HeapStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [currentCodeLine, setCurrentCodeLine] = useState<number>(-1)

  const { isAudioEnabled, toggleAudio, announce, stop } = useAudioNarration()

  const applications = [
    {
      title: "Priority Queues",
      description: "Heaps power efficient priority queue implementations",
      examples: ["Task scheduling", "OS process management", "Event-driven simulations"],
    },
    {
      title: "Dijkstra’s Algorithm",
      description: "Min-heaps optimize shortest-path computation",
      examples: ["GPS navigation", "Network routing", "Game AI pathfinding"],
    },
    {
      title: "Heap Sort",
      description: "In-place O(n log n) sorting algorithm",
      examples: ["Embedded systems", "Real-time systems", "Memory-constrained environments"],
    },
  ]

  const resetHeap = () => {
    setHeap([])
    setSteps([])
    setCurrentStep(0)
    setCurrentCodeLine(-1)
    stop()
  }

  // --- Heap helpers that adapt to min/max cleanly ---

  /** True if the pair (parentIdx, childIdx) already satisfies the heap property. */
  const satisfiesProperty = (parentIdx: number, childIdx: number, arr: number[]) => {
    if (childIdx < 0 || childIdx >= arr.length) return true
    if (heapType === "min") return arr[parentIdx] <= arr[childIdx]
    return arr[parentIdx] >= arr[childIdx]
  }

  /** For heapify-up: should parent and child be swapped? */
  const shouldSwapUp = (parentIdx: number, childIdx: number, arr: number[]) => {
    if (heapType === "min") return arr[parentIdx] > arr[childIdx]
    return arr[parentIdx] < arr[childIdx]
  }

  /** For heapify-down: pick the child (left/right) that should win the comparison. */
  const selectSwapChild = (index: number, arr: number[]) => {
    const left = 2 * index + 1
    const right = 2 * index + 2
    const n = arr.length
    if (left >= n) return -1
    if (right >= n) return left
    if (heapType === "min") {
      return arr[left] <= arr[right] ? left : right
    } else {
      return arr[left] >= arr[right] ? left : right
    }
  }

  const addStep = (description: string, heapState: number[], highlighted: number[], codeLine: number) => {
    setSteps(prev => [...prev, { description, heap: [...heapState], highlightedIndices: [...highlighted], codeLine }])
  }

  // --- Insert (heapify up) ---
  const handleInsert = () => {
    const val = Number(inputValue)
    if (isNaN(val)) return

    let arr = [...heap, val]
    const localSteps: HeapStep[] = []

    localSteps.push({
      description: `Inserted ${val} at index ${arr.length - 1}.`,
      heap: [...arr],
      highlightedIndices: [arr.length - 1],
      codeLine: 2,
    })

    let idx = arr.length - 1
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2)

      localSteps.push({
        description: `Compare child index ${idx} (value ${arr[idx]}) with parent index ${parent} (value ${arr[parent]}).`,
        heap: [...arr],
        highlightedIndices: [idx, parent],
        codeLine: 7,
      })

      if (!shouldSwapUp(parent, idx, arr)) {
        localSteps.push({
          description: `Heap property satisfied. Stop heapify-up.`,
          heap: [...arr],
          highlightedIndices: [idx, parent],
          codeLine: 8,
        })
        break
      }

      // capture values for correct narration before swap
      const beforeParentVal = arr[parent]
      const beforeChildVal = arr[idx]
        ;[arr[parent], arr[idx]] = [arr[idx], arr[parent]]
      localSteps.push({
        description: `Swapped child (${beforeChildVal}) with parent (${beforeParentVal}).`,
        heap: [...arr],
        highlightedIndices: [parent, idx],
        codeLine: 9,
      })
      idx = parent
      localSteps.push({
        description: `Move up to index ${idx}.`,
        heap: [...arr],
        highlightedIndices: [idx],
        codeLine: 10,
      })
    }

    setHeap(arr)
    setSteps(localSteps)
    setCurrentStep(0)
    setInputValue("")
    announce(`Inserted ${val}`)
  }

  // --- Extract root (heapify down) ---
  const handleExtract = () => {
    if (heap.length === 0) return

    let arr = [...heap]
    const root = arr[0]
    const last = arr.pop()!

    if (arr.length === 0) {
      // only one element
      setHeap([])
      setSteps([{ description: `Extracted root ${root}. Heap is now empty.`, heap: [], highlightedIndices: [], codeLine: 12 }])
      setCurrentStep(0)
      return
    }

    arr[0] = last
    const localSteps: HeapStep[] = []

    localSteps.push({
      description: `Replaced root (${root}) with last element (${last}).`,
      heap: [...arr],
      highlightedIndices: [0],
      codeLine: 15,
    })

    let idx = 0
    while (true) {
      const left = 2 * idx + 1
      const right = 2 * idx + 2
      const best = selectSwapChild(idx, arr)

      localSteps.push({
        description: `Check children of index ${idx} → left: ${left}, right: ${right}.`,
        heap: [...arr],
        highlightedIndices: [idx, left, right].filter(i => i < arr.length),
        codeLine: 21,
      })

      if (best === -1 || satisfiesProperty(idx, best, arr)) {
        localSteps.push({
          description: `Heap property satisfied at index ${idx}. Stop heapify-down.`,
          heap: [...arr],
          highlightedIndices: [idx],
          codeLine: 22,
        })
        break
      }

      const beforeParentVal = arr[idx]
      const beforeChildVal = arr[best]
        ;[arr[idx], arr[best]] = [arr[best], arr[idx]]
      localSteps.push({
        description: `Swapped parent (${beforeParentVal}) with child (${beforeChildVal}) at index ${best}.`,
        heap: [...arr],
        highlightedIndices: [idx, best],
        codeLine: 24,
      })
      idx = best
    }

    localSteps.push({
      description: `Extracted root ${root}.`,
      heap: [...arr],
      highlightedIndices: [],
      codeLine: 16,
    })

    setHeap(arr)
    setSteps(localSteps)
    setCurrentStep(0)
    announce(`Extracted root ${root}`)
  }

  // --- Build heap (Floyd) ---
  const buildHeapFromArray = () => {
    const arr = arrayInput
      .split(",")
      .map(s => s.trim())
      .filter(s => s !== "")
      .map(Number)
      .filter(n => !isNaN(n))

    if (arr.length === 0) return

    let a = [...arr]
    const localSteps: HeapStep[] = []

    localSteps.push({
      description: `Starting with array: [${arr.join(", ")}]`,
      heap: [...a],
      highlightedIndices: [],
      codeLine: 29,
    })

    const n = a.length
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      localSteps.push({
        description: `Heapify-down from index ${i} (value ${a[i]}).`,
        heap: [...a],
        highlightedIndices: [i],
        codeLine: 33,
      })

      let idx = i
      while (true) {
        const best = selectSwapChild(idx, a)
        if (best === -1 || satisfiesProperty(idx, best, a)) break
        const beforeParentVal = a[idx]
        const beforeChildVal = a[best]
          ;[a[idx], a[best]] = [a[best], a[idx]]
        localSteps.push({
          description: `Swapped (${beforeParentVal}) with (${beforeChildVal}) during heapify.`,
          heap: [...a],
          highlightedIndices: [idx, best],
          codeLine: 24,
        })
        idx = best
      }
    }

    setHeap(a)
    setSteps(localSteps)
    setCurrentStep(0)
    setArrayInput("")
    announce(`Built heap from array`)
  }

  const stepForward = () => {
    setCurrentStep(prev => {
      const next = Math.min(prev + 1, steps.length - 1)
      if (steps[next]?.description) {
        announce(steps[next].description)
      }
      return next
    })
  }

  const stepBack = () => setCurrentStep(prev => Math.max(prev - 1, 0))
  const reset = () => resetHeap()

  useEffect(() => {
    if (steps[currentStep]) {
      setCurrentCodeLine(steps[currentStep].codeLine)
    }
  }, [currentStep, steps])

  const currentStepData = steps[currentStep] || {
    description: "Ready to perform an operation.",
    heap,
    highlightedIndices: [],
    codeLine: -1,
  }

  const renderHeap = () => {
    if (currentStepData.heap.length === 0) {
      return <div className="text-muted-foreground italic">Heap is empty</div>
    }
    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {currentStepData.heap.map((val, i) => (
          <div
            key={i}
            className={`w-12 h-12 flex items-center justify-center rounded font-mono text-sm xl:text-base border border-black
              ${currentStepData.highlightedIndices.includes(i)
                ? "bg-primary/10 bg-orange-400 font-semibold "
                : "bg-background bg-red-400 shadow-lg font-semibold tracking-wider text-neutral-50"}
            `}
          >
            {val}
          </div>
        ))}
      </div>
    )
  }

  const HeapConcepts = (
    <div className="space-y-6">
      <Card className="bg-card shadow-md border border-border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            What is a Heap?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm md:text-base">
          <p>
            A <strong>Heap</strong> is a specialized tree-based data structure that strictly satisfies the <em>Heap Property</em>. While conceptually a completely filled Binary Tree, it is almost always implemented under the hood as a flat, contiguous Array for extreme memory and cache efficiency.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div className="p-3 bg-muted/30 border rounded-lg">
              <h4 className="font-semibold text-foreground mb-1">Min-Heap</h4>
              <p className="text-xs">The value of any parent node must always be <strong>less than or equal to</strong> the values of its children. The absolute minimum element is invariably at the root.</p>
            </div>
            <div className="p-3 bg-muted/30 border rounded-lg">
              <h4 className="font-semibold text-foreground mb-1">Max-Heap</h4>
              <p className="text-xs">The value of any parent node must always be <strong>greater than or equal to</strong> the values of its children. The absolute maximum element sits securely at the root.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Array Representation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1">
            <p>
              Because a Heap is a <em>Complete Binary Tree</em> (all levels are maximally filled except possibly the last, which is filled left-to-right), there are absolutely no gaps. This allows us to navigate the tree entirely using fast mathematical indices rather than slow memory pointers.
            </p>
            <div className="bg-gray-900 border border-border p-3 rounded-md shadow-sm">
              <h4 className="font-semibold text-gray-300 text-xs uppercase tracking-wider mb-2">0-Indexed Math Formulas:</h4>
              <ul className="list-none space-y-2 font-mono text-xs text-green-400">
                <li><span className="text-gray-400">Parent      =</span> Math.floor((i - 1) / 2)</li>
                <li><span className="text-gray-400">Left Child  =</span> (2 * i) + 1</li>
                <li><span className="text-gray-400">Right Child =</span> (2 * i) + 2</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Core Operations & Complexity
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
            <ul className="list-disc pl-5 space-y-3">
              <li>
                <div>
                  <span className="font-semibold text-foreground">Insert</span> <Badge variant="secondary" className="ml-1 text-[10px] font-mono">O(log n)</Badge>
                </div>
                <p className="text-xs mt-1">Append the new value to the absolute very end of the array, then bubble it upwards (<em>Heapify-Up</em>) by continuously swapping with its parent until the Heap Property is restored.</p>
              </li>
              <li>
                <div>
                  <span className="font-semibold text-foreground">Extract Root</span> <Badge variant="secondary" className="ml-1 text-[10px] font-mono">O(log n)</Badge>
                </div>
                <p className="text-xs mt-1">Remove the root. Take the absolute last element in the array and forcefully place it at the root. Then, bubble it downwards (<em>Heapify-Down</em>) by swapping with its optimal child.</p>
              </li>
              <li>
                <div>
                  <span className="font-semibold text-foreground">Floyd's Build-Heap</span> <Badge variant="secondary" className="ml-1 text-[10px] font-mono text-green-600 dark:text-green-400">O(n)</Badge>
                </div>
                <p className="text-xs mt-1">Astonishingly, converting an entirely random, unsorted array into a perfectly valid heap structure only takes linear <code>O(n)</code> time using Floyd's algorithm, not the naive <code>O(n log n)</code>.</p>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 bg-muted/20 border-l-4 border-amber-500 p-4 rounded-r-lg">
        <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">Crucial Distinction: Heaps vs Sorting</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          A common misconception is that a Heap is a fully sorted array. <strong>It is not.</strong> A Heap only guarantees that parents are greater/less than their children. Siblings have absolutely no guaranteed relationship to each other. If you read a Heap array from index 0 to N-1, the numbers will likely not be sorted. It is only by repeatedly extracting the root that you get elements in a sorted order (which is precisely how <strong>Heap Sort</strong> functions).
        </p>
      </div>

      <div className="mt-6 mb-6">
        <VideoEmbed youtubeId="t0Cq6tVNRBA" title="Data Structures: Heaps (HackerRank)" />
      </div>
    </div>
  );

  return (
    <VisualizerLayout
      title="Heap Visualizer"
      description="Understand min-heaps and max-heaps, heapify operations, and priority queue implementations"
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
        time: "Insert/Extract: O(log n), Build-Heap: O(n), Peek: O(1)",
        space: "O(n)",
      }}
      applications={applications}
      concepts={HeapConcepts}
    >
      <div className="w-full space-y-6">

        <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
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

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Heap Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={heapType === "min" ? "default" : "outline"}
                size="sm"
                onClick={() => setHeapType("min")}
                className="w-full justify-start"
              >
                Min-Heap
              </Button>
              <Button
                variant={heapType === "max" ? "default" : "outline"}
                size="sm"
                onClick={() => setHeapType("max")}
                className="w-full justify-start"
              >
                Max-Heap
              </Button>
            </CardContent>
          </Card>

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
              <Button variant="destructive" onClick={handleExtract} className="gap-1">
                <Zap className="h-4 w-4" /> Extract Root
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reset</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={reset} className="w-full" variant="outline">
                Clear Heap
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-lg">Build Heap from Array</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            <Input
              placeholder="e.g., 4,10,3,5,1"
              value={arrayInput}
              onChange={(e) => setArrayInput(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <Button onClick={buildHeapFromArray} className="gap-1">
              <BarChart3 className="h-4 w-4" /> Build Heap
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Heap ({heapType})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-24 p-4 bg-muted/10 rounded-lg flex items-center justify-center">
              {renderHeap()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pseudocode</CardTitle>
          </CardHeader>
          <div className="font-mono font-medium text-sm bg-muted p-4 rounded-md max-h-96 overflow-y-auto">
            {pseudocode.map((line, index) => (
              <div
                key={index}
                className={`
                  py-1 px-2 rounded
                  ${currentCodeLine === index + 1
                    ? "bg-primary/5 border-l-4 border-purple-500 text-primary-foreground text-purple-500 font-medium"
                    : "text-foreground"}
                `}
              >
                <span className="text-xs text-muted-foreground/70 mr-3">{index + 1}</span>
                {line || "\u00A0"}
              </div>
            ))}
          </div>
        </Card>

        {steps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Current Step</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm p-3 bg-accent/10 bg-neutral-100 rounded-lg border border-accent/20">
                {currentStepData.description}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border-2 border-primary bg-primary/10 bg-orange-200"></div>
                <span>Highlighted Node</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">42</Badge>
                <span>Heap Element</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </VisualizerLayout>
  )
}
