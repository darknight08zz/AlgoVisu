"use client"

import { useState, useEffect } from "react"
import { VisualizerLayout } from "../../../components/visualizer-layout"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { Plus, Minus, Eye, Layers, Lock, Zap, Clock, TrendingDown, Volume2, VolumeX } from "lucide-react"

import { useAudioNarration } from "../../../lib/hooks/useAudioNarration"
import { VideoEmbed } from "../../../components/ui/video-embed"

type StackType = "basic" | "bounded" | "resizable" | "persistent" | "min";

interface StackElement {
  value: string | number;
  id: number;
  isHighlighted?: boolean;
  isPopped?: boolean;
}

const getInitialStack = (type: StackType): StackElement[] => {
  return [
    { value: "Base", id: 0 },
    { value: 10, id: 1 },
    { value: 20, id: 2 },
  ];
};

// Detailed educational content per type
const typeDetails: Record<
  StackType,
  {
    title: string;
    icon: JSX.Element;
    description: string;
    howItWorks: string[];
    useCases: string[];
    complexity: { time: string; space: string };
    advancedInsights?: string[];
    visualizationNotes?: string[];
  }
> = {
  basic: {
    title: "Stack",
    icon: <Layers className="h-5 w-5 text-muted-foreground" />,
    description:
      "A stack follows the Last-In-First-Out (LIFO) principle — the last item pushed is the first one popped. Think of a stack of plates: you add and remove only from the top.",
    howItWorks: [
      "Backed by an array or linked list.",
      "Push adds to the top; pop removes from the top; peek inspects the top.",
      "Stack overflow: pushing onto a full/limited stack. Stack underflow: popping from an empty stack.",
      "Index of top grows/shrinks as elements are added/removed.",
    ],
    useCases: [
      "Function call management (call stack)",
      "Expression evaluation (infix → postfix)",
      "Undo/redo systems",
      "Depth-First Search (DFS) in graphs",
    ],
    complexity: { time: "O(1) for push/pop/peek", space: "O(n)" },
    advancedInsights: [
      "Recursive function calls allocate activation records on the call stack.",
      "Postfix (Reverse Polish) evaluation is naturally implemented with stacks.",
      "Parsing and backtracking leverage stacks for state management.",
    ],
    visualizationNotes: [
      "Green = recently pushed/peeked (highlight).",
      "Red & faded = popped (removal animation).",
      "‘TOP’ indicator points to the current top element.",
    ],
  },
  bounded: {
    title: "Bounded Stack",
    icon: <Lock className="h-5 w-5 text-muted-foreground" />,
    description:
      "A stack with a fixed maximum capacity to prevent unbounded memory growth — useful in constrained environments.",
    howItWorks: [
      "Pre-allocates a fixed-size buffer (e.g., array of size N).",
      "Push is rejected when the stack is full (overflow protection).",
      "Prevents runtime crashes due to uncontrolled growth.",
      "Common in embedded/real-time systems.",
    ],
    useCases: [
      "Microcontrollers and IoT devices",
      "Real-time operating systems (RTOS)",
      "Hardware interrupt stacks",
      "Safety-critical systems (avionics, medical devices)",
    ],
    complexity: { time: "O(1) for all operations", space: "O(1) fixed" },
    advancedInsights: [
      "Bounded stacks can be placed in fast on-chip memory (SRAM) for deterministic latency.",
      "Compile-time checks and guard regions detect overflow conditions.",
    ],
    visualizationNotes: [
      "Push button disables when capacity reached.",
      "Status panel shows size & empty state in real time.",
    ],
  },
  resizable: {
    title: "Resizable Stack",
    icon: <Zap className="h-5 w-5 text-muted-foreground" />,
    description:
      "A dynamic stack that grows automatically (e.g., doubling capacity) — common in high-level languages.",
    howItWorks: [
      "Backed by a dynamic array (JS Array, Python list).",
      "On full: allocate larger buffer, copy elements (rare event).",
      "Amortized O(1) push due to infrequent resizing.",
      "Trade-off between memory overhead & performance.",
    ],
    useCases: [
      "General-purpose applications",
      "Interpreter runtimes & REPLs",
      "Web app state transitions",
      "Interactive tools",
    ],
    complexity: { time: "Amortized O(1) push, O(1) pop/peek", space: "O(n)" },
    advancedInsights: [
      "Doubling strategy yields amortized O(1); shrinking heuristics avoid thrashing.",
      "Allocator behavior (fragmentation, cache locality) impacts performance.",
    ],
    visualizationNotes: [
      "Behaves like basic stack here, but conceptually resizes when needed.",
    ],
  },
  persistent: {
    title: "Persistent Stack",
    icon: <Clock className="h-5 w-5 text-muted-foreground" />,
    description:
      "Immutable stack: each operation returns a new version while preserving previous versions (structural sharing).",
    howItWorks: [
      "No in-place mutation; push/pop create new versions.",
      "Shares most nodes with prior versions → memory efficient over copies.",
      "Enables safe time-travel debugging and undo without side effects.",
      "Popular in functional programming & immutable state management.",
    ],
    useCases: [
      "Redux-like state histories",
      "Time-travel debugging",
      "Purely functional data structures",
      "Versioned states",
    ],
    complexity: { time: "O(1) push/pop with sharing", space: "O(n) across versions (amortized)" },
    advancedInsights: [
      "Linked-node representation allows O(1) persistent pushes via cons cells.",
      "Garbage collection reclaims unreferenced versions automatically.",
    ],
    visualizationNotes: [
      "‘History’ is maintained; popping restores a previous version.",
    ],
  },
  min: {
    title: "Min Stack",
    icon: <TrendingDown className="h-5 w-5 text-muted-foreground" />,
    description:
      "A specialized stack that can return the current minimum in O(1) time via an auxiliary min stack.",
    howItWorks: [
      "Maintain a secondary stack tracking min at each depth.",
      "On push: minStack.push(min(newValue, minStack.top())).",
      "On pop: pop from both main & min stacks.",
      "getMin(): return minStack.top().",
    ],
    useCases: [
      "Real-time stock monitoring (track lowest price)",
      "Leaderboards (min/max tracking variants)",
      "Interview & competitive programming problems",
      "Resource allocation thresholds",
    ],
    complexity: { time: "O(1) push/pop/peek/getMin", space: "O(n) extra for min-stack" },
    advancedInsights: [
      "A max stack is symmetric; both can be combined for min/max in O(1).",
      "Space-optimized trick: store deltas or pairs to compress min history.",
    ],
    visualizationNotes: [
      "Status panel shows current minimum.",
      "Min updates whenever a smaller value is pushed.",
    ],
  },
};

