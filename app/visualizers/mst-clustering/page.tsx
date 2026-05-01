"use client"

import { useState, useEffect } from "react"
import { VisualizerLayout } from "../../../components/visualizer-layout"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { Label } from "../../../components/ui/label"
import { Shuffle, Play, Pause } from "lucide-react"

// Types
interface Point {
    id: string
    x: number
    y: number
}

interface Edge {
    from: string
    to: string
    weight: number
}

// Union-Find
class UnionFind {
    parent: Record<string, string>
    rank: Record<string, number>

    constructor(points: Point[]) {
        this.parent = {}
        this.rank = {}
        for (const p of points) {
            this.parent[p.id] = p.id
            this.rank[p.id] = 0
        }
    }

    find(x: string): string {
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x])
        }
        return this.parent[x]
    }

    union(x: string, y: string): boolean {
        const rootX = this.find(x)
        const rootY = this.find(y)
        if (rootX === rootY) return false
        if (this.rank[rootX] < this.rank[rootY]) {
            this.parent[rootX] = rootY
        } else if (this.rank[rootX] > this.rank[rootY]) {
            this.parent[rootY] = rootX
        } else {
            this.parent[rootY] = rootX
            this.rank[rootX]++
        }
        return true
    }
}

function generateRandomPoints(count = 12): Point[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `P${i + 1}`,
        x: 50 + Math.random() * 400,
        y: 50 + Math.random() * 350,
    }))
}

function distance(p1: Point, p2: Point): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
}

function edgeKey(a: string, b: string): string {
    return a < b ? `${a}-${b}` : `${b}-${a}`
}

