"use client"

import { useCallback, useMemo, useState } from "react"
import { VisualizerLayout } from "../../../components/visualizer-layout"
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card"
import { Input } from "../../../components/ui/input"
import { Button } from "../../../components/ui/button"
import { Badge } from "../../../components/ui/badge"
import {
  Folder,
  File as FileIcon,
  Plus,
  Trash2,
  Pencil,
  Search,
  RefreshCcw,
  ChevronRight,
  ChevronDown,
  GitBranch,
  RotateCcw,
} from "lucide-react"

/**
 * File System & Folder Explorer (client-only)
 * Mirrors the Tree Visualizer’s look/feel. Folders are internal nodes; files are leaves.
 * Uses the same “tree” layout ideas and DFS-style traversal utilities.
 */

// -------- Types --------
interface FSNode {
  id: string
  name: string
  type: "folder" | "file"
  children?: FSNode[]
  x?: number
  y?: number
}

// -------- Constants (mirrors tree visualizer sizing) --------
const SVG_W = 900
const SVG_H = 460
const NODE_RADIUS = 22
const H_GAP_BASE = 260
const V_GAP = 92
const MIN_H_SPACING = 54

// -------- Utilities --------
const uid = () => Math.random().toString(36).slice(2)

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

function findNode(root: FSNode, id: string): FSNode | null {
  if (root.id === id) return root
  if (root.children) {
    for (const c of root.children) {
      const f = findNode(c, id)
      if (f) return f
    }
  }
  return null
}

function removeNode(root: FSNode, id: string): FSNode {
  const copy = clone(root)
  const rec = (n: FSNode): boolean => {
    if (!n.children) return false
    const idx = n.children.findIndex(c => c.id === id)
    if (idx !== -1) {
      n.children.splice(idx, 1)
      return true
    }
    return n.children.some(rec)
  }
  rec(copy)
  return copy
}

function mapDFS<T>(node: FSNode | null, fn: (n: FSNode, depth: number) => T, depth = 0): T[] {
  if (!node) return []
  const arr: T[] = [fn(node, depth)]
  if (node.children) for (const c of node.children) arr.push(...mapDFS(c, fn, depth + 1))
  return arr
}

function calculatePositions(node: FSNode | null, x = SVG_W / 2, y = 60, level = 0): FSNode | null {
  if (!node) return null
  const spacing = Math.max(H_GAP_BASE / (level + 1), MIN_H_SPACING)
  const children = node.children || []
  const positionedChildren = children.map((c, i) => {
    const offset = (i - (children.length - 1) / 2) * spacing
    return calculatePositions(c, x + offset, y + V_GAP, level + 1)!
  })
  return { ...node, x, y, children: positionedChildren }
}

function ensureFolder(n: FSNode): FSNode {
  return n.type === "folder" ? n : { ...n, type: "folder", children: n.children || [] }
}

// Sample tree
function initialFS(): FSNode {
  return {
    id: uid(),
    name: "root",
    type: "folder",
    children: [
      {
        id: uid(),
        name: "Documents",
        type: "folder",
        children: [
          { id: uid(), name: "resume.pdf", type: "file" },
          { id: uid(), name: "report.docx", type: "file" },
        ],
      },
      {
        id: uid(),
        name: "Projects",
        type: "folder",
        children: [
          {
            id: uid(),
            name: "website",
            type: "folder",
            children: [
              { id: uid(), name: "index.html", type: "file" },
              { id: uid(), name: "styles.css", type: "file" },
            ],
          },
          { id: uid(), name: "ml-notes.md", type: "file" },
        ],
      },
      { id: uid(), name: "todo.txt", type: "file" },
    ],
  }
}