export default function StackVisualizerPage() {
  const [stackType, setStackType] = useState<StackType>("basic");
  const [stack, setStack] = useState<StackElement[]>(() => getInitialStack("basic"));
  const [minStack, setMinStack] = useState<number[]>([10, 10]);
  const [history, setHistory] = useState<StackElement[][]>([getInitialStack("persistent")]);
  const [inputValue, setInputValue] = useState("");
  const [lastOperation, setLastOperation] = useState<string>("");
  const [peekedValue, setPeekedValue] = useState<string | number | null>(null)
  const [demoOverflow, setDemoOverflow] = useState(false)
  const [demoUnderflow, setDemoUnderflow] = useState(false)

  const { isAudioEnabled, toggleAudio, announce, stop } = useAudioNarration()

  useEffect(() => {
    const initStack = getInitialStack(stackType);
    setStack(initStack);
    setInputValue("");
    setLastOperation("");
    setPeekedValue(null);

    if (stackType === "min") {
      setMinStack([10, 10]);
    }
    if (stackType === "persistent") {
      setHistory([initStack]);
    }
    stop()
  }, [stackType, stop]);

  const resetStack = () => {
    const initStack = getInitialStack(stackType);
    setStack(initStack);
    setInputValue("");
    setLastOperation("");
    setPeekedValue(null);

    if (stackType === "min") {
      setMinStack([10, 10]);
    }
    if (stackType === "persistent") {
      setHistory([initStack]);
    }
    stop()
  };

  const effectiveCapacity =
    stackType === "bounded" ? 6 : demoOverflow ? 4 : Number.MAX_SAFE_INTEGER

  const isBoundedFull = stack.length >= effectiveCapacity
  const details = typeDetails[stackType];

  const pushElement = () => {
    if (!inputValue.trim()) return;
    const raw = inputValue.trim();
    const val = !isNaN(Number(raw)) ? Number(raw) : raw;
    const id = Date.now();

    if (isBoundedFull) {
      setLastOperation("❌ Overflow: capacity reached — cannot push")
      announce("Overflow! Capacity reached.")
      return
    }

    if (stackType === "persistent") {
      const newStack = [...stack, { value: val, id }];
      setHistory([...history, newStack]);
      setStack(newStack);
    } else {
      const newStack = [...stack, { value: val, id, isHighlighted: true }];
      setStack(newStack);
      setTimeout(() => {
        setStack(prev => prev.map(el => ({ ...el, isHighlighted: false })));
      }, 500);
    }

    if (stackType === "min") {
      const lastMin = minStack.length > 0 ? minStack[minStack.length - 1] : Infinity;
      const newMin = typeof val === "number" ? Math.min(lastMin, val) : lastMin;
      setMinStack([...minStack, newMin]);
    }

    setLastOperation(`✅ Pushed: ${val}`);
    announce(`Pushed ${val}`)
    setInputValue("");
  };

  const popElement = () => {
    if (stack.length <= 1) {
      if (demoUnderflow) {
        setLastOperation("❌ Underflow: cannot pop from empty stack")
        announce("Underflow! Cannot pop from an empty stack.")
      }
      return;
    }

    const popped = stack[stack.length - 1];

    if (stackType === "persistent") {
      const newHistory = history.slice(0, -1);
      const newStack = newHistory[newHistory.length - 1] || getInitialStack(stackType);
      setHistory(newHistory);
      setStack(newStack);
    } else {
      setStack(prev =>
        prev.map((el, i) => (i === prev.length - 1 ? { ...el, isPopped: true } : el))
      );
      setTimeout(() => setStack(prev => prev.slice(0, - 1)), 300);
    }

    if (stackType === "min") {
      setMinStack(prev => prev.slice(0, -1));
    }

    setLastOperation(`🗑️ Popped: ${popped.value}`);
    announce(`Popped ${popped.value}`)
  };

  const peekElement = () => {
    if (stack.length <= 1) return;
    const top = stack[stack.length - 1];
    setPeekedValue(top.value);
    announce(`Peeked at ${top.value}`)

    if (stackType !== "persistent") {
      setStack(prev =>
        prev.map((el, i) =>
          i === prev.length - 1 ? { ...el, isHighlighted: true } : { ...el, isHighlighted: false }
        )
      );
      setTimeout(() => {
        setStack(prev => prev.map(el => ({ ...el, isHighlighted: false })));
        setPeekedValue(null);
      }, 2000);
    } else {
      setPeekedValue(null);
      setTimeout(() => setPeekedValue(null), 2000);
    }

    setLastOperation(`👁️ Peeked: ${top.value}`);
  };

  const renderStack = () => (
    <div className="flex flex-col-reverse gap-2 min-h-[320px] justify-end items-center">
      {stack.map((el, idx) => (
        <div
          key={el.id}
          className={`
          w-40 h-14 md:w-48 md:h-16 border-2 rounded-xl flex items-center justify-center
          transition-all duration-300 relative
          ${el.isHighlighted
              ? "bg-green-100 border-green-500 text-green-800 scale-105"
              : el.isPopped
                ? "bg-red-100 border-red-500 scale-95 opacity-50"
                : "bg-card border-border"
            }
        `}
          style={{ transform: el.isPopped ? "translateX(120px)" : "translateX(0)" }}
        >
          <span className="font-mono font-bold text-base md:text-lg">{el.value}</span>
          {idx === stack.length - 1 && idx > 0 && (
            <div className="absolute -right-10 top-1/2 -translate-y-1/2">
              <div className="text-xs md:text-sm font-medium text-green-600">← TOP</div>
            </div>
          )}
        </div>
      ))}
    </div>
  )

  const StackConcepts = (
    <div className="space-y-6">
      <Card className="bg-card shadow-md border border-border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            What is a Stack?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm md:text-base">
          <p>
            A <strong>Stack</strong> is a linear, fundamental data structure that rigorously follows the <strong>Last-In-First-Out (LIFO)</strong> principle. This means the most recently added element is strictly the first one to be removed.
          </p>
          <p>
            Think of a physical stack of heavy plates. You can safely place a new plate on the top of the stack (<strong>Push</strong>), and you can only remove the plate that is currently resting on the very top (<strong>Pop</strong>). Attempting to pull a plate from the bottom or middle would cause the stack to collapse. You can also look at the top item without removing it (<strong>Peek</strong>).
          </p>
          <div className="p-4 bg-muted/30 border rounded-lg shadow-sm space-y-2 mt-4">
            <h4 className="font-semibold text-foreground text-sm">Real-World Analogies & Applications:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Web Browsers:</strong> The Back Button pushes your current page to a history stack. Retreating pops it back.</li>
              <li><strong>Text Editors:</strong> The Undo/Redo feature uses paired stacks to track state changes.</li>
              <li><strong>Programming Languages:</strong> The <strong>Call Stack</strong> tracks exactly where a program is in its execution, especially during recursive function calls.</li>
              <li><strong>Compilers:</strong> Syntax parsing, matching parentheses/brackets, and evaluating mathematical expressions (like converting Infix to Postfix notation).</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 mb-6">
        <VideoEmbed youtubeId="wjI1WNcIntg" title="Data Structures: Stacks and Queues (HackerRank)" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {(Object.entries(typeDetails) as [StackType, typeof typeDetails[StackType]][]).map(([key, details]) => (
          <Card key={key} className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                {details.icon}
                {details.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
              <div>
                <p className="font-medium text-foreground mb-3">{details.description}</p>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Mechanics:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {details.howItWorks.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>

                  {details.advancedInsights && (
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-1">Advanced Insights:</h4>
                      <ul className="list-disc pl-5 space-y-1 text-xs">
                        {details.advancedInsights.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-semibold text-foreground mb-2 text-xs uppercase tracking-wider">Complexity Profile</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col bg-muted/50 p-2 rounded">
                    <span className="font-medium text-muted-foreground mb-1">Time</span>
                    <span className="font-mono text-foreground">{details.complexity.time}</span>
                  </div>
                  <div className="flex flex-col bg-muted/50 p-2 rounded">
                    <span className="font-medium text-muted-foreground mb-1">Space</span>
                    <span className="font-mono text-foreground">{details.complexity.space}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 bg-muted/20 border-l-4 border-destructive p-4 rounded-r-lg">
        <h4 className="font-semibold text-destructive mb-2">Critical Edge Cases</h4>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Stack Overflow:</strong> Occurs when attempting to push an element onto a Stack that has reached its maximum memory allowance (or bounded capacity). This is the notorious cause of crashes in infinite recursive loops.
          </p>
          <p>
            <strong>Stack Underflow:</strong> Occurs when attempting to pop an element from an entirely empty Stack. Safe implementations should return a specific error or null value rather than crashing.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <VisualizerLayout
      title="Stack Visualizer"
      description="Explore 5 types of stacks with interactive operations and in-depth explanations"
      difficulty="Beginner"
      onReset={resetStack}
      complexity={details.complexity}
      applications={details.useCases.map(useCase => ({
        title: useCase,
        description: "",
        examples: []
      }))}
      concepts={StackConcepts}
    >
      <div className="w-full space-y-6">

        <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
          <div className="inline-flex rounded-md border p-1 bg-muted w-full md:w-auto max-w-2xl overflow-x-auto whitespace-nowrap scrollbar-hide">
            {(["basic", "bounded", "resizable", "persistent", "min"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setStackType(type)}
                className={`
                  flex-1 py-2 px-4 text-sm font-medium rounded-sm transition-colors
                  ${stackType === type
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                {typeDetails[type].title}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAudio}
            title={isAudioEnabled ? "Disable Narration" : "Enable Narration"}
            className={`flex items-center gap-2 w-full md:w-auto ${isAudioEnabled ? 'bg-green-100/50 text-green-600 border-green-200 hover:bg-green-200/50 hover:text-green-700' : 'text-muted-foreground hover:bg-muted'}`}
          >
            {isAudioEnabled ? <><Volume2 className="h-4 w-4" /> Audio On</> : <><VolumeX className="h-4 w-4" /> Audio Off</>}
          </Button>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <div className="text-sm text-muted-foreground mb-2">
            Top of Stack{" "}
            {peekedValue !== null && (
              <Badge variant="secondary" className="ml-2">
                Peeking: {peekedValue}
              </Badge>
            )}
          </div>
          {renderStack()}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Visualization Key</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-green-100 border border-green-500" />
              <span className="text-muted-foreground">Recent push / peek highlight</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-red-100 border border-red-500 opacity-60" />
              <span className="text-muted-foreground">Popped (removal animation)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-card border border-border" />
              <span className="text-muted-foreground">Regular element</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Edge Case Demo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 text-muted-foreground">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={demoOverflow}
                onChange={(e) => setDemoOverflow(e.target.checked)}
              />
              <span className="text-muted-foreground">
                Demo Overflow ({stackType === "bounded" ? "bounded capacity = 6" : "temp capacity = 4"})
              </span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={demoUnderflow}
                onChange={(e) => setDemoUnderflow(e.target.checked)}
              />
              <span className="text-muted-foreground">Demo Underflow (show error when empty pop)</span>
            </label>
            <div className="text-xs text-muted-foreground">
              {isBoundedFull
                ? "Capacity reached — pushing will trigger overflow."
                : "Capacity available."}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5 text-green-600" />
                Push
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Enter value"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && pushElement()}
              />
              <Button
                onClick={pushElement}
                disabled={!inputValue.trim() || isBoundedFull}
                className="w-full"
                style={{ backgroundColor: "#a8d8b9", color: "#1a5d38" }}
              >
                Push to Stack
              </Button>
              {isBoundedFull && (
                <div className="text-xs text-red-500">Max capacity reached</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Minus className="h-5 w-5 text-red-600" />
                Pop
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={popElement}
                className="w-full"
                variant="destructive"
              >
                Pop from Stack
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-600" />
                Peek & Reset
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  onClick={peekElement}
                  disabled={stack.length <= 1}
                  className="flex-1"
                  variant="outline"
                  style={{ borderColor: "#a8d8b9", color: "#1a5d38" }}
                >
                  Peek at Top
                </Button>
                <Button
                  onClick={resetStack}
                  variant="secondary"
                  className="flex-1"
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stack Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{stack.length - 1}</div>
                <div className="text-sm text-muted-foreground">Size</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {stack.length > 1 ? (stack[stack.length - 1].value as any) : "—"}
                </div>
                <div className="text-sm text-muted-foreground">Top Element</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stack.length <= 1 ? "Yes" : "No"}</div>
                <div className="text-sm text-muted-foreground">Is Empty?</div>
              </div>
              <div>
                <div className={`text-sm font-medium ${lastOperation.startsWith("❌") ? "text-red-600" : "text-green-600"}`}>
                  {lastOperation || "Ready to interact"}
                </div>
                <div className="text-sm text-muted-foreground">Last Action</div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </VisualizerLayout>
  );
}
