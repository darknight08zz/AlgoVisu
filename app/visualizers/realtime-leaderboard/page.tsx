"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { VisualizerLayout } from "../../../components/visualizer-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Badge } from "../../../components/ui/badge"
import { Plus, RefreshCcw, Search, Trash2, Zap, Users } from "lucide-react"

// -----------------------------
// Types & Keys
// -----------------------------
type PlayerID = string

interface Player {
  id: PlayerID
  name: string
  score: number
}

interface Key {
  score: number
  name: string
  id: PlayerID
}

interface AVLNode {
  key: Key
  left: AVLNode | null
  right: AVLNode | null
  height: number
  size: number
  id: string
}

const cmpKey = (a: Key, b: Key): number => {
  // Descending by score
  if (a.score !== b.score) return b.score - a.score
  // Asc by name
  if (a.name !== b.name) return a.name < b.name ? -1 : 1
  // Asc by id
  if (a.id === b.id) return 0
  return a.id < b.id ? -1 : 1
}

let NODE_ID = 0
const makeNode = (key: Key): AVLNode => ({
  key,
  left: null,
  right: null,
  height: 1,
  size: 1,
  id: `node-${++NODE_ID}`,
})

const h = (n: AVLNode | null) => (n ? n.height : 0)
const sz = (n: AVLNode | null) => (n ? n.size : 0)
const update = (n: AVLNode) => {
  n.height = Math.max(h(n.left), h(n.right)) + 1
  n.size = sz(n.left) + sz(n.right) + 1
}
const balanceFactor = (n: AVLNode | null) => (n ? h(n.left) - h(n.right) : 0)

const rotateRight = (y: AVLNode): AVLNode => {
  const x = y.left!
  const T2 = x.right
  x.right = y
  y.left = T2
  update(y)
  update(x)
  return x
}
const rotateLeft = (x: AVLNode): AVLNode => {
  const y = x.right!
  const T2 = y.left
  y.left = x
  x.right = T2
  update(x)
  update(y)
  return y
}

const rebalance = (node: AVLNode): AVLNode => {
  update(node)
  const bf = balanceFactor(node)
  if (bf > 1) {
    if (balanceFactor(node.left) < 0) node.left = rotateLeft(node.left!)
    return rotateRight(node)
  }
  if (bf < -1) {
    if (balanceFactor(node.right) > 0) node.right = rotateRight(node.right!)
    return rotateLeft(node)
  }
  return node
}

// Insert
const insertNode = (root: AVLNode | null, key: Key): AVLNode => {
  if (!root) return makeNode(key)
  const c = cmpKey(key, root.key)
  if (c < 0) root.left = insertNode(root.left, key)
  else if (c > 0) root.right = insertNode(root.right, key)
  else {
    root.key = key
    return root
  }
  return rebalance(root)
}

// Min node
const minNode = (n: AVLNode): AVLNode => (n.left ? minNode(n.left) : n)

// Delete
const deleteNode = (root: AVLNode | null, key: Key): AVLNode | null => {
  if (!root) return null
  const c = cmpKey(key, root.key)
  if (c < 0) root.left = deleteNode(root.left, key)
  else if (c > 0) root.right = deleteNode(root.right, key)
  else {
    if (!root.left || !root.right) {
      return root.left || root.right
    } else {
      const succ = minNode(root.right)
      root.key = succ.key
      root.right = deleteNode(root.right, succ.key)
    }
  }
  return rebalance(root)
}

// 1-based rank
const getRankOfKey = (root: AVLNode | null, key: Key): number | null => {
  let rank = 1
  let curr = root
  while (curr) {
    const c = cmpKey(key, curr.key)
    if (c < 0) {
      curr = curr.left
    } else if (c > 0) {
      rank += sz(curr.left) + 1
      curr = curr.right
    } else {
      rank += sz(curr.left)
      return rank
    }
  }
  return null
}

// Top N (best-first)
const collectTopN = (root: AVLNode | null, n: number, acc: Key[] = []): Key[] => {
  if (!root || acc.length >= n) return acc
  collectTopN(root.left, n, acc)
  if (acc.length < n) acc.push(root.key)
  if (acc.length < n) collectTopN(root.right, n, acc)
  return acc
}

