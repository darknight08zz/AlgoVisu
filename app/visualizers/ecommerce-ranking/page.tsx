"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { VisualizerLayout } from "../../../components/visualizer-layout"
import { Button } from "../../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { Slider } from "../../../components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { Shuffle, Play, Square, StepBack, StepForward, Zap, DollarSign, Calendar, Flame, Info, RefreshCcw, Sparkles } from "lucide-react"

// ------------------------------------
// Types
// ------------------------------------
type RankBy = "price" | "date" | "popularity"
type Algorithm = "bubble" | "selection" | "insertion" | "merge" | "quick" | "heap"
type SortOrder = "asc" | "desc"

interface Product {
  id: number // catalog id (can repeat in dataset variants)
  instanceId: string // unique-per-render instance id for React keys
  name: string
  price: number // INR
  date: number // timestamp (ms)
  popularity: number // sales/score
  image?: string
  isComparing?: boolean
  isSwapping?: boolean
  isSorted?: boolean
  isPivot?: boolean
  isSelected?: boolean
}

interface SortStep {
  data: Product[]
  description: string
  comparisons: number
  swaps: number
  comparing?: number[]
  swapping?: number[]
  pivot?: number
}

// ------------------------------------
// Utils
// ------------------------------------
function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return (crypto as any).randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function makeComparator(rankBy: RankBy, order: SortOrder) {
  const dir = order === "asc" ? 1 : -1
  return (a: Product, b: Product) => {
    let va = 0, vb = 0
    if (rankBy === "price") { va = a.price; vb = b.price }
    else if (rankBy === "date") { va = a.date; vb = b.date }
    else { va = a.popularity; vb = b.popularity }

    if (va < vb) return -1 * dir
    if (va > vb) return 1 * dir

    // Deterministic tiebreaks so feeds look stable across runs
    if (a.name < b.name) return -1
    if (a.name > b.name) return 1
    return a.id - b.id
  }
}

const SAMPLE_NAMES = [
  "Nova Drone", "Quartz Watch", "Echo Buds", "Pixel Hoodie", "Aero Kettle", "Terra Mug",
  "Zen Lamp", "Comet Phone Case", "Vega Tripod", "Aurora Keyboard", "Lumen Lightbar", "Nimbus Router",
  "Atlas Backpack", "Orion Speaker", "Mosaic Frame", "Fusion Mixer", "Nimbus Router Pro", "Nova Drone Pro"
]

const EMOJIS = ["🛸", "⌚", "🎧", "👕", "☕", "🍶", "💡", "📱", "📷", "⌨️", "🚦", "📡", "🎒", "🔊", "🖼️", "🥣", "📡", "🛸"]

function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }

function makeDataset(count: number): Product[] {
  const now = Date.now()
  const items: Product[] = []
  for (let i = 0; i < count; i++) {
    const baseIndex = i % SAMPLE_NAMES.length
    items.push({
      id: baseIndex + 1,           // catalog id repeats across variants
      instanceId: uid(),           // unique key per render (fixes duplicate key issues)
      name: SAMPLE_NAMES[baseIndex],
      price: randomInt(499, 49999),
      date: now - randomInt(0, 1000 * 60 * 60 * 24 * 60), // up to ~60 days old
      popularity: randomInt(1, 1000),
      image: EMOJIS[baseIndex] ?? "🛍️",
    })
  }
  return items
}

// ------------------------------------
// Visual mark helpers
// ------------------------------------
function mark(a: Product[], opts?: { comparing?: number[]; swapping?: number[]; pivot?: number }) {
  const out = a.map(p => ({ ...p, isComparing: false, isSwapping: false, isSelected: false, isPivot: false }))
  if (opts?.comparing) opts.comparing.forEach(i => (out[i] && (out[i].isComparing = true)))
  if (opts?.swapping) opts.swapping.forEach(i => (out[i] && (out[i].isSwapping = true)))
  if (typeof opts?.pivot === "number" && out[opts.pivot]) out[opts.pivot].isPivot = true
  return out
}

