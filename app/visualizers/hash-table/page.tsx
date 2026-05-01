"use client"

import { useState, useEffect } from "react"
import { VisualizerLayout } from "../../../components/visualizer-layout"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { Plus, X, Search, Hash, Volume2, VolumeX } from "lucide-react"

import { useAudioNarration } from "../../../lib/hooks/useAudioNarration"
import { VideoEmbed } from "../../../components/ui/video-embed"

type HashBucket = string[]
type HashTable = HashBucket[]

interface Step {
  description: string
  tableState: HashTable
  highlightedIndex: number | null
  codeLine: number
}

const pseudocode = [
  "// Hash Function",
  "function hash(key):",
  "  sum = 0",
  "  for each char in key:",
  "    sum += Unicode(char)",
  "  return sum % tableSize",
  "",
  "// Insert",
  "function insert(key):",
  "  index = hash(key)",
  "  if key not in table[index]:",
  "    table[index].push(key)",
  "",
  "// Search",
  "function search(key):",
  "  index = hash(key)",
  "  return key in table[index]",
  "",
  "// Delete",
  "function delete(key):",
  "  index = hash(key)",
  "  remove key from table[index]",
]

const hashFunction = (key: string, tableSize: number): number => {
  let sum = 0
  for (let i = 0; i < key.length; i++) {
    sum += key.charCodeAt(i)
  }
  return sum % tableSize
}

const getCharSum = (key: string): number => {
  return key.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0)
}

// Deep clone helper
const cloneTable = (table: HashTable): HashTable => {
  return table.map(bucket => [...bucket])
}

