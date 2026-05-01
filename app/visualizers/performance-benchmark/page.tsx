"use client"

import React, { useState, useEffect, useRef } from "react"
import { VisualizerLayout } from "../../../components/visualizer-layout"
import { Button } from "../../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Play, RotateCcw, Upload, Download, ChartBar } from "lucide-react"
import { bubbleSort, selectionSort, insertionSort, mergeSort, quickSort, heapSort } from "@/lib/algorithms/sorting"
import type { SortElement } from "@/lib/algorithms/sorting"
import { runBenchmarkAsync, type BenchmarkStats } from "@/lib/algorithms/benchmark"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from "recharts"

type AlgoName = "bubble" | "selection" | "insertion" | "merge" | "quick" | "heap"
type DatasetType = "random" | "nearly-sorted" | "reversed" | "custom"

interface BenchmarkResult {
    algorithm: AlgoName
    timeMs: number
    comparisons: number
    swaps: number
    progress?: number
}

export default function PerformanceBenchmark() {
    const [arraySize, setArraySize] = useState<number>(1000)
    const [datasetType, setDatasetType] = useState<DatasetType>("random")

    // Custom dataset state
    const [customData, setCustomData] = useState<number[]>([])
    const [datasetPreview, setDatasetPreview] = useState<string>("")

    const [algo1, setAlgo1] = useState<AlgoName>("bubble")
    const [algo2, setAlgo2] = useState<AlgoName>("quick")

    const [results, setResults] = useState<BenchmarkResult[]>([])
    const [isTesting, setIsTesting] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Generate dataset based on type
    const generateDataset = (): SortElement[] => {
        if (datasetType === "custom" && customData.length > 0) {
            return customData.map((val, idx) => ({ value: val, id: idx }))
        }

        const arr: SortElement[] = []
        for (let i = 0; i < arraySize; i++) {
            let val = 0
            if (datasetType === "random") {
                val = Math.floor(Math.random() * 10000)
            } else if (datasetType === "nearly-sorted") {
                val = i + (Math.random() > 0.9 ? Math.floor(Math.random() * 20) - 10 : 0)
            } else if (datasetType === "reversed") {
                val = arraySize - i
            }
            arr.push({ value: val, id: i })
        }
        return arr
    }

    // Effect to upate preview when parameters change
    useEffect(() => {
        if (datasetType !== "custom") {
            const arr = generateDataset()
            const preview = arr.slice(0, 10).map(x => x.value).join(", ") + (arr.length > 10 ? "..." : "")
            setDatasetPreview(preview)
        } else {
            if (customData.length === 0) {
                setDatasetPreview("No custom data loaded.")
            } else {
                const preview = customData.slice(0, 10).join(", ") + (customData.length > 10 ? "..." : "")
                setDatasetPreview(`(${customData.length} items) ` + preview)
            }
        }
    }, [arraySize, datasetType, customData])

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const text = event.target?.result as string
            try {
                // Parse CSV or newline separated numbers
                const values = text
                    .split(/[\n,]+/)
                    .map(v => v.trim())
                    .filter(v => v !== "")
                    .map(v => Number(v))
                    .filter(v => !isNaN(v))

                if (values.length > 0) {
                    setCustomData(values)
                    setDatasetType("custom")
                    setArraySize(values.length)
                } else {
                    alert("Could not find valid numbers in the file.")
                }
            } catch (err) {
                alert("Error parsing file.")
            }
        }
        reader.readAsText(file)
    }

    const runBenchmark = async () => {
        setIsTesting(true)
        setResults([
            { algorithm: algo1, timeMs: 0, comparisons: 0, swaps: 0, progress: 0 },
            { algorithm: algo2, timeMs: 0, comparisons: 0, swaps: 0, progress: 0 }
        ])

        const baseArray = generateDataset().map(x => x.value)

        const updateResult = (index: number, stats: BenchmarkStats) => {
            setResults(prev => {
                const newRes = [...prev]
                newRes[index] = { ...newRes[index], ...stats }
                return newRes
            })
        }

        const stats1 = await runBenchmarkAsync(algo1, baseArray, (s) => updateResult(0, s))
        updateResult(0, stats1)

        const stats2 = await runBenchmarkAsync(algo2, baseArray, (s) => updateResult(1, s))
        updateResult(1, stats2)

        setIsTesting(false)
    }

    const algoOptions: AlgoName[] = ["bubble", "selection", "insertion", "merge", "quick", "heap"]

    // Formatter for Recharts
    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
        return num.toString()
    }

    return (
        <VisualizerLayout
            title="Algorithm Performance Benchmark"
            description="Run side-by-side benchmarks of sorting algorithms on large datasets to analyze their runtime, comparisons, and swaps."
            difficulty="Advanced"
            onReset={() => {
                setResults([])
                setDatasetType("random")
                setArraySize(1000)
            }}
            applications={[]}
        >
            <div className="space-y-8">
                {/* Configuration Panel */}
                <Card className="border-4 border-primary">
                    <CardHeader className="bg-muted/30 pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <ChartBar className="h-6 w-6 text-primary" />
                            Benchmark Configuration
                        </CardTitle>
                        <CardDescription>Setup dataset and select algorithms to compare</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 grid gap-8">

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Dataset Config */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg flex items-center border-b pb-2">1. Dataset</h3>

                                <div className="space-y-3">
                                    <div className="grid grid-cols-3 gap-2 items-center">
                                        <Label htmlFor="datasetType">Pattern</Label>
                                        <div className="col-span-2">
                                            <Select value={datasetType} onValueChange={(v: DatasetType) => setDatasetType(v)}>
                                                <SelectTrigger id="datasetType"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="random">Random Distribution</SelectItem>
                                                    <SelectItem value="nearly-sorted">Nearly Sorted</SelectItem>
                                                    <SelectItem value="reversed">Reverse Sorted</SelectItem>
                                                    <SelectItem value="custom">Custom (Upload CSV)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {datasetType !== "custom" ? (
                                        <div className="grid grid-cols-3 gap-2 items-center">
                                            <Label htmlFor="arraySize">Size (N)</Label>
                                            <div className="col-span-2">
                                                <Input
                                                    id="arraySize"
                                                    type="number"
                                                    value={arraySize}
                                                    onChange={e => setArraySize(Math.max(10, Math.min(50000, Number(e.target.value))))}
                                                    min={10}
                                                    max={50000}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-2 items-center">
                                            <Label>Upload Data</Label>
                                            <div className="col-span-2 flex gap-2">
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    accept=".csv,.txt"
                                                    onChange={handleFileUpload}
                                                />
                                                <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                                                    <Upload className="h-4 w-4 mr-2" /> Upload CSV/TXT
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground bg-muted p-2 rounded border font-mono break-all">
                                    Preview: {datasetPreview}
                                </div>
                            </div>

                            {/* Algorithm Config */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg flex items-center border-b pb-2">2. Algorithms</h3>
                                <div className="space-y-4 pt-2">
                                    <div className="flex justify-between items-center gap-4">
                                        <div className="flex-1 space-y-2">
                                            <Label className="text-blue-600 font-bold">Algorithm A</Label>
                                            <Select value={algo1} onValueChange={(v: AlgoName) => setAlgo1(v)}>
                                                <SelectTrigger className="border-blue-200 bg-blue-50/50"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {algoOptions.map(a => <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)} Sort</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="font-bold text-muted-foreground pt-6">VS</div>
                                        <div className="flex-1 space-y-2">
                                            <Label className="text-purple-600 font-bold">Algorithm B</Label>
                                            <Select value={algo2} onValueChange={(v: AlgoName) => setAlgo2(v)}>
                                                <SelectTrigger className="border-purple-200 bg-purple-50/50"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {algoOptions.map(a => <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)} Sort</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={runBenchmark}
                                        disabled={isTesting}
                                        className="w-full h-12 text-md font-bold mt-4"
                                    >
                                        {isTesting ? (
                                            "Testing... Please wait..."
                                        ) : (
                                            <>
                                                <Play className="mr-2 h-5 w-5 fill-current" /> Run Benchmark
                                            </>
                                        )}
                                    </Button>

                                    {arraySize > 10000 && (algo1 === "bubble" || algo1 === "selection" || algo1 === "insertion" || algo2 === "bubble" || algo2 === "selection" || algo2 === "insertion") && (
                                        <p className="text-xs text-amber-600 font-medium">
                                            Warning: O(N²) algorithms like Bubble, Selection, and Insertion sort may cause the browser to freeze with N &gt; 10,000.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Results Section */}
                {results.length > 0 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Trophy className="h-6 w-6 text-yellow-500" />
                            Benchmark Results
                        </h2>

                        {/* Progress or Winner Banner */}
                        {isTesting ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col gap-2 shadow-sm">
                                <span className="text-sm font-bold text-blue-800 animate-pulse">
                                    Running Benchmarks... {Math.round(((results[0]?.progress || 0) + (results[1]?.progress || 0)) / 2 * 100)}%
                                </span>
                                <div className="h-3 bg-blue-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-600 transition-all duration-300"
                                        style={{ width: `${((results[0]?.progress || 0) + (results[1]?.progress || 0)) / 2 * 100}%` }}
                                    />
                                </div>
                            </div>
                        ) : results[0]?.progress === 1 && results[1]?.progress === 1 && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between shadow-sm animate-in zoom-in duration-500">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-green-800">Fastest Algorithm</span>
                                    <span className="text-xl font-bold text-green-700 capitalize">
                                        {results[0].timeMs < results[1].timeMs ? results[0].algorithm : results[1].algorithm} Sort
                                    </span>
                                </div>
                                <div className="text-right flex flex-col">
                                    <span className="text-sm font-medium text-green-800">Speed Difference</span>
                                    <span className="text-xl font-bold text-green-700">
                                        {Math.abs(results[0].timeMs - results[1].timeMs).toFixed(2)} ms faster
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Charts Grid */}
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Time Chart */}
                            <Card className="shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Execution Time (ms)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[250px] w-full mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={results} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                                <XAxis dataKey="algorithm" tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
                                                <YAxis tickFormatter={formatNumber} />
                                                <Tooltip
                                                    formatter={(val: number) => [val + ' ms', 'Time']}
                                                    labelFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1) + ' Sort'}
                                                />
                                                <Bar dataKey="timeMs" radius={[4, 4, 0, 0]}>
                                                    {results.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 0 ? "#3b82f6" : "#a855f7"} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm">
                                        <div className="font-mono bg-blue-50 text-blue-700 py-1 rounded">{results[0].timeMs} ms</div>
                                        <div className="font-mono bg-purple-50 text-purple-700 py-1 rounded">{results[1].timeMs} ms</div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Comparisons Chart */}
                            <Card className="shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Comparisons</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[250px] w-full mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={results} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                                <XAxis dataKey="algorithm" tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
                                                <YAxis tickFormatter={formatNumber} />
                                                <Tooltip
                                                    formatter={(val: number) => [val.toLocaleString(), 'Comparisons']}
                                                    labelFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1) + ' Sort'}
                                                />
                                                <Bar dataKey="comparisons" radius={[4, 4, 0, 0]}>
                                                    {results.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 0 ? "#3b82f6" : "#a855f7"} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm">
                                        <div className="font-mono bg-blue-50 text-blue-700 py-1 rounded">{formatNumber(results[0].comparisons)}</div>
                                        <div className="font-mono bg-purple-50 text-purple-700 py-1 rounded">{formatNumber(results[1].comparisons)}</div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Swaps Chart */}
                            <Card className="shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Array Swaps/Writes</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[250px] w-full mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={results} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                                <XAxis dataKey="algorithm" tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
                                                <YAxis tickFormatter={formatNumber} />
                                                <Tooltip
                                                    formatter={(val: number) => [val.toLocaleString(), 'Swaps']}
                                                    labelFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1) + ' Sort'}
                                                />
                                                <Bar dataKey="swaps" radius={[4, 4, 0, 0]}>
                                                    {results.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 0 ? "#3b82f6" : "#a855f7"} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm">
                                        <div className="font-mono bg-blue-50 text-blue-700 py-1 rounded">{formatNumber(results[0].swaps)}</div>
                                        <div className="font-mono bg-purple-50 text-purple-700 py-1 rounded">{formatNumber(results[1].swaps)}</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </VisualizerLayout>
    )
}

function Trophy(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    )
}