// ------------------------------------
// Sorting algorithms (return step arrays)
// ------------------------------------
function bubbleSort(arr: Product[], cmp: (a: Product, b: Product) => number): SortStep[] {
  const steps: SortStep[] = []
  const a = arr.map(p => ({ ...p }))
  let comparisons = 0, swaps = 0

  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < a.length - i - 1; j++) {
      comparisons++
      steps.push({ data: mark(a, { comparing: [j, j + 1] }), description: `Compare #${j} and #${j + 1}`, comparisons, swaps, comparing: [j, j + 1] })
      if (cmp(a[j], a[j + 1]) > 0) {
        ;[a[j], a[j + 1]] = [a[j + 1], a[j]]
        swaps++
        steps.push({ data: mark(a, { swapping: [j, j + 1] }), description: `Swap positions ${j} and ${j + 1}`, comparisons, swaps, swapping: [j, j + 1] })
      }
    }
    a[a.length - 1 - i].isSorted = true
    steps.push({ data: mark(a), description: `Position ${a.length - 1 - i} fixed`, comparisons, swaps })
  }
  if (a.length) a[0].isSorted = true
  steps.push({ data: mark(a), description: "Ranking complete!", comparisons, swaps })
  return steps
}

function selectionSort(arr: Product[], cmp: (a: Product, b: Product) => number): SortStep[] {
  const steps: SortStep[] = []
  const a = arr.map(p => ({ ...p }))
  let comparisons = 0, swaps = 0

  for (let i = 0; i < a.length - 1; i++) {
    let best = i
    for (let j = i + 1; j < a.length; j++) {
      comparisons++
      steps.push({ data: mark(a, { comparing: [best, j] }), description: `Find best among ${i}..${a.length - 1}`, comparisons, swaps, comparing: [best, j] })
      if (cmp(a[j], a[best]) < 0) best = j
    }
    if (best !== i) {
      ;[a[i], a[best]] = [a[best], a[i]]
      swaps++
      steps.push({ data: mark(a, { swapping: [i, best] }), description: `Place best at ${i}`, comparisons, swaps, swapping: [i, best] })
    }
    a[i].isSorted = true
  }
  if (a.length) a[a.length - 1].isSorted = true
  steps.push({ data: mark(a), description: "Ranking complete!", comparisons, swaps })
  return steps
}

function insertionSort(arr: Product[], cmp: (a: Product, b: Product) => number): SortStep[] {
  const steps: SortStep[] = []
  const a = arr.map(p => ({ ...p }))
  let comparisons = 0, swaps = 0

  if (!a.length) return [{ data: [], description: "Empty", comparisons, swaps }]

  a[0].isSorted = true
  steps.push({ data: mark(a), description: "Seed sorted prefix with 1 item", comparisons, swaps })

  for (let i = 1; i < a.length; i++) {
    const key = a[i]
    let j = i - 1
    while (j >= 0) {
      comparisons++
      if (cmp(a[j], key) > 0) {
        a[j + 1] = a[j]
        swaps++
        steps.push({ data: mark(a, { swapping: [j + 1, j] }), description: `Shift right`, comparisons, swaps, swapping: [j + 1, j] })
        j--
      } else {
        break
      }
    }
    a[j + 1] = key
    for (let k = 0; k <= i; k++) a[k].isSorted = true
    steps.push({ data: mark(a), description: `Prefix 0..${i} sorted`, comparisons, swaps })
  }
  steps.push({ data: mark(a), description: "Ranking complete!", comparisons, swaps })
  return steps
}

function mergeSort(arr: Product[], cmp: (a: Product, b: Product) => number): SortStep[] {
  const steps: SortStep[] = []
  const a = arr.map(p => ({ ...p }))
  let comparisons = 0

  function mergeSortRec(l: number, r: number) {
    if (l >= r) return
    const m = Math.floor((l + r) / 2)
    mergeSortRec(l, m)
    mergeSortRec(m + 1, r)
    const left = a.slice(l, m + 1)
    const right = a.slice(m + 1, r + 1)
    let i = 0, j = 0, k = l
    while (i < left.length && j < right.length) {
      comparisons++
      if (cmp(left[i], right[j]) <= 0) a[k++] = left[i++]
      else a[k++] = right[j++]
      steps.push({ data: mark(a), description: `Merge ${l}-${m} and ${m + 1}-${r}`, comparisons, swaps: 0 })
    }
    while (i < left.length) a[k++] = left[i++]
    while (j < right.length) a[k++] = right[j++]
    steps.push({ data: mark(a), description: `Merged block ${l}-${r}`, comparisons, swaps: 0 })
  }

  if (a.length) {
    mergeSortRec(0, a.length - 1)
    a.forEach(p => (p.isSorted = true))
  }
  steps.push({ data: mark(a), description: "Ranking complete!", comparisons, swaps: 0 })
  return steps
}