export default function HashTableVisualizer() {
  const [tableSize, setTableSize] = useState<number>(10)
  const [key, setKey] = useState("")
  const [steps, setSteps] = useState<Step[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [currentCodeLine, setCurrentCodeLine] = useState<number>(-1)

  const { isAudioEnabled, toggleAudio, announce, stop } = useAudioNarration()

  const initTable = (size: number): HashTable => {
    return Array.from({ length: size }, () => [])
  }

  const [table, setTable] = useState<HashTable>(initTable(10))

  const resetTable = () => {
    const newTable = initTable(tableSize)
    setTable(newTable)
    setSteps([])
    setCurrentStep(0)
    setCurrentCodeLine(-1)
    stop()
  }

  useEffect(() => {
    resetTable()
  }, [tableSize])

  // ---------------------------
  // INSERT OPERATION
  // ---------------------------
  const handleInsert = () => {
    if (!key.trim()) return
    const cleanKey = key.trim()
    const index = hashFunction(cleanKey, tableSize)
    const charSum = getCharSum(cleanKey)

    const newTable = cloneTable(table)
    const stepsSnapshot: Step[] = []

    stepsSnapshot.push({
      description: `Hash("${cleanKey}") = ${index} (sum: ${charSum} % ${tableSize})`,
      tableState: cloneTable(newTable),
      highlightedIndex: index,
      codeLine: 2,
    })

    if (newTable[index].includes(cleanKey)) {
      stepsSnapshot.push({
        description: `Key "${cleanKey}" already exists in bucket ${index}.`,
        tableState: cloneTable(newTable),
        highlightedIndex: index,
        codeLine: 11,
      })
    } else {
      newTable[index].push(cleanKey)
      const updatedTable = cloneTable(newTable)

      stepsSnapshot.push({
        description: `Inserted "${cleanKey}" into bucket ${index}.`,
        tableState: updatedTable,
        highlightedIndex: index,
        codeLine: 12,
      })

      setTable(updatedTable)
    }

    setSteps(stepsSnapshot)
    setCurrentStep(stepsSnapshot.length - 1)
    setKey("")
    announce(`Inserted ${cleanKey} into bucket ${index}`)
  }

  // ---------------------------
  // SEARCH OPERATION
  // ---------------------------
  const handleSearch = () => {
    if (!key.trim()) return
    const cleanKey = key.trim()
    const index = hashFunction(cleanKey, tableSize)
    const charSum = getCharSum(cleanKey)

    const stepsSnapshot: Step[] = []
    stepsSnapshot.push({
      description: `Hash("${cleanKey}") = ${index} (sum: ${charSum} % ${tableSize})`,
      tableState: cloneTable(table),
      highlightedIndex: index,
      codeLine: 15,
    })

    const found = table[index].includes(cleanKey)
    stepsSnapshot.push({
      description: found
        ? `Found "${cleanKey}" in bucket ${index}.`
        : `"${cleanKey}" not found in bucket ${index}.`,
      tableState: cloneTable(table),
      highlightedIndex: index,
      codeLine: 16,
    })

    setSteps(stepsSnapshot)
    setCurrentStep(stepsSnapshot.length - 1)
    setKey("")
    if (found) {
      announce(`Found ${cleanKey} in bucket ${index}`)
    } else {
      announce(`${cleanKey} not found!`)
    }
  }

  // ---------------------------
  // DELETE OPERATION
  // ---------------------------
  const handleDelete = () => {
    if (!key.trim()) return
    const cleanKey = key.trim()
    const index = hashFunction(cleanKey, tableSize)
    const charSum = getCharSum(cleanKey)

    const newTable = cloneTable(table)
    const stepsSnapshot: Step[] = []

    stepsSnapshot.push({
      description: `Hash("${cleanKey}") = ${index} (sum: ${charSum} % ${tableSize})`,
      tableState: cloneTable(newTable),
      highlightedIndex: index,
      codeLine: 19,
    })

    const bucket = newTable[index]
    const itemIndex = bucket.indexOf(cleanKey)
    if (itemIndex !== -1) {
      bucket.splice(itemIndex, 1)
      const updatedTable = cloneTable(newTable)
      stepsSnapshot.push({
        description: `Deleted "${cleanKey}" from bucket ${index}.`,
        tableState: updatedTable,
        highlightedIndex: index,
        codeLine: 21,
      })
      setTable(updatedTable)
    } else {
      stepsSnapshot.push({
        description: `"${cleanKey}" not found in bucket ${index}.`,
        tableState: cloneTable(newTable),
        highlightedIndex: index,
        codeLine: 21,
      })
    }

    setSteps(stepsSnapshot)
    setCurrentStep(stepsSnapshot.length - 1)
    setKey("")
    if (itemIndex !== -1) {
      announce(`Deleted ${cleanKey} from bucket ${index}`)
    } else {
      announce(`${cleanKey} not found to delete!`)
    }
  }

  const stepForward = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1)
  }
  const stepBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }
  const reset = () => {
    resetTable()
  }

  useEffect(() => {
    if (steps[currentStep]) {
      setCurrentCodeLine(steps[currentStep].codeLine)
    }
  }, [currentStep, steps])

  const currentStepData = steps.length > 0
    ? steps[currentStep]
    : {
      description: "Ready to perform an operation.",
      tableState: table,
      highlightedIndex: null,
      codeLine: -1,
    }

  const loadFactor = table.reduce((sum, bucket) => sum + bucket.length, 0) / tableSize

  const applications = [
    {
      title: "Membership Testing",
      description: "Check if an item exists (e.g., username in a system)",
      examples: ["Login validation", "Spam filter", "Unique visitor tracking"],
    },
    {
      title: "Deduplication",
      description: "Store only unique items efficiently",
      examples: ["Email lists", "Tag systems", "Vocabulary sets"],
    },
    {
      title: "Fast Lookups",
      description: "O(1) average time for search, insert, delete",
      examples: ["Caching", "Compiler symbol tables", "Database indexing"],
    },
  ]

  const liveHashCode = key ? hashFunction(key, tableSize) : null
  const liveCharSum = key ? getCharSum(key) : null

  const HashTableConcepts = (
    <div className="space-y-6">
      <Card className="bg-card shadow-md border border-border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            What is a Hash Table?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm md:text-base">
          <p>
            A <strong>Hash Table</strong> (often called a <em>Hash Map</em> or <em>Dictionary</em>) is an incredibly powerful data structure that pairs <strong>Keys</strong> with <strong>Values</strong>. It is renowned for achieving an average time complexity of <strong>O(1)</strong> (constant time) for lookups, insertions, and deletions.
          </p>
          <p>
            Unlike arrays where you find elements via an integer index (0, 1, 2...), Hash Tables allow you to find an element using a custom Key (like a string: <code>"Alice"</code>). It literally <em>hashes</em> (mathematically mixes) the Key to calculate exactly where the Value is stored in memory.
          </p>

          <div className="p-4 bg-muted/30 border rounded-lg shadow-sm space-y-2 mt-4">
            <h4 className="font-semibold text-foreground text-sm">Real-World Analogies & Applications:</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Libraries:</strong> Using a specialized catalog number (Key) to instantly find the exact shelf a book (Value) is on, rather than checking every single book.</li>
              <li><strong>Databases:</strong> Indexing database records for near-instant retrieval based on an ID or Email.</li>
              <li><strong>Caching (Redis/Memcached):</strong> Storing recently used data so subsequent requests don't need to completely recalculate or fetch from disk.</li>
              <li><strong>Compilers:</strong> Symbol tables that track variable names and their associated memory addresses/types.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Core Mechanics
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1">
            <div>
              <h4 className="font-semibold text-foreground mb-1">1. The Hash Function</h4>
              <p>
                Takes a Key (e.g., <code>"Bob"</code>) and converts it into a deterministic integer. For example, summing the ASCII values of 'B', 'o', 'b'. It then uses the modulo operator (<code>% array_size</code>) to ensure the integer perfectly maps to a valid array index (a <strong>Bucket</strong>).
              </p>
            </div>

            <div className="bg-muted/30 p-3 rounded-lg">
              <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-1">2. Collision Resolution</h4>
              <p className="text-xs">
                Sometimes two completely different Keys hash to the exact same Bucket. This is a <strong>Collision</strong>. Modern Hash Tables handle this via:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-1 text-xs">
                <li><strong>Chaining:</strong> (Used in this visualizer) The Bucket holds a Linked List/Array. If multiple items land in the same Bucket, they are simply appended to the chain.</li>
                <li><strong>Open Addressing:</strong> If a Bucket is full, probe (search) forward for the next totally empty Bucket.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary" />
              Complexity & Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-foreground mb-1">Load Factor Strategy</h4>
                <p className="text-xs">
                  Load Factor = <code>Keys / Buckets</code>. A high Load Factor means there are tons of items crammed into too few Buckets, drastically increasing collisions and degrading performance from O(1) closer to O(n). To prevent this, Hash Tables monitor their Load Factor. If it exceeds a threshold (often 0.75), they automatically allocate a completely new, much larger array and <strong>Rehash</strong> every single element into the new array.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="font-semibold text-foreground mb-2 text-xs uppercase tracking-wider">Complexity Profile</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col bg-muted/50 p-2 rounded">
                  <span className="font-medium text-muted-foreground mb-1">Time (Average)</span>
                  <span className="font-mono text-foreground font-semibold text-green-600">O(1)</span>
                </div>
                <div className="flex flex-col bg-muted/50 p-2 rounded">
                  <span className="font-medium text-muted-foreground mb-1">Time (Worst*)</span>
                  <span className="font-mono text-foreground font-semibold text-red-500">O(n)</span>
                </div>
                <div className="flex flex-col bg-muted/50 p-2 rounded col-span-2">
                  <span className="font-medium text-muted-foreground mb-1">Space</span>
                  <span className="font-mono text-foreground">O(n)</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">*Worst case O(n) exclusively happens if a terrible Hash Function forces absolutely every Key into the exact same Bucket.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 mb-6">
        <VideoEmbed youtubeId="2BldESGZKB8" title="Data Structures: Hash Tables (HackerRank)" />
      </div>
    </div>
  );

  return (
    <VisualizerLayout
      title="Hash Table Visualizer (Hash Set)"
      description="Visualize hash tables using chaining with Unicode-based hashing (w3schools style)"
      difficulty="Beginner"
      isPlaying={false}

      complexity={{
        time: "O(1) average, O(n) worst-case",
        space: "O(n + tableSize)",
      }}
      applications={applications}
      concepts={HashTableConcepts}
    >
      <div className="w-full space-y-6">

        {/* Controls */}
        <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
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
              <CardTitle className="text-lg">Table Size</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="number"
                min="5"
                max="20"
                value={tableSize}
                onChange={(e) => setTableSize(Math.max(5, Math.min(20, Number(e.target.value))))}
                className="w-full"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Load Factor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{loadFactor.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total keys / tableSize</div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Key Input</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Enter a key (e.g., Bob, Lisa)"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="font-mono"
              />

              {key && (
                <div className="text-sm p-2 bg-muted/30 rounded flex flex-wrap items-center gap-2">
                  <span>Hash Code:</span>
                  <code className="bg-background px-2 py-1 rounded font-mono flex-1">
                    hash("{key}") = {liveHashCode} (sum: {liveCharSum})
                  </code>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleInsert} className="gap-1" disabled={!key.trim()}>
                  <Plus className="h-4 w-4" /> Insert
                </Button>
                <Button variant="outline" onClick={handleSearch} className="gap-1" disabled={!key.trim()}>
                  <Search className="h-4 w-4" /> Search
                </Button>
                <Button variant="destructive" onClick={handleDelete} className="gap-1" disabled={!key.trim()}>
                  <X className="h-4 w-4" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>Hash Table (Buckets)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-2">
              {currentStepData.tableState.map((bucket, idx) => {
                const isHighlighted = currentStepData.highlightedIndex === idx
                return (
                  <div
                    key={idx}
                    className={`flex items-start p-3 rounded border ${isHighlighted ? "border-primary bg-primary/10" : "border-muted bg-background"
                      }`}
                  >
                    <div className="w-8 text-right font-mono text-sm text-muted-foreground mr-4">
                      {idx}
                    </div>
                    <div className="flex-1 min-h-8">
                      {bucket.length === 0 ? (
                        <span className="text-muted-foreground text-sm">empty</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {bucket.map((item, i) => (
                            <Badge key={i} variant="outline" className="font-mono">
                              "{item}"
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Pseudocode */}
        <Card>
          <CardHeader>
            <CardTitle>Pseudocode (w3schools Style)</CardTitle>
          </CardHeader>
          <div className="font-mono text-sm bg-muted p-4 rounded-md max-h-60 overflow-y-auto">
            {pseudocode.map((line, index) => (
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
                <Badge variant="outline" className="font-mono">"key"</Badge>
                <span>Stored Key</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-primary bg-primary/10"></div>
                <span>Highlighted Bucket</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </VisualizerLayout>
  )
}
