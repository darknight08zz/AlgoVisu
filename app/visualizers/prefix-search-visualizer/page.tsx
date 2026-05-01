"use client"

import { useState, useEffect, useCallback } from "react"
import { VisualizerLayout } from "../../../components/visualizer-layout"
import { Input } from "../../../components/ui/input"
import { Button } from "../../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { Search, Plus, Trash2, List, Eye } from "lucide-react"
import { Label } from "../../../components/ui/label"
import { Switch } from "../../../components/ui/switch"

interface WordElement {
  word: string
  index: number
  isMatch?: boolean
}

const DEFAULT_WORDS: WordElement[] = [
  { word: "apple", index: 0 },
  { word: "application", index: 1 },
  { word: "banana", index: 2 },
  { word: "apply", index: 3 },
  { word: "appreciate", index: 4 },
  { word: "orange", index: 5 },
  { word: "apricot", index: 6 },
  { word: "grape", index: 7 },
]

export default function PrefixSearchVisualizerPage() {
  const [words, setWords] = useState<WordElement[]>(DEFAULT_WORDS)
  const [query, setQuery] = useState("")
  const [steps, setSteps] = useState<string[]>([])
  const [matchCount, setMatchCount] = useState(0)
  const [newWord, setNewWord] = useState("")
  const [bulkInput, setBulkInput] = useState("")
  const [isCaseSensitive, setIsCaseSensitive] = useState(false)

  const resetHighlights = useCallback((wordList: WordElement[]): WordElement[] => {
    return wordList.map(w => ({ ...w, isMatch: false }))
  }, [])

  const performSearch = useCallback(() => {
    const prefix = query.trim()
    if (prefix === "") {
      setWords(prev => resetHighlights(prev))
      setSteps(["Enter a prefix to begin search..."])
      setMatchCount(0)
      return
    }

    let newSteps: string[] = []
    let matches = 0

    newSteps.push(
      isCaseSensitive
        ? `🔍 Case-sensitive search for words starting with "${prefix}"...`
        : `🔍 Searching for words starting with "${prefix}" (case-insensitive)...`
    )

    const updatedWords = words.map(wordObj => {
      let isMatch = false
      if (isCaseSensitive) {
        isMatch = wordObj.word.startsWith(prefix)
      } else {
        isMatch = wordObj.word.toLowerCase().startsWith(prefix.toLowerCase())
      }

      if (isMatch) {
        matches++
        newSteps.push(`✅ Match: "${wordObj.word}"`)
      }
      return { ...wordObj, isMatch }
    })

    newSteps.push(`📊 Found ${matches} matching word(s).`)
    setWords(updatedWords)
    setSteps(newSteps)
    setMatchCount(matches)
  }, [query, words, isCaseSensitive, resetHighlights])

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch()
    }, 300)
    return () => clearTimeout(timer)
  }, [query, isCaseSensitive, performSearch])

  const addWord = () => {
    const cleanWord = newWord.trim()
    if (cleanWord === "") return

    const newElement: WordElement = {
      word: cleanWord,
      index: words.length,
    }

    setWords(prev => [...prev, newElement])
    setNewWord("")
    if (query) setTimeout(() => performSearch(), 100)
  }

  const removeWord = (indexToRemove: number) => {
    const filtered = words.filter((_, i) => i !== indexToRemove)
    const reindexed = filtered.map((w, idx) => ({ ...w, index: idx }))
    setWords(reindexed)
    if (query) setTimeout(() => performSearch(), 100)
  }

  const resetToDefault = () => {
    setWords(DEFAULT_WORDS)
    setQuery("")
    setSteps(["Enter a prefix to begin search..."])
    setMatchCount(0)
    setBulkInput("")
  }

  const importBulkWords = () => {
    if (!bulkInput.trim()) return

    // Split by comma, newline, or space (robust parsing)
    const separators = /[,;\n\t ]+/
    const rawWords = bulkInput
      .split(separators)
      .map(w => w.trim())
      .filter(w => w !== "")

    if (rawWords.length === 0) return

    const newWords = rawWords.map((word, idx) => ({
      word,
      index: words.length + idx,
    }))

    setWords(prev => [...prev, ...newWords])
    setBulkInput("")
    if (query) setTimeout(() => performSearch(), 100)
  }

  const PrefixSearchConcepts = (
    <div className="space-y-6">
      <Card className="bg-card shadow-md border border-border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            Prefix Search & Autocomplete
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm md:text-base">
          <p>
            <strong>Prefix Search</strong> is the foundational mechanic behind almost every "typeahead" or autocomplete feature you use daily—from Google Search suggestions to your IDE's Intellisense, to finding a friend in your contact list. The goal is simple: given a dataset of strings, instantly find all entries that begin with a specific sequence of characters (the <em>Prefix</em>).
          </p>
          <div className="p-4 bg-muted/30 border rounded-lg shadow-sm space-y-2 mt-4">
            <h4 className="font-semibold text-foreground text-sm">Real-World Examples:</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Search Engines:</strong> Typing "how to ti" immediately suggests "how to tie a tie".</li>
              <li><strong>Code Editors (IDE):</strong> Typing <code>docu</code> suggests <code>document.getElementById</code>.</li>
              <li><strong>E-commerce:</strong> Typing "lap" suggests laptops, lapel pins, etc.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <List className="w-5 h-5 text-primary" />
              Naïve Approach (Linear Scan)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
            <p className="text-xs">
              This visualizer demonstrates the simplest, most direct method. It is highly effective and widely used for small datasets (like a dropdown of 50 countries or a handful of UI elements).
            </p>
            <div className="space-y-3 mt-2">
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">How it works:</h4>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>Takes the user's input prefix.</li>
                  <li>Iterates through <em>every single word</em> in the unorganized array one by one.</li>
                  <li>Checks if the word starts with the prefix (e.g., using <code>.startsWith()</code>).</li>
                </ul>
              </div>
              <div className="bg-muted/30 p-2 rounded">
                <h4 className="font-semibold text-red-600 dark:text-red-400 mb-1 text-[11px] uppercase tracking-wider">Complexity: O(n × m)</h4>
                <p className="text-[10px] leading-tight mt-1 text-muted-foreground">
                  Where <code>n</code> is the total number of words in the dataset, and <code>m</code> is the length of the requested prefix. If you have 1 million words, you have to check all 1 million words every single time the user types a keystroke.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Advanced Approach (Tries)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
            <p className="text-xs">
              For massive scale applications, checking every word via Linear Scan is catastrophically slow. Instead, modern systems organize data into complex structures ahead of time.
            </p>

            <div className="space-y-3 mt-2">
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">The Solution:</h4>
                <p className="text-xs">
                  Systems use a <strong>Trie (Prefix Tree)</strong>. A Trie pre-processes strings into a character tree. When a user types "app", the system simply walks down the 'a' → 'p' → 'p' branch, and instantly retrieves all words below that node.
                </p>
              </div>
              <div className="bg-muted/30 p-2 rounded">
                <h4 className="font-semibold text-green-600 dark:text-green-400 mb-1 text-[11px] uppercase tracking-wider">Complexity: O(m)</h4>
                <p className="text-[10px] leading-tight mt-1 text-muted-foreground">
                  Searching depends <em>only</em> on <code>m</code> (the length of the prefix). Whether your dictionary has 10 words or 10 billion words, finding words that start with "app" takes exactly 3 character checks.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 bg-primary/10 border border-primary/20 p-4 rounded-lg flex items-center justify-between">
        <p className="text-sm font-medium text-primary">Curious how the advanced O(m) method works?</p>
        <a href="/visualizers/trie" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-2">
            View Trie Visualizer
          </Button>
        </a>
      </div>
    </div>
  );

  return (
    <VisualizerLayout
      title="Prefix Search Visualizer"
      description="See how autocomplete systems suggest words in real-time as you type"
      difficulty="Beginner"
      complexity={{
        time: "O(n × m)",
        space: "O(k)",
      }}
      concepts={PrefixSearchConcepts}
    >
      <div className="w-full space-y-8">
        {/* Top Controls: Add, Bulk Import, Search */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Add Single Word */}
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Word
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="e.g., react"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addWord()}
                />
                <Button onClick={addWord} disabled={!newWord.trim()}>
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Import */}
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <List className="h-4 w-4" />
                Bulk Import
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="text"
                placeholder="apple, banana, cherry"
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && importBulkWords()}
              />
              <Button onClick={importBulkWords} disabled={!bulkInput.trim()} className="w-full">
                Import Words
              </Button>
              <p className="text-xs text-muted-foreground">
                Separate words by commas, spaces, or new lines.
              </p>
            </CardContent>
          </Card>

          {/* Search + Case Toggle */}
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="text"
                placeholder="e.g., 'App'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="text-lg py-5 px-4"
                aria-label="Type a prefix to search"
              />
              <div className="flex items-center justify-between">
                <Label htmlFor="case-sensitive" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Case-Sensitive
                </Label>
                <Switch
                  id="case-sensitive"
                  checked={isCaseSensitive}
                  onCheckedChange={setIsCaseSensitive}
                />
              </div>
              <Button variant="outline" size="sm" onClick={resetToDefault} className="w-full mt-2">
                Reset to Default
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Word Visualization */}
        <div className="flex flex-wrap justify-center gap-4 min-h-[180px] items-center p-6 bg-gradient-to-br from-muted/30 to-background rounded-2xl border border-border">
          {words.length === 0 ? (
            <p className="text-muted-foreground italic text-lg">No words in the list</p>
          ) : (
            words.map((wordObj) => (
              <div key={wordObj.index} className="relative group">
                <div
                  className={`
                    w-32 h-28 md:w-36 md:h-32 border-2 rounded-xl flex items-center justify-center
                    transition-all duration-300 shadow-sm text-center p-3
                    ${wordObj.isMatch
                      ? "bg-blue-100 border-blue-500 text-blue-900 font-bold shadow-md scale-[1.03]"
                      : "bg-background border-border text-foreground hover:border-primary/50"
                    }
                  `}
                >
                  <span className="font-medium break-words">{wordObj.word}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute -top-2 -right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background border rounded-full"
                  onClick={() => removeWord(wordObj.index)}
                  aria-label={`Remove word "${wordObj.word}"`}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Execution Steps */}
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Search Results
              {matchCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {matchCount} match{matchCount !== 1 ? "es" : ""}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto p-2">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg text-sm bg-background border border-border"
                >
                  <Badge variant="outline" className="mr-2">
                    {index + 1}
                  </Badge>
                  {step}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </VisualizerLayout>
  )
}