function quickSort(arr: Product[], cmp: (a: Product, b: Product) => number): SortStep[] {
  const steps: SortStep[] = []
  const a = arr.map(p => ({ ...p }))
  let comparisons = 0, swaps = 0

  function partition(l: number, h: number) {
    const pivot = a[h]
    let i = l - 1
    for (let j = l; j < h; j++) {
      comparisons++
      if (cmp(a[j], pivot) <= 0) {
        i++
        if (i !== j) {
          ;[a[i], a[j]] = [a[j], a[i]]
          swaps++
          steps.push({ data: mark(a, { swapping: [i, j], pivot: h }), description: `Swap ≤ pivot`, comparisons, swaps, swapping: [i, j], pivot: h })
        } else {
          steps.push({ data: mark(a, { comparing: [j], pivot: h }), description: `Advance boundary`, comparisons, swaps, comparing: [j], pivot: h })
        }
      } else {
        steps.push({ data: mark(a, { comparing: [j], pivot: h }), description: `> pivot`, comparisons, swaps, comparing: [j], pivot: h })
      }
    }
    ;[a[i + 1], a[h]] = [a[h], a[i + 1]]
    swaps++
    steps.push({ data: mark(a, { swapping: [i + 1, h] }), description: `Place pivot`, comparisons, swaps, swapping: [i + 1, h] })
    return i + 1
  }

  function qs(l: number, h: number) {
    if (l < h) {
      const p = partition(l, h)
      a[p].isSorted = true
      steps.push({ data: mark(a), description: `Pivot fixed at ${p}`, comparisons, swaps })
      qs(l, p - 1)
      qs(p + 1, h)
    }
  }

  if (a.length) qs(0, a.length - 1)
  a.forEach(p => (p.isSorted = true))
  steps.push({ data: mark(a), description: "Ranking complete!", comparisons, swaps })
  return steps
}

function heapSort(arr: Product[], cmp: (a: Product, b: Product) => number): SortStep[] {
  const steps: SortStep[] = []
  const a = arr.map(p => ({ ...p }))
  let comparisons = 0, swaps = 0

  const greater = (i: number, j: number) => cmp(a[i], a[j]) > 0

  function heapify(n: number, i: number) {
    let largest = i
    const l = 2 * i + 1
    const r = 2 * i + 2
    if (l < n) { comparisons++; if (greater(l, largest)) largest = l }
    if (r < n) { comparisons++; if (greater(r, largest)) largest = r }
    if (largest !== i) {
      ;[a[i], a[largest]] = [a[largest], a[i]]
      swaps++
      steps.push({ data: mark(a, { swapping: [i, largest] }), description: `Heapify swap`, comparisons, swaps, swapping: [i, largest] })
      heapify(n, largest)
    }
  }

  const n = a.length
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(n, i)
  steps.push({ data: mark(a), description: `Built heap`, comparisons, swaps })

  for (let i = n - 1; i > 0; i--) {
    ;[a[0], a[i]] = [a[i], a[0]]
    swaps++
    a[i].isSorted = true
    steps.push({ data: mark(a, { swapping: [0, i] }), description: `Extract max to ${i}`, comparisons, swaps, swapping: [0, i] })
    heapify(i, 0)
  }
  if (a.length) a[0].isSorted = true
  steps.push({ data: mark(a), description: "Ranking complete!", comparisons, swaps })
  return steps
}