export default function MSTClusteringPage() {
    const [points, setPoints] = useState<Point[]>([])
    const [mstEdges, setMstEdges] = useState<Edge[]>([])
    const [clusters, setClusters] = useState<Record<string, number>>({})
    const [clusterEdges, setClusterEdges] = useState<Edge[]>([])
    const [k, setK] = useState(1)
    const [maxK, setMaxK] = useState(1)

    // Initialize
    useEffect(() => {
        reset()
    }, [])

    const reset = () => {
        const pts = generateRandomPoints(12)
        setPoints(pts)

        // Build complete graph
        const allEdges: Edge[] = []
        for (let i = 0; i < pts.length; i++) {
            for (let j = i + 1; j < pts.length; j++) {
                allEdges.push({
                    from: pts[i].id,
                    to: pts[j].id,
                    weight: parseFloat(distance(pts[i], pts[j]).toFixed(1)),
                })
            }
        }

        // Kruskal's MST
        allEdges.sort((a, b) => a.weight - b.weight)
        const uf = new UnionFind(pts)
        const mst: Edge[] = []
        for (const edge of allEdges) {
            if (uf.union(edge.from, edge.to)) {
                mst.push(edge)
                if (mst.length === pts.length - 1) break
            }
        }

        setMstEdges(mst)
        setMaxK(pts.length) // max clusters = number of points
        setK(1)
        applyClustering(1, mst, pts)
    }

    const applyClustering = (kValue: number, mst: Edge[], pts: Point[]) => {
        const numToRemove = Math.max(0, kValue - 1)
        // Sort MST edges by weight descending
        const sortedEdges = [...mst].sort((a, b) => b.weight - a.weight)
        // Keep all except the top (k-1) longest
        const keptEdges = sortedEdges.slice(numToRemove)

        // Build clusters from kept edges
        const uf = new UnionFind(pts)
        for (const edge of keptEdges) {
            uf.union(edge.from, edge.to)
        }

        // Assign cluster IDs
        const rootToId = new Map<string, number>()
        let nextId = 0
        const clusterMap: Record<string, number> = {}
        for (const p of pts) {
            const root = uf.find(p.id)
            if (!rootToId.has(root)) {
                rootToId.set(root, nextId++)
            }
            clusterMap[p.id] = rootToId.get(root)!
        }

        setClusters(clusterMap)
        setClusterEdges(keptEdges)
    }

    const handleKChange = (value: number) => {
        const clamped = Math.min(maxK, Math.max(1, value))
        setK(clamped)
        applyClustering(clamped, mstEdges, points)
    }

    // Color palette
    const clusterColors = [
        "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899",
        "#06b6d4", "#f97316", "#84cc16", "#6366f1", "#000000", "#6b7280",
        "#e11d48", "#0d9488", "#7c3aed", "#dc2626", "#0891b2", "#ca8a04"
    ]

    const numActualClusters = Object.keys(clusters).length > 0
        ? Math.max(...Object.values(clusters)) + 1
        : 1

    const MSTClusteringConcepts = (
        <div className="space-y-6">
            <Card className="bg-card shadow-md border border-border rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-foreground">
                        Clustering using Minimum Spanning Trees
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm md:text-base">
                    <p>
                        An incredibly elegant application of the <strong>Minimum Spanning Tree</strong> is grouping data points together (Clustering). It leverages a core mathematical property of MSTs: by deleting the longest (most expensive) edges from an MST, you naturally break the graph into distinct, tightly-knit groups.
                    </p>
                    <div className="p-4 bg-muted/30 border rounded-lg shadow-sm space-y-2 mt-4">
                        <h4 className="font-semibold text-foreground text-sm">Key Concepts:</h4>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                            <li><strong>Agglomerative Hierarchical Clustering:</strong> This specific approach is mathematically identical to single-linkage clustering.</li>
                            <li><strong>Minimax Path Property:</strong> The path between any two nodes in an MST uniquely minimizes the maximum edge weight required to travel between them in the full graph.</li>
                            <li><strong>K-Clusters:</strong> Removing exactly <code>(k - 1)</code> edges from any tree is mathematically guaranteed to leave exactly <code>k</code> disconnected subtrees (clusters).</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-foreground">
                            The Algorithm
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
                        <p className="text-xs">
                            To divide a dataset of points into exactly <em>k</em> distinct clusters:
                        </p>

                        <div className="space-y-3 mt-2">
                            <div>
                                <ol className="list-decimal pl-5 space-y-2 text-xs">
                                    <li><strong>Create Graph:</strong> Treat every data point as a node. Form a complete graph (connect every node to every other node) where edge weights are the Euclidean distance.</li>
                                    <li><strong>Build MST:</strong> Compute the MST for this dense graph (often Kruskal's is preferred here since we want to sort all distances anyway).</li>
                                    <li><strong>Cut Edges:</strong> Find and permanently delete the <strong>(k - 1) longest edges</strong> from the newly formed MST.</li>
                                    <li><strong>Result:</strong> Because a tree has no cycles, removing 1 edge always splits the tree in 2. Removing (k - 1) edges leaves exactly <em>k</em> disconnected subtrees (your final clusters).</li>
                                </ol>
                            </div>
                            <div className="bg-muted/30 p-2 rounded flex flex-col">
                                <h4 className="font-semibold text-foreground mb-1 text-[11px] uppercase tracking-wider">Time Complexity</h4>
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="font-mono bg-muted/50 border-primary/20">O(N² log N)</Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground">Dominated by generating and sorting the <code>N²</code> connections in step 1.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-foreground">
                            Characteristics vs. K-Means
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
                        <p className="text-xs">
                            Why use MST Clustering instead of the popular K-Means?
                        </p>

                        <div className="space-y-3 mt-2">
                            <div>
                                <ul className="list-disc pl-5 space-y-2 text-xs flex-1">
                                    <li><strong>Arbitrary Shapes:</strong> K-Means forces clusters to be spherical/circular. MST clustering thrives on finding elongated, curved, or completely irregular shapes (like concentric circles).</li>
                                    <li><strong>The Chaining Effect (Drawback):</strong> Because it relies purely on the closest single connection (single-linkage), a sparse line of "noise" points between two massive clusters can accidentally bridge them into one.</li>
                                    <li><strong>Outlier Sensitivity:</strong> Removing the longest edge might just detach a single extreme outlier point, leaving the rest of the massive blob as one cluster.</li>
                                    <li><strong>Deterministic:</strong> K-Means relies on random starts. MST clustering always gives the exact same result every time.</li>
                                </ul>
                            </div>
                            <div className="bg-muted/30 p-2 rounded flex flex-col mt-auto">
                                <h4 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-1 text-[11px] uppercase tracking-wider">Best Use Case</h4>
                                <p className="text-[10px] text-muted-foreground">Spatial data grouping, image segmentation, and grouping points with known distinct spatial separation but irregular shapes.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );

    return (
        <VisualizerLayout
            title="MST-Based Clustering into k Clusters"
            description="Split the MST into exactly k connected subtrees by removing the (k−1) longest edges"
            difficulty="Intermediate"
            complexity={{
                time: "O(n² log n)",
                space: "O(n²)",
            }}
            concepts={MSTClusteringConcepts}
        >
            <div className="w-full space-y-6">
                {/* Visualization */}
                <div className="flex justify-center">
                    <div className="border rounded-lg bg-gray-50 p-4 w-full flex justify-center">
                        <svg viewBox="0 0 600 500" className="w-full h-auto max-w-[600px] bg-white rounded">
                            {/* Cluster edges (remaining MST edges) */}
                            {clusterEdges.map((edge, idx) => {
                                const p1 = points.find(p => p.id === edge.from)!
                                const p2 = points.find(p => p.id === edge.to)!
                                return (
                                    <line
                                        key={idx}
                                        x1={p1.x}
                                        y1={p1.y}
                                        x2={p2.x}
                                        y2={p2.y}
                                        stroke="#4b5563"
                                        strokeWidth="2"
                                    />
                                )
                            })}

                            {/* Points colored by cluster */}
                            {points.map((point) => {
                                const cid = clusters[point.id] ?? 0
                                const color = clusterColors[cid % clusterColors.length]
                                return (
                                    <g key={point.id}>
                                        <circle
                                            cx={point.x}
                                            cy={point.y}
                                            r="8"
                                            fill={color}
                                            stroke="#1e293b"
                                            strokeWidth="1.5"
                                        />
                                        <text
                                            x={point.x}
                                            y={point.y + 20}
                                            textAnchor="middle"
                                            className="text-xs font-medium fill-gray-700"
                                        >
                                            {point.id}
                                        </text>
                                    </g>
                                )
                            })}
                        </svg>
                    </div>
                </div>

                {/* Controls */}
                <Card>
                    <CardHeader>
                        <CardTitle>Set Number of Clusters (k)</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label>Clusters (k)</Label>
                            <div className="flex gap-2 mt-1">
                                <Input
                                    type="number"
                                    min="1"
                                    max={maxK}
                                    value={k}
                                    onChange={(e) => handleKChange(Number(e.target.value))}
                                    className="w-24"
                                />
                                <span className="self-center text-sm text-muted-foreground">/ {maxK}</span>
                            </div>
                        </div>
                        <div>
                            <Label>Resulting Clusters</Label>
                            <div className="text-lg font-bold mt-1">{numActualClusters}</div>
                        </div>
                        <div className="flex items-end gap-2">
                            <Button onClick={reset} variant="outline" className="w-full">
                                <Shuffle className="h-4 w-4 mr-2" />
                                New Data
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Legend */}
                <Card>
                    <CardHeader>
                        <CardTitle>Clusters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                            {Array.from({ length: numActualClusters }, (_, i) => (
                                <div key={i} className="flex items-center gap-1">
                                    <div
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: clusterColors[i % clusterColors.length] }}
                                    />
                                    <span>Cluster {i}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </VisualizerLayout>
    )
}