const uid = () => Math.random().toString(36).slice(2, 9)

// -----------------------------
// Component
// -----------------------------
export default function LeaderboardPage() {
  const [root, setRoot] = useState<AVLNode | null>(null)
  const [players, setPlayers] = useState<Map<PlayerID, Player>>(new Map())

  // form inputs
  const [name, setName] = useState("")
  const [score, setScore] = useState<number | "">("")
  const [topCount, setTopCount] = useState<number>(10)
  const [queryName, setQueryName] = useState("")

  const containerRef = useRef<HTMLDivElement | null>(null)

  // Core ops
  const keyOf = (p: Player): Key => ({ score: p.score, name: p.name, id: p.id })

  const upsertPlayer = (name: string, score: number) => {
    if (!name.trim()) return
    const byName = [...players.values()].find((p) => p.name.toLowerCase() === name.toLowerCase())
    let nextRoot = root

    if (byName) {
      nextRoot = deleteNode(nextRoot, keyOf(byName))
      const updated: Player = { ...byName, score }
      nextRoot = insertNode(nextRoot, keyOf(updated))
      setPlayers((prev) => {
        const copy = new Map(prev)
        copy.set(updated.id, updated)
        return copy
      })
    } else {
      const p: Player = { id: uid(), name: name.trim(), score }
      nextRoot = insertNode(nextRoot, keyOf(p))
      setPlayers((prev) => {
        const copy = new Map(prev)
        copy.set(p.id, p)
        return copy
      })
    }
    setRoot(nextRoot)
  }

  const removeByName = (name: string) => {
    const byName = [...players.values()].find((p) => p.name.toLowerCase() === name.toLowerCase())
    if (!byName) return
    const next = deleteNode(root, keyOf(byName))
    setRoot(next)
    setPlayers((prev) => {
      const copy = new Map(prev)
      copy.delete(byName.id)
      return copy
    })
  }

  const rankOfName = (name: string): number | null => {
    const byName = [...players.values()].find((p) => p.name.toLowerCase() === name.toLowerCase())
    if (!byName) return null
    return getRankOfKey(root, keyOf(byName))
  }

  const topN = (n: number): Player[] => {
    const keys = collectTopN(root, n)
    const out: Player[] = []
    for (const k of keys) {
      const p = [...players.values()].find((x) => x.id === k.id)
      if (p) out.push(p)
    }
    return out
  }

  // Demo
  const demoNames = useMemo(
    () => ["Ava", "Noah", "Liam", "Mia", "Ishan", "Zara", "Arjun", "Kiara", "Vivaan", "Anaya", "Ivy", "Leo"],
    []
  )

  const seedDemo = () => {
    let nextRoot: AVLNode | null = null
    const next = new Map<PlayerID, Player>()
    for (let i = 0; i < demoNames.length; i++) {
      const p: Player = { id: uid(), name: demoNames[i], score: Math.floor(Math.random() * 2000) }
      nextRoot = insertNode(nextRoot, keyOf(p))
      next.set(p.id, p)
    }
    setPlayers(next)
    setRoot(nextRoot)
  }

  const tickRandomUpdate = () => {
    if (players.size === 0) return
    const list = [...players.values()]
    const target = list[Math.floor(Math.random() * list.length)]
    const delta = Math.random() < 0.6 ? Math.ceil(Math.random() * 50) : -Math.ceil(Math.random() * 30)
    const newScore = Math.max(0, target.score + delta)
    let nextRoot = deleteNode(root, keyOf(target))
    const updated: Player = { ...target, score: newScore }
    nextRoot = insertNode(nextRoot, keyOf(updated))
    const next = new Map(players)
    next.set(updated.id, updated)
    setPlayers(next)
    setRoot(nextRoot)
  }

  // Render helpers
  const renderNode = (node: AVLNode | null): JSX.Element | null => {
    if (!node) return null
    return (
      <motion.div
        key={`${node.id}-${node.key.id}-${node.key.score}`}
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <motion.div
          layout
          className="min-w-40 px-3 py-2 rounded-2xl border-2 bg-background relative shadow-sm"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold truncate max-w-[140px]">{node.key.name}</div>
            <Badge variant="secondary" className="text-xs">{node.key.score}</Badge>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">h:{node.height} • sz:{node.size}</div>
        </motion.div>

        <div className="flex gap-8 mt-3">
          <AnimatePresence mode="popLayout">
            {node.left && <motion.div key={`L-${node.left.id}`} layout>{renderNode(node.left)}</motion.div>}
          </AnimatePresence>
          <AnimatePresence mode="popLayout">
            {node.right && <motion.div key={`R-${node.right.id}`} layout>{renderNode(node.right)}</motion.div>}
          </AnimatePresence>
        </div>
      </motion.div>
    )
  }

  const topList = topN(topCount)

  const LeaderboardConcepts = (
    <div className="space-y-8">
      <Card className="bg-card shadow-md border border-border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            Scaling Real-time Leaderboards
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm md:text-base">
          <p>
            In multiplayer games or live events, the leaderboard changes constantly. Using a simple sorted array is too slow because inserting a new score or updating an existing one requires shifting elements, an <code>O(n)</code> operation. When you have millions of players, this causes lag.
          </p>
          <p>
            To handle massive scale and real-time updates, systems often rely on balanced Binary Search Trees. This visualizer demonstrates using an <strong>AVL Tree</strong> to maintain a sorted, always-balanced dataset.
          </p>

          <div className="p-4 bg-muted/30 border rounded-lg shadow-sm space-y-2 mt-4">
            <h4 className="font-semibold text-foreground text-sm">Key Concepts:</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Nodes:</strong> Each player is a node containing their Score, Name, and an internal ID.</li>
              <li><strong>Balance Factor:</strong> The height difference between a node's left and right subtrees (must be -1, 0, or 1 in an AVL tree).</li>
              <li><strong>Subtree Size:</strong> Each node tracks how many total nodes exist beneath it. This is the secret to blazing-fast rank queries.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              Why an AVL Tree?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
            <div className="space-y-3 mt-2">
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Ordered Inserts</h4>
                <p className="text-xs">Players are instantly slotted into the correct position based on their score (descending) without shifting other elements.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Self-Balancing</h4>
                <p className="text-xs">Every add, update, or delete operation triggers an automatic rotation if the tree becomes unbalanced. This guarantees the tree never degrades into a slow, linear chain like a linked list.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Stable Tie-Breakers</h4>
                <p className="text-xs">If two players have the exact same score, the tree resolves the tie alphabetically by name, ensuring a consistent determinative order.</p>
              </div>
            </div>

            <div className="bg-muted/30 p-2 rounded flex items-center justify-between mt-auto">
              <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Write Complexity:</span>
              <Badge variant="outline" className="font-mono bg-muted/50 border-primary/20">O(log n)</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              Fast Queries
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
            <div className="space-y-3 mt-2">
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Rank Queries</h4>
                <p className="text-xs">By augmenting nodes to store the size of their subtrees (<code>sz</code>), we can calculate any player's exact 1-based rank by traversing down the tree and summing the sizes of the left subtrees we bypass.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Top-N List</h4>
                <p className="text-xs">To show the top players, we perform a left-biased in-order traversal, collecting the first N nodes. This is incredibly fast for generating the "first page" of the leaderboard without sorting all data.</p>
              </div>
            </div>

            <div className="bg-muted/30 p-2 rounded flex items-center justify-between mt-auto">
              <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Read Complexity:</span>
              <Badge variant="outline" className="font-mono bg-muted/50 border-primary/20">O(log n)</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  return (
    <VisualizerLayout
      title="Real-time Leaderboard (AVL-backed)"
      description="An ordered leaderboard powered by an AVL tree: always balanced, always O(log n) for inserts, updates, deletes, rank queries, and Top-N."
      difficulty="Intermediate"
      complexity={{
        time: "Insert/Update/Delete/Rank: O(log n)",
        space: "O(n)",
      }}
      concepts={LeaderboardConcepts}
    >
      <div className="w-full space-y-8">

        {/* Controls */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Add / Update Player</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Input
                placeholder="Player name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-w-[160px]"
              />
              <Input
                type="number"
                placeholder="Score"
                value={score}
                onChange={(e) => setScore(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-32"
              />
              <Button
                onClick={() => {
                  if (name.trim() && score !== "") {
                    upsertPlayer(name, Number(score))
                    setScore("")
                    setName("")
                  }
                }}
                className="gap-1"
              >
                <Plus className="h-4 w-4" /> Save
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (name.trim()) {
                    removeByName(name)
                    setName("")
                  }
                }}
                className="gap-1"
              >
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={seedDemo} className="gap-1">
                <RefreshCcw className="h-4 w-4" /> Seed Demo
              </Button>
              <Button variant="outline" onClick={tickRandomUpdate} className="gap-1">
                <Zap className="h-4 w-4" /> Random Update
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Rank & Top-N */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* SMALLER Find Rank card */}
          <Card className="md:col-span-1 self-start max-w-[520px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Find Rank</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 flex-wrap">
              <Input
                placeholder="Player name"
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
                className="min-w-[160px] flex-1"
              />
              <Button
                variant="outline"
                className="gap-1"
                onClick={() => setQueryName((v) => v.trim())}
              >
                <Search className="h-4 w-4" /> Check
              </Button>
              <div className="text-sm">
                {queryName.trim()
                  ? (() => {
                    const r = rankOfName(queryName)
                    return r
                      ? <span><strong>{queryName}</strong> is currently <strong>#{r}</strong></span>
                      : <span className="text-muted-foreground">No such player.</span>
                  })()
                  : <span className="text-muted-foreground">Enter a name to view rank.</span>
                }
              </div>
            </CardContent>
          </Card>

          {/* Wider Top-N card */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Top-N</CardTitle>
              <CardDescription className="text-black">
                Show the best performing players at a glance.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Input
                type="number"
                className="w-28"
                value={topCount}
                onChange={(e) => setTopCount(Math.max(1, Number(e.target.value || 1)))}
              />
              <div className="text-sm text-muted-foreground">Show best N players</div>
            </CardContent>
            <CardContent className="pt-0">
              <div className="rounded-lg border">
                <div className="grid grid-cols-12 text-xs font-semibold px-3 py-2 bg-muted">
                  <div className="col-span-2">Rank</div>
                  <div className="col-span-7">Player</div>
                  <div className="col-span-3 text-right">Score</div>
                </div>
                {topList.map((p, i) => (
                  <div key={p.id} className="grid grid-cols-12 px-3 py-2 border-t items-center">
                    <div className="col-span-2">
                      <Badge variant="secondary">#{i + 1}</Badge>
                    </div>
                    <div className="col-span-7 truncate">{p.name}</div>
                    <div className="col-span-3 text-right font-medium">{p.score}</div>
                  </div>
                ))}
                {topList.length === 0 && (
                  <div className="px-3 py-6 text-sm text-muted-foreground text-center">No players yet.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>AVL Tree Diagram</CardTitle>
            <CardDescription className="text-black">
              Players are arranged so that higher scores appear toward the left. The canvas below is scrollable for larger datasets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              ref={containerRef}
              className="min-h-[420px] p-4 bg-muted/10 rounded border overflow-auto"
            >
              <div className="w-full flex justify-center py-4">
                <AnimatePresence mode="popLayout">
                  {root ? (
                    renderNode(root)
                  ) : (
                    <div className="text-muted-foreground italic">Leaderboard is empty</div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes / Legend */}
        <Card>
          <CardHeader>
            <CardTitle>Notes & Legend</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              Each node shows <strong>name</strong>, <strong>score</strong>, plus small metrics:
              <code className="mx-1">h</code> (height) and <code className="mx-1">sz</code> (subtree size).
              Rank is computed with subtree sizes in O(log n).
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="min-w-40 px-3 py-2 rounded-2xl border-2 bg-background shadow-sm"><span className="text-xs">node</span></div>
                <span>Player entry</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">1234</Badge>
                <span>Current score</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </VisualizerLayout>
  )
}