// ------------------------------------
// UI Subcomponents
// ------------------------------------
function ProductCard({ p, rankBy }: { p: Product; rankBy: RankBy }) {
  const primary =
    rankBy === "price" ? `₹${p.price.toLocaleString("en-IN")}` :
      rankBy === "date" ? new Date(p.date).toLocaleDateString() :
        `${p.popularity}`

  const label =
    rankBy === "price" ? "Price" :
      rankBy === "date" ? "Date" :
        "Popularity"

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileHover={{ y: -4 }}
      className={`
        relative w-full rounded-2xl p-4 border bg-background/80 backdrop-blur
        shadow-sm hover:shadow-md transition-shadow
        ${p.isSwapping ? "ring-2 ring-red-400" : p.isComparing ? "ring-2 ring-yellow-400" : p.isPivot ? "ring-2 ring-purple-400" : p.isSorted ? "ring-2 ring-emerald-400" : "ring-0"}
      `}
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{p.image ?? "🛍️"}</div>
        <div className="flex-1">
          <div className="font-semibold">{p.name}</div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="font-mono"><DollarSign className="h-3 w-3 mr-1 inline" />₹{p.price.toLocaleString("en-IN")}</Badge>
            <Badge variant="outline"><Calendar className="h-3 w-3 mr-1 inline" />{new Date(p.date).toLocaleDateString()}</Badge>
            <Badge variant="outline"><Flame className="h-3 w-3 mr-1 inline" />{p.popularity}</Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-base font-semibold">{primary}</div>
        </div>
      </div>

      <div className="mt-3 h-2 w-full bg-muted/50 rounded-full overflow-hidden">
        <motion.div
          layout
          className="h-full rounded-full"
          style={{
            width:
              rankBy === "price" ? `${Math.min(100, (p.price / 50000) * 100)}%` :
                rankBy === "date" ? `${Math.min(100, ((Date.now() - p.date) / (1000 * 60 * 60 * 24 * 60)) * 100)}%` :
                  `${Math.min(100, (p.popularity / 1000) * 100)}%`,
            background:
              p.isSwapping ? "linear-gradient(90deg, #ef4444, #f97316)" :
                p.isComparing ? "linear-gradient(90deg, #f59e0b, #10b981)" :
                  p.isPivot ? "linear-gradient(90deg, #a855f7, #6366f1)" :
                    p.isSorted ? "linear-gradient(90deg, #10b981, #22c55e)" :
                      "linear-gradient(90deg, var(--accent), var(--accent))",
            opacity: 0.9
          }}
        />
      </div>
    </motion.div>
  )
}