export default function FileSystemExplorerPage() {
  const [root, setRoot] = useState<FSNode>(() => initialFS())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newName, setNewName] = useState("")
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const positioned = useMemo(() => calculatePositions(root), [root])

  // Compute dynamic bounds for SVG so the diagram always fits
  const PAD = 60
  const getBounds = useCallback((node: FSNode | null) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    if (!node) return { minX: 0, maxX: SVG_W, minY: 0, maxY: SVG_H }
    mapDFS(node, n => {
      if (typeof n.x === "number" && typeof n.y === "number") {
        minX = Math.min(minX, n.x!)
        maxX = Math.max(maxX, n.x!)
        minY = Math.min(minY, n.y!)
        maxY = Math.max(maxY, n.y!)
      }
      return null
    })
    if (!isFinite(minX)) return { minX: 0, maxX: SVG_W, minY: 0, maxY: SVG_H }
    return { minX, maxX, minY, maxY }
  }, [])

  const bounds = useMemo(() => getBounds(positioned), [positioned, getBounds])
  const viewBox = useMemo(() => {
    const w = Math.max(1, bounds.maxX - bounds.minX + PAD * 2)
    const h = Math.max(1, bounds.maxY - bounds.minY + PAD * 2)
    return `${bounds.minX - PAD} ${bounds.minY - PAD} ${w} ${h}`
  }, [bounds])
  const svgHeight = useMemo(() => {
    const h = bounds.maxY - bounds.minY + PAD * 2
    return Math.min(700, Math.max(380, Math.round(h)))
  }, [bounds])

  const selectedNode = useMemo(
    () => (selectedId ? findNode(root, selectedId) : null),
    [root, selectedId]
  )

  // -------- Actions --------
  const addFolder = useCallback(() => {
    const target = selectedId ? findNode(root, selectedId) : root
    if (!target) return
    const copy = clone(root)
    const t = selectedId ? findNode(copy, selectedId)! : copy
    const folder: FSNode = { id: uid(), name: `New Folder`, type: "folder", children: [] }
    t.children = t.children || []
    t.children.push(folder)
    setExpanded(prev => ({ ...prev, [t.id]: true }))
    setRoot(copy)
  }, [root, selectedId])

  const addFile = useCallback(() => {
    const target = selectedId ? findNode(root, selectedId) : root
    if (!target) return
    const copy = clone(root)
    const t = selectedId ? findNode(copy, selectedId)! : copy
    const file: FSNode = { id: uid(), name: `file-${Math.floor(Math.random() * 1000)}.txt`, type: "file" }
    t.children = t.children || []
    t.children.push(file)
    setExpanded(prev => ({ ...prev, [t.id]: true }))
    setRoot(copy)
  }, [root, selectedId])

  const renameNode = useCallback(() => {
    if (!selectedId || !newName.trim()) return
    const copy = clone(root)
    const t = findNode(copy, selectedId)
    if (!t) return
    t.name = newName.trim()
    setRoot(copy)
    setNewName("")
  }, [root, selectedId, newName])

  const deleteNode = useCallback(() => {
    if (!selectedId) return
    if (findNode(root, selectedId)?.name === "root") return
    const updated = removeNode(root, selectedId)
    setRoot(updated)
    setSelectedId(null)
  }, [root, selectedId])

  const clearSelection = () => setSelectedId(null)
  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  const resetFS = () => {
    setRoot(initialFS())
    setSelectedId(null)
    setExpanded({})
    setSearch("")
    setNewName("")
  }

  // -------- Traversal helpers reused from tree visualizer logic --------
  // Preorder list (Root -> Children)
  const preorderList = useMemo(() => mapDFS(positioned!, n => n.name), [positioned])

  // Find path to node by name (first match) using DFS
  const pathTo = useCallback((name: string): FSNode[] => {
    const path: FSNode[] = []
    const dfs = (n: FSNode | null): boolean => {
      if (!n) return false
      path.push(n)
      if (n.name.toLowerCase() === name.toLowerCase()) return true
      if (n.children) {
        for (const c of n.children) if (dfs(c)) return true
      }
      path.pop()
      return false
    }
    dfs(root)
    return path
  }, [root])

  const searchMatches = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return new Set<string>()
    const ids = new Set<string>()
    mapDFS(root, n => {
      if (n.name.toLowerCase().includes(term)) ids.add(n.id)
      return null
    })
    return ids
  }, [root, search])

  // -------- Renderers --------
  const renderSVG = (node: FSNode | null): JSX.Element | null => {
    if (!node) return null
    const isSelected = node.id === selectedId
    const isMatch = searchMatches.has(node.id)

    return (
      <g key={node.id}>
        {node.children?.map((c) => (
          <line
            key={`${node.id}-${c.id}`}
            x1={node.x}
            y1={node.y}
            x2={c.x}
            y2={c.y}
            stroke="#e5e7eb"
            strokeWidth="2"
          />
        ))}

        {node.children?.map((c) => renderSVG(c))}

        {/* Node glyph (emoji so it positions correctly inside SVG) */}
        <text x={node.x} y={(node.y ?? 0) - 28} textAnchor="middle" className="text-xs" fill="#6b7280">
          {node.type === "folder" ? "📁" : "📄"}
        </text>

        <circle
          cx={node.x}
          cy={node.y}
          r={NODE_RADIUS}
          fill={isSelected ? "#6366f1" : isMatch ? "#f59e0b" : node.type === "folder" ? "#ffffff" : "#f8fafc"}
          stroke={isSelected ? "#4f46e5" : isMatch ? "#d97706" : "#6b7280"}
          strokeWidth="2"
          className="transition-all duration-300 cursor-pointer"
          onClick={() => setSelectedId(node.id)}
        />
        <text x={node.x} y={(node.y ?? 0) + 34} textAnchor="middle" className="text-xs" fill="#374151">
          {node.name}
        </text>
      </g>
    )
  }

  const TreeList = ({ node, depth = 0 }: { node: FSNode; depth?: number }) => {
    const isFolder = node.type === "folder"
    const open = expanded[node.id] ?? depth < 1 // open top-level by default
    const isSel = node.id === selectedId
    const isMatch = searchMatches.has(node.id)

    return (
      <div key={node.id} className="pl-2">
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-sm cursor-pointer transition-colors ${isSel ? "bg-primary/10 ring-1 ring-primary" : isMatch ? "bg-yellow-50" : "hover:bg-muted"
            }`}
          onClick={() => setSelectedId(node.id)}
        >
          {isFolder ? (
            <button
              className="p-1 rounded hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(node.id)
              }}
              title={open ? "Collapse" : "Expand"}
            >
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-6" />
          )}
          {isFolder ? <Folder className="h-4 w-4 text-blue-600" /> : <FileIcon className="h-4 w-4 text-slate-600" />}
          <span className="truncate ml-1" title={node.name}>
            {node.name}
          </span>
        </div>
        {isFolder && open && node.children?.length ? (
          <div className="ml-6 border-l pl-2 border-muted-foreground/20">
            {node.children.map((c) => (
              <TreeList key={c.id} node={c} depth={depth + 1} />
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  // -------- Description & meta --------
  const description =
    "This application models a file system as a tree. Folders are internal nodes and files are leaves. We reuse the tree visualizer’s layout algorithm to position nodes in an SVG and the same preorder/DFS ideas to implement features like search, breadcrumbs, and outline rendering."

  const howItUsesTreeViz = [
    "Folders/files are nodes; parent-child edges form the hierarchy",
    "Preorder traversal produces a stable outline listing",
    "DFS path finding powers quick-jump and breadcrumbs",
    "The same spacing math (H_GAP, V_GAP) lays out the diagram",
  ]



  // Breadcrumbs for selected node
  const breadcrumbs = useMemo(() => {
    if (!selectedNode) return [] as FSNode[]
    const path = pathTo(selectedNode.name)
    return path
  }, [selectedNode, pathTo])

  const FileSystemConcepts = (
    <div className="space-y-8">
      <Card className="bg-card shadow-md border border-border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            File Systems as Trees
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm md:text-base">
          <p>
            A <strong>file system</strong> naturally forms a hierarchical, N-ary tree structure. The single, top-level directory (like <code>C:\</code> on Windows or <code>/</code> on Unix) is the root node of the tree.
          </p>
          <div className="p-4 bg-muted/30 border rounded-lg shadow-sm space-y-2 mt-4">
            <h4 className="font-semibold text-foreground text-sm">Node Terminology:</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li><strong>Folders (Directories):</strong> Act as <em>internal nodes</em> because they can have children (other folders or files).</li>
              <li><strong>Files:</strong> Act as <em>leaf nodes</em> because they mark the end of a branch and cannot contain other hierarchical items.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              Tree Traversals in Practice
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
            <div className="space-y-3 mt-2">
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Preorder Traversal</h4>
                <p className="text-xs">Used to generate the linear outline view of the folders. It visits a folder, then recursively visits all its contents (like the <code>tree</code> command in the terminal).</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Depth-First Search (DFS)</h4>
                <p className="text-xs">Used when searching for a file by name. If found, the recursion stack naturally provides the absolute path (breadcrumbs) back to the root.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Postorder Traversal</h4>
                <p className="text-xs">Used for calculating total directory sizes or deleting folders. You must calculate the size of (or delete) all children <em>before</em> you process the parent folder.</p>
              </div>
            </div>

            <div className="bg-muted/30 p-2 rounded flex items-center justify-between mt-auto">
              <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Traversal Complexity:</span>
              <Badge variant="outline" className="font-mono bg-muted/50 border-primary/20">O(N)</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              Visualizer Architecture
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
            <div className="space-y-3 mt-2 text-xs">
              <p>This layout uses the same underlying mathematics as our Binary Search Tree visualizer, but adapted for N-ary structures:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Recursive Positioning:</strong> Nodes are given X/Y coordinates dynamically during a top-down pass.</li>
                <li><strong>Dynamic Spacing:</strong> Horizontal spacing tightens at deeper levels to prevent overlapping branches across broad directory structures.</li>
                <li><strong>N-ary Distribution:</strong> Unlike a BST (2 children), this layout calculates the total width needed for <em>n</em> children and distributes them evenly around their parent's center X coordinate.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  return (
    <VisualizerLayout
      title="File System & Folder Explorer"
      description="Explore, edit, and visualize a folder tree. Built on the same tree-rendering logic as the Binary Tree/BST visualizer."
      difficulty="Beginner"
      complexity={{ time: "O(n) traversal", space: "O(h)" }}
      concepts={FileSystemConcepts}
    >
      <div className="w-full space-y-6">
        {/* Controls */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GitBranch className="h-5 w-5" /> Selection & Create
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Selected: <span className="font-medium">{selectedNode?.name ?? "(root)"}</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={addFolder} className="flex-1" variant="default">
                  <Plus className="h-4 w-4 mr-1" /> Folder
                </Button>
                <Button onClick={addFile} className="flex-1" variant="secondary">
                  <Plus className="h-4 w-4 mr-1" /> File
                </Button>
              </div>
              <div className="flex gap-2">
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Rename selected..." />
                <Button onClick={renameNode} variant="outline">
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={deleteNode} variant="destructive" className="flex-1">
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
                <Button onClick={clearSelection} variant="ghost" className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-1" /> Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 items-center">
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search names..." />
                <Button variant="outline">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">Matching nodes are highlighted in the diagram & outline.</div>
              <div className="text-xs font-mono bg-muted p-2 rounded h-20 overflow-auto">
                Preorder: {preorderList.join("  →  ")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reset</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={resetFS} className="w-full">
                <RefreshCcw className="h-4 w-4 mr-2" /> Reset to Sample
              </Button>
              <div className="text-sm text-muted-foreground">This resets the tree to a sample file structure and clears UI state.</div>
            </CardContent>
          </Card>
        </div>

        {/* Explorer then Diagram (stacked) */}
        <div className="space-y-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Folder className="h-5 w-5" /> Explorer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[420px] overflow-auto pr-1">
                <TreeList node={ensureFolder(root)} />
              </div>
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-lg">Diagram</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/10 rounded-lg p-2 min-h-[440px] overflow-auto">
                <svg
                  width="100%"
                  height={svgHeight}
                  viewBox={viewBox}
                  preserveAspectRatio="xMidYMid meet"
                  className="mx-auto block"
                >
                  {positioned && renderSVG(positioned)}
                </svg>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Breadcrumbs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Breadcrumbs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-1 text-sm">
              {breadcrumbs.length === 0 ? (
                <span className="text-muted-foreground">Select a node to see its path.</span>
              ) : (
                breadcrumbs.map((b, i) => (
                  <div key={b.id} className="flex items-center">
                    <button
                      className={`px-2 py-1 rounded-md hover:bg-muted ${b.id === selectedId ? "bg-primary/10 ring-1 ring-primary" : ""
                        }`}
                      onClick={() => setSelectedId(b.id)}
                    >
                      {b.name}
                    </button>
                    {i < breadcrumbs.length - 1 && (
                      <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </VisualizerLayout>
  )
}
