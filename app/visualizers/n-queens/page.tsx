"use client"

import React, { useState, useEffect, useRef } from "react"
import { VisualizerLayout } from "../../../components/visualizer-layout"
import { Button } from "../../../components/ui/button"
import { Badge } from "../../../components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Slider } from "../../../components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Play, RotateCcw, Crown } from "lucide-react"

// Types
type BoardState = number[][] // 0 = empty, 1 = queen
type Step = {
    board: BoardState
    currentRow: number
    pCol: number
    status: "placing" | "safe" | "unsafe" | "backtracking" | "solution"
    description: string
    callStack: { row: number, col: number }[]
}

export default function NQueensVisualizer() {
    const [n, setN] = useState(4)
    const [board, setBoard] = useState<BoardState>([])
    const [steps, setSteps] = useState<Step[]>([])
    const [currentStep, setCurrentStep] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [speed, setSpeed] = useState([500])
    const [solutionsFound, setSolutionsFound] = useState(0)

    // Initialize Board
    useEffect(() => {
        resetBoard()
    }, [n])

    const resetBoard = () => {
        const newBoard = Array(n).fill(0).map(() => Array(n).fill(0))
        setBoard(newBoard)
        setSteps([])
        setCurrentStep(0)
        setIsPlaying(false)
        setSolutionsFound(0)
    }

    // --- N-Queens Algorithm with Step Tracking ---
    const solveNQueens = () => {
        const newSteps: Step[] = []
        const tempBoard = Array(n).fill(0).map(() => Array(n).fill(0))
        let solCount = 0
        const currentStack: { row: number, col: number }[] = []

        const isSafe = (row: number, col: number) => {
            // Check column
            for (let i = 0; i < row; i++) {
                if (tempBoard[i][col] === 1) return false
            }
            // Check upper left diagonal
            for (let i = row, j = col; i >= 0 && j >= 0; i--, j--) {
                if (tempBoard[i][j] === 1) return false
            }
            // Check upper right diagonal
            for (let i = row, j = col; i >= 0 && j < n; i--, j++) {
                if (tempBoard[i][j] === 1) return false
            }
            return true
        }

        const backtrack = (row: number) => {
            if (row === n) {
                solCount++
                newSteps.push({
                    board: tempBoard.map(r => [...r]),
                    currentRow: row,
                    pCol: -1,
                    status: "solution",
                    description: `Solution ${solCount} found!`,
                    callStack: [...currentStack]
                })
                return
            }

            for (let col = 0; col < n; col++) {
                currentStack.push({ row, col })
                tempBoard[row][col] = 1
                newSteps.push({
                    board: tempBoard.map(r => [...r]),
                    currentRow: row,
                    pCol: col,
                    status: "placing",
                    description: `Trying Queen at (${row}, ${col})...`,
                    callStack: [...currentStack]
                })

                if (isSafe(row, col)) {
                    newSteps.push({
                        board: tempBoard.map(r => [...r]),
                        currentRow: row,
                        pCol: col,
                        status: "safe",
                        description: `Position (${row}, ${col}) is safe.`,
                        callStack: [...currentStack]
                    })
                    backtrack(row + 1)
                } else {
                    newSteps.push({
                        board: tempBoard.map(r => [...r]),
                        currentRow: row,
                        pCol: col,
                        status: "unsafe",
                        description: `Position (${row}, ${col}) is under attack!`,
                        callStack: [...currentStack]
                    })
                }

                tempBoard[row][col] = 0
                newSteps.push({
                    board: tempBoard.map(r => [...r]),
                    currentRow: row,
                    pCol: col,
                    status: "backtracking",
                    description: `Backtracking from (${row}, ${col}).`,
                    callStack: [...currentStack]
                })
                currentStack.pop()
            }
        }

        backtrack(0)
        setSteps(newSteps)
        setSolutionsFound(solCount)

        // Auto-start
        setCurrentStep(0)
        setIsPlaying(true)
    }

    // Playback Control
    useEffect(() => {
        let timer: NodeJS.Timeout
        if (isPlaying && currentStep < steps.length - 1) {
            timer = setTimeout(() => {
                setCurrentStep(prev => prev + 1)
            }, 1050 - speed[0] * 10) // Speed mapping
        } else if (currentStep >= steps.length - 1) {
            setIsPlaying(false)
        }
        return () => clearTimeout(timer)
    }, [isPlaying, currentStep, steps, speed])

    // Current Step Data
    const activeStep = steps[currentStep]
    const displayBoard = activeStep ? activeStep.board : board

    // Safe checks for rendering highlights (stateless from algo to avoiding storing it all)
    const isAttacked = (r: number, c: number) => {
        if (!activeStep) return false
        if (activeStep.status !== "unsafe") return false
        const { currentRow, pCol } = activeStep
        if (r === currentRow && c === pCol) return true // The piece itself
        // Highlight the attack source? Simplified: Just highlight the unsafe cell red.
        return (r === currentRow && c === pCol)
    }

    const getCellStatusColor = (r: number, c: number) => {
        if (!activeStep) return ""
        const { currentRow, pCol, status } = activeStep

        // The cell being processed
        if (r === currentRow && c === pCol) {
            if (status === "placing") return "bg-blue-300 ring-4 ring-blue-500"
            if (status === "safe") return "bg-green-300 ring-4 ring-green-500"
            if (status === "unsafe") return "bg-red-300 ring-4 ring-red-500"
            if (status === "backtracking") return "bg-orange-200 ring-4 ring-orange-400"
        }

        // Solution Mode
        if (status === "solution" && displayBoard[r][c] === 1) {
            return "bg-emerald-400 ring-2 ring-emerald-600"
        }

        return ""
    }

    const NQueensConcepts = (
        <div className="space-y-8">
            <Card className="bg-card shadow-md border border-border rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-foreground">
                        The N-Queens Problem
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm md:text-base">
                    <p>
                        The <strong>N-Queens problem</strong> is the challenge of placing <em>N</em> chess queens on an <em>N×N</em> chessboard so that no two queens threaten each other. This means no two queens can share the same row, column, or diagonal.
                    </p>
                    <div className="p-4 bg-muted/30 border rounded-lg shadow-sm space-y-2 mt-4">
                        <h4 className="font-semibold text-foreground text-sm">Constraint Satisfaction:</h4>
                        <p className="text-sm">It is a classic example of a <strong>Constraint Satisfaction Problem (CSP)</strong>. Instead of blindly trying every possible arrangement, we use the <strong>Backtracking</strong> algorithm to incrementally build candidates, abandoning a path the moment it violates constraints.</p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                            Backtracking Algorithm
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
                        <div className="space-y-3 mt-2">
                            <div>
                                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Step 1: Placement</h4>
                                <p className="text-xs">The algorithm attempts to place queens row by row, starting from the top. It checks each column in the current row from left to right.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Step 2: Constraint Checking</h4>
                                <p className="text-xs">Before finalizing a placement, it verifies if the cell is under attack. We only need to check the columns and diagonals <em>above</em> the current row, since no queens exist below yet.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Step 3: Backtracking</h4>
                                <p className="text-xs">If it hits a dead end (no safe cells in the current row), it undoes the previous placement, returning to the row above to try the next available column. This prunes massive branches off the decision tree.</p>
                            </div>
                        </div>

                        <div className="bg-muted/30 p-2 rounded flex items-center justify-between mt-auto">
                            <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Time Complexity:</span>
                            <Badge variant="outline" className="font-mono bg-muted/50 border-primary/20">O(N!)</Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                            Complexity Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
                        <div className="space-y-3 mt-2 text-xs">
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Theoretical Time: <code>O(N!)</code></strong> - For the first row there are N choices, for the second roughly N-1, and so on.</li>
                                <li><strong>Practical Time:</strong> Backtracking prunes the tree significantly. For example, standard brute-force on an 8x8 board requires checking 4,426,165,368 combinations. Backtracking only evaluates about 15,720 states.</li>
                                <li><strong>Space Complexity: <code>O(N)</code></strong> - Dominated by the depth of the recursion stack (which never exceeds N rows) and the array tracking board state.</li>
                                <li><strong>Finding all solutions:</strong> Even after finding a valid N-Queens configuration, the algorithm forces a backtrack to uncover all other possible valid layouts.</li>
                            </ul>
                        </div>

                        <div className="bg-muted/30 p-2 rounded flex items-center justify-between mt-auto">
                            <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Space Complexity:</span>
                            <Badge variant="outline" className="font-mono bg-muted/50 border-primary/20">O(N)</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )

    return (
        <VisualizerLayout
            title="N-Queens Visualizer"
            description="Visualize the Backtracking algorithm to solve the N-Queens problem"
            difficulty="Advanced"
            onReset={resetBoard}
            applications={[
                { title: "Constraint Satisfaction", description: "Scheduling and timetable problems", examples: ["Exam Scheduling", "Sudoku"] },
                { title: "VLSI Testing", description: "Testing chip designs", examples: ["Circuit Layouts"] },
                { title: "AI Gaming", description: "Solving puzzles and pathing", examples: ["Game Solvers"] }
            ]}
            concepts={NQueensConcepts}
        >
            <div className="flex flex-col items-center space-y-8">

                {/* Controls */}
                <div className="w-full max-w-4xl grid md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Board Size (N={n})</CardTitle></CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <Slider
                                    value={[n]} onValueChange={(v) => { if (!isPlaying) setN(v[0]) }}
                                    min={4} max={8} step={1} className="flex-1"
                                    disabled={isPlaying}
                                />
                                <span className="font-mono text-xl font-bold">{n}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Controls</CardTitle></CardHeader>
                        <CardContent className="flex items-center gap-4">
                            <Button onClick={solveNQueens} disabled={isPlaying || steps.length > 0} className="flex-1">
                                <Play className="mr-2 h-4 w-4" /> Start
                            </Button>
                            <Button variant="outline" onClick={resetBoard} className="flex-1">
                                <RotateCcw className="mr-2 h-4 w-4" /> Reset
                            </Button>
                            <div className="w-24">
                                <Slider value={speed} onValueChange={setSpeed} min={10} max={100} />
                                <div className="text-xs text-center text-muted-foreground mt-1">Speed</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Status */}
                <div className="text-center h-8 my-2">
                    {activeStep ? (
                        <span className={`text-lg font-medium px-4 py-1 rounded-full ${activeStep.status === 'solution' ? 'bg-green-100 text-green-800' :
                            activeStep.status === 'unsafe' ? 'bg-red-100 text-red-800' :
                                'bg-slate-100'
                            }`}>
                            {activeStep.description}
                        </span>
                    ) : (
                        <span className="text-muted-foreground">Select size and press Start</span>
                    )}
                </div>

                {/* Auxiliary Data: Call Stack */}
                <div className="w-full max-w-4xl">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Recursive Call Stack (Active Placements)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2 min-h-[40px] items-end bg-muted/30 p-2 rounded-md border">
                                {activeStep ? (
                                    activeStep.callStack.length === 0 ? (
                                        <span className="text-muted-foreground text-sm italic">Empty</span>
                                    ) : (
                                        activeStep.callStack.map((frame, i) => (
                                            <div key={i} className={`px-2 py-1 text-xs md:text-sm border rounded-md font-mono ${i === activeStep.callStack.length - 1 ? 'bg-purple-200 text-purple-900 border-purple-400 font-bold -translate-y-1 transition-transform' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                                                row:{frame.row},col:{frame.col}
                                            </div>
                                        ))
                                    )
                                ) : <span className="text-muted-foreground text-sm italic">Ready to start</span>}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Board */}
                <div
                    className="relative border-4 border-slate-800 rounded-lg shadow-2xl bg-white p-1"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
                        width: 'min(80vw, 500px)',
                        aspectRatio: '1/1'
                    }}
                >
                    {displayBoard.map((row, r) => (
                        row.map((cell, c) => {
                            const isBlack = (r + c) % 2 === 1
                            return (
                                <div
                                    key={`${r}-${c}`}
                                    className={`
                        relative flex items-center justify-center text-3xl md:text-5xl transition-all duration-200
                        ${isBlack ? "bg-slate-700" : "bg-slate-300"}
                        ${getCellStatusColor(r, c)}
                      `}
                                >
                                    {cell === 1 && (
                                        <Crown
                                            className="w-3/5 h-3/5 text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] fill-current animate-in zoom-in duration-300"
                                            strokeWidth={1.5}
                                        />
                                    )}
                                </div>
                            )
                        })
                    ))}
                </div>

                {/* Legend */}
                <div className="flex gap-4 text-xs md:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-400 rounded"></div> Trying</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-400 rounded"></div> Safe</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-400 rounded"></div> Unsafe</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-300 rounded"></div> Backtracking</div>
                </div>

            </div>
        </VisualizerLayout>
    )
}