// ------------------------------------
// Main Component
// ------------------------------------
export default function EcommerceRankingPage() {
  const [items, setItems] = useState<Product[]>([])
  const [original, setOriginal] = useState<Product[]>([])
  const [rankBy, setRankBy] = useState<RankBy>("price")
  const [order, setOrder] = useState<SortOrder>("asc")
  const [algorithm, setAlgorithm] = useState<Algorithm>("quick")
  const [arraySize, setArraySize] = useState([12])
  const [speed, setSpeed] = useState([600])
  const [steps, setSteps] = useState<SortStep[]>([])
  const [stepIndex, setStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [comparisons, setComparisons] = useState(0)
  const [swaps, setSwaps] = useState(0)
  const playTimer = useRef<number | undefined>(undefined)

  // Auto-recommend order when switching rank signal
  useEffect(() => {
    const recommended: SortOrder = rankBy === "price" ? "asc" : "desc"
    setOrder(recommended)
    // Stop any running animation to avoid stale steps
    setSteps([])
    setStepIndex(0)
    setIsPlaying(false)
  }, [rankBy])

  const comparator = useMemo(() => makeComparator(rankBy, order), [rankBy, order])

  const generate = useCallback(() => {
    const data = makeDataset(arraySize[0])
    setItems(data)
    setOriginal(data.map(p => ({ ...p })))
    setSteps([])
    setStepIndex(0)
    setComparisons(0)
    setSwaps(0)
    setIsPlaying(false)
  }, [arraySize])

  useEffect(() => { generate() }, [generate])

  // Compute steps (pure function by algorithm/comparator)
  const computeSteps = useCallback((data: Product[]) => {
    switch (algorithm) {
      case "bubble": return bubbleSort(data, comparator)
      case "selection": return selectionSort(data, comparator)
      case "insertion": return insertionSort(data, comparator)
      case "merge": return mergeSort(data, comparator)
      case "quick": return quickSort(data, comparator)
      case "heap": return heapSort(data, comparator)
    }
  }, [algorithm, comparator])

  // Playback controls
  const start = () => {
    const s = computeSteps(original)
    setSteps(s)
    setStepIndex(0)
    if (s.length) {
      setComparisons(s[s.length - 1].comparisons)
      setSwaps(s[s.length - 1].swaps)
      setItems(s[0].data)
      setIsPlaying(true)
    }
  }

  const stepForward = () => {
    if (steps.length === 0) return
    setStepIndex(prev => {
      const next = Math.min(prev + 1, steps.length - 1)
      setItems(steps[next].data)
      return next
    })
  }

  const stepBack = () => {
    if (steps.length === 0) return
    setStepIndex(prev => {
      const next = Math.max(prev - 1, 0)
      setItems(steps[next].data)
      return next
    })
  }

  const pause = () => {
    setIsPlaying(false)
    if (playTimer.current) {
      window.clearTimeout(playTimer.current)
      playTimer.current = undefined
    }
  }

  const reset = () => {
    pause()
    setItems(original.map(p => ({ ...p })))
    setSteps([])
    setStepIndex(0)
    setComparisons(0)
    setSwaps(0)
  }

  // Auto-advance while playing
  useEffect(() => {
    if (!isPlaying) return
    if (stepIndex >= steps.length - 1) { setIsPlaying(false); return }
    const t = window.setTimeout(() => { stepForward() }, Math.max(150, 1100 - speed[0]))
    playTimer.current = t
    return () => window.clearTimeout(t)
  }, [isPlaying, stepIndex, steps.length, speed])

  // Regenerate on size change
  useEffect(() => {
    const t = setTimeout(() => generate(), 0)
    return () => clearTimeout(t)
  }, [arraySize, generate])

  // Clearing steps if algo/order changes mid-run
  useEffect(() => {
    if (steps.length) {
      setIsPlaying(false)
      setSteps([])
      setStepIndex(0)
    }
  }, [algorithm, order])

  const EcommerceConcepts = (
    <div className="space-y-8">
      <Card className="bg-card shadow-md border border-border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            E-Commerce Ranking Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm md:text-base">
          <p>
            This visualizer mirrors a simplified <strong>ranking pipeline</strong> like the one behind most e-commerce homepages and category pages. Ranking dictates the exact order in which products are shown to users.
          </p>
          <p>
            Why this matters: Ranking directly affects <em>discoverability, revenue, and user experience</em>. Product teams constantly iterate on ranking signals, tie-breaking logic, and constraints (e.g., “promote new arrivals” or "boost high-margin items").
          </p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-foreground">
              Ranking Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
            <p className="text-xs">A "signal" is a data point used to evaluate and order products. Common examples include:</p>

            <div className="space-y-3 mt-2">
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Common Signals</h4>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li><strong>Price:</strong> Sorting from low to high or high to low.</li>
                  <li><strong>Newest:</strong> Prioritizing recently added inventory.</li>
                  <li><strong>Popularity:</strong> Often a composite score based on sales, views, or ratings.</li>
                </ul>
              </div>
              <div className="bg-muted/30 p-2 rounded">
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Deterministic Ties</h4>
                <p className="text-xs">When two products have the same signal score, a secondary signal (like name or ID) is used as a tie-breaker. This ensures the feed layout is physically stable across page reloads.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-foreground">
              Visualizer Mechanics
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
            <div className="space-y-3 mt-2 text-xs">
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Algorithms:</strong> Select from underlying sorting algorithms (Quick, Merge, Heap, etc.) to see how the system achieves the final ranking state.</li>
                <li><strong>Synthetic Catalog:</strong> Products are generated with random prices, ages (up to ~60 days), and popularity scores.</li>
                <li><strong>Transparency:</strong> The UI tracks comparisons and swaps in real-time, showing which products are currently being evaluated against each other.</li>
              </ul>
            </div>

            <div className="bg-muted/30 p-2 rounded mt-auto flex items-center justify-between">
              <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Complexity / Output:</span>
              <Badge variant="outline" className="font-mono bg-muted/50 border-primary/20">O(N log N)</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  return (
    <VisualizerLayout
      title="E-commerce Ranking Visualizer"
      description="A hands-on simulation of how product feeds get ranked in online stores. Choose a signal (Price, Newest, or Popular), generate a dataset, and watch the feed re-order—step by step."
      difficulty="Intermediate"
      currentStep={stepIndex}
      totalSteps={steps.length}
      complexity={{ time: "varies", space: "varies" }}
      concepts={EcommerceConcepts}
    >
      <div className="space-y-6">

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ranking settings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <div className="text-sm font-medium flex items-center gap-2"><DollarSign className="h-4 w-4" /> Rank by</div>
              <Select value={rankBy} onValueChange={(v: RankBy) => setRankBy(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="date">Newest</SelectItem>
                  <SelectItem value="popularity">Popularity</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">Recommended: Price → Asc, Newest/Popularity → Desc</div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium"><Sparkles className="h-4 w-4 inline mr-1" /> Algorithm</div>
              <Select value={algorithm} onValueChange={(v: Algorithm) => setAlgorithm(v)}>
                <SelectTrigger><SelectValue placeholder="Choose a sort" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick">Quick</SelectItem>
                  <SelectItem value="merge">Merge</SelectItem>
                  <SelectItem value="heap">Heap</SelectItem>
                  <SelectItem value="insertion">Insertion</SelectItem>
                  <SelectItem value="selection">Selection</SelectItem>
                  <SelectItem value="bubble">Bubble</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">Pick any — the visuals are the point.</div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium"><Calendar className="h-4 w-4 inline mr-1" /> Order</div>
              <Select value={order} onValueChange={(v: SortOrder) => setOrder(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium flex items-center gap-2"><Zap className="h-4 w-4" /> Speed</div>
              <Slider value={speed} onValueChange={setSpeed} min={150} max={1100} step={50} />
              <div className="text-xs text-center text-muted-foreground">
                {speed[0] < 400 ? "Fast" : speed[0] < 800 ? "Medium" : "Slow"}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Items</div>
              <Slider value={arraySize} onValueChange={setArraySize} min={6} max={24} step={1} />
              <div className="text-xs text-center text-muted-foreground">{arraySize[0]} products</div>
              <div className="flex gap-2">
                <Button onClick={generate} className="w-full" variant="secondary"><Shuffle className="h-4 w-4 mr-2" /> New dataset</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => { if (steps.length === 0) start(); else setIsPlaying(true) }}>
            <Play className="h-4 w-4 mr-2" /> Play
          </Button>
          <Button onClick={pause} variant="outline">
            <Square className="h-4 w-4 mr-2" /> Pause
          </Button>
          <Button onClick={stepBack} variant="outline">
            <StepBack className="h-4 w-4 mr-2" /> Step Back
          </Button>
          <Button onClick={stepForward} variant="outline">
            <StepForward className="h-4 w-4 mr-2" /> Step
          </Button>
          <Button onClick={reset} variant="ghost">
            <RefreshCcw className="h-4 w-4 mr-2" /> Reset
          </Button>

          <div className="ml-auto text-sm text-muted-foreground flex gap-4">
            <span>Comparisons: <span className="font-mono">{steps.length ? steps[steps.length - 1].comparisons : comparisons}</span></span>
            <span>Swaps: <span className="font-mono">{steps.length ? steps[steps.length - 1].swaps : swaps}</span></span>
            <span>Step: <span className="font-mono">{steps.length ? `${stepIndex + 1}/${steps.length}` : "—"}</span></span>
          </div>
        </div>

        {/* Product list */}
        <LayoutGroup>
          <div className="
            grid gap-4
            sm:grid-cols-2 lg:grid-cols-3
            min-h-[420px] p-4 rounded-lg bg-muted/10
          ">
            <AnimatePresence mode="popLayout">
              {items.map((p, idx) => (
                // Use instanceId + index to avoid duplicate keys when an algorithm shifts items
                <ProductCard key={`${p.instanceId}-${idx}`} p={p} rankBy={rankBy} />
              ))}
            </AnimatePresence>
          </div>
        </LayoutGroup>

        {/* Current step */}
        {steps.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Current step</CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm p-3 bg-accent/10 rounded-lg border border-accent/20">
                {steps[stepIndex]?.description || "Ready."}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Legend</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-yellow-400" /> Comparing
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-red-400" /> Swapping
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-purple-400" /> Pivot
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" /> Fixed / Sorted
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </VisualizerLayout>
  )
}
