"use client"
import { useState, useEffect, useRef } from "react"
import { VisualizerLayout } from "../../../components/visualizer-layout"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Label } from "../../../components/ui/label"
import { Plus, Shuffle, X, Upload, Download } from "lucide-react"
import type { JSX } from "react/jsx-runtime"

interface Person {
  id: string
  name: string
  x: number
  y: number
  connections: number
  color?: string
  community?: number
  influence?: number
  betweenness?: number
  clustering?: number
}

interface Connection {
  from: string
  to: string
  weight: number
  isHighlighted?: boolean
  type?: string // 'professional' | 'personal' | 'other'
}

interface Community {
  id: number
  members: string[]
  color: string
}

type AnalysisMode = "friends" | "community" | "influence" | "advanced"

const connectionTypes = ["professional", "personal", "other"]

export default function SocialNetworkAnalyzer() {
  const [people, setPeople] = useState<Person[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [communities, setCommunities] = useState<Community[]>([])
  const [selectedPerson, setSelectedPerson] = useState<string>("")
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [influencers, setInfluencers] = useState<{ id: string; score: number }[]>([])
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("friends")
  const [networkStats, setNetworkStats] = useState({
    density: 0,
    avgClustering: 0,
    maxBetweenness: 0
  })
  const [newPersonName, setNewPersonName] = useState("")
  const [connectFrom, setConnectFrom] = useState("")
  const [connectTo, setConnectTo] = useState("")
  const [interactionWeight, setInteractionWeight] = useState("7")
  const [connectionType, setConnectionType] = useState("professional")
  const [deletePersonId, setDeletePersonId] = useState("")
  const [deleteConnFrom, setDeleteConnFrom] = useState("")
  const [deleteConnTo, setDeleteConnTo] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [draggedPersonId, setDraggedPersonId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeQueue, setActiveQueue] = useState<string[]>([])
  const analysisCounter = useRef(0)

  // Initialize sample network
  useEffect(() => {
    const samplePeople: Person[] = [
      { id: "Alice", name: "Alice", x: 200, y: 150, connections: 0 },
      { id: "Bob", name: "Bob", x: 400, y: 100, connections: 0 },
      { id: "Carol", name: "Carol", x: 600, y: 150, connections: 0 },
      { id: "David", name: "David", x: 200, y: 300, connections: 0 },
      { id: "Eve", name: "Eve", x: 400, y: 350, connections: 0 },
      { id: "Frank", name: "Frank", x: 600, y: 300, connections: 0 },
    ]
    const sampleConnections: Connection[] = [
      { from: "Alice", to: "Bob", weight: 8, type: "professional" },
      { from: "Alice", to: "David", weight: 6, type: "professional" },
      { from: "Bob", to: "Carol", weight: 9, type: "personal" },
      { from: "Bob", to: "Eve", weight: 5, type: "professional" },
      { from: "Carol", to: "Frank", weight: 7, type: "personal" },
      { from: "David", to: "Eve", weight: 8, type: "professional" },
      { from: "Eve", to: "Frank", weight: 7, type: "personal" },
    ]
    setPeople(samplePeople)
    setConnections(sampleConnections)
    setSelectedPerson("Alice")
  }, [])

  // Update connection counts and run analysis
  useEffect(() => {
    const counts = new Map<string, number>()
    connections.forEach((conn) => {
      counts.set(conn.from, (counts.get(conn.from) || 0) + 1)
      counts.set(conn.to, (counts.get(conn.to) || 0) + 1)
    })
    setPeople((prev) =>
      prev.map((p) => ({
        ...p,
        connections: counts.get(p.id) || 0,
      }))
    )
  }, [connections])

  // Run analysis when mode or selection changes
  useEffect(() => {
    setConnections((prev) => prev.map((c) => ({ ...c, isHighlighted: false })))
    if (analysisMode === "friends" && selectedPerson) {
      findFriendRecommendations(selectedPerson)
    } else if (analysisMode === "community") {
      detectCommunities()
    } else if (analysisMode === "influence") {
      calculateInfluence()
    } else if (analysisMode === "advanced") {
      calculateAdvancedMetrics()
    }
  }, [selectedPerson, analysisMode, connections.length])

  // Friend Recommendations
  const findFriendRecommendations = (personId: string) => {
    const directFriends = new Set<string>()
    const commonNeighbors = new Map<string, number>()
    connections.forEach((conn) => {
      if (conn.from === personId) directFriends.add(conn.to)
      if (conn.to === personId) directFriends.add(conn.from)
    })
    connections.forEach((conn) => {
      if (directFriends.has(conn.from) && conn.to !== personId && !directFriends.has(conn.to)) {
        commonNeighbors.set(conn.to, (commonNeighbors.get(conn.to) || 0) + 1)
      }
      if (directFriends.has(conn.to) && conn.from !== personId && !directFriends.has(conn.from)) {
        commonNeighbors.set(conn.from, (commonNeighbors.get(conn.from) || 0) + 1)
      }
    })
    const sorted = Array.from(commonNeighbors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id)
    setRecommendations(sorted)
    setConnections((prev) =>
      prev.map((c) => ({
        ...c,
        isHighlighted: sorted.includes(c.from) || sorted.includes(c.to),
      }))
    )
  }

  // Community Detection
  const detectCommunities = async () => {
    analysisCounter.current += 1
    const currentAnalysis = analysisCounter.current
    const visited = new Set<string>()
    const communitiesList: Community[] = []
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

    // Clear old state before re-running
    setPeople((prev) => prev.map((p) => ({ ...p, color: undefined, community: undefined })))
    setActiveQueue([])

    for (const person of people) {
      if (currentAnalysis !== analysisCounter.current) return;
      if (!visited.has(person.id)) {
        const community: string[] = []
        const queue = [person.id]

        while (queue.length > 0) {
          if (currentAnalysis !== analysisCounter.current) return;
          const current = queue.shift()!

          setActiveQueue([...queue])

          if (visited.has(current)) continue
          visited.add(current)
          community.push(current)

          connections.forEach((conn) => {
            if (conn.from === current && !visited.has(conn.to) && conn.weight >= 6 && !queue.includes(conn.to)) {
              queue.push(conn.to)
            }
            if (conn.to === current && !visited.has(conn.from) && conn.weight >= 6 && !queue.includes(conn.from)) {
              queue.push(conn.from)
            }
          })

          setActiveQueue([...queue])

          const currentCommunityId = communitiesList.length
          setPeople((prev) => prev.map(p => {
            if (community.includes(p.id)) return { ...p, community: currentCommunityId, color: colors[currentCommunityId % colors.length] }
            return p
          }))

          await new Promise(resolve => setTimeout(resolve, 600)) // Pause to allow UI update Queue
        }

        if (community.length > 0) {
          communitiesList.push({
            id: communitiesList.length,
            members: community,
            color: colors[communitiesList.length % colors.length],
          })
        }
      }
    }
    setActiveQueue([])
    setCommunities(communitiesList)
  }

  // Influence Calculation (PageRank)
  const calculateInfluence = () => {
    const scores = new Map<string, number>()
    people.forEach((p) => scores.set(p.id, 1.0))
    for (let i = 0; i < 10; i++) {
      const newScores = new Map<string, number>()
      people.forEach((person) => {
        let score = 0.15
        connections.forEach((conn) => {
          if (conn.to === person.id) {
            const fromConnections = connections.filter((c) => c.from === conn.from).length
            score += 0.85 * (scores.get(conn.from) || 0) * (conn.weight / 10) / Math.max(fromConnections, 1)
          }
        })
        newScores.set(person.id, score)
      })
      newScores.forEach((score, id) => scores.set(id, score))
    }
    const ranked = Array.from(scores.entries())
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score)
    setInfluencers(ranked)
    setPeople((prev) =>
      prev.map((p) => ({
        ...p,
        influence: scores.get(p.id),
      }))
    )
  }

  // Advanced Metrics Calculation
  const calculateAdvancedMetrics = () => {
    // Calculate Betweenness Centrality using Brandes algorithm
    const betweenness = new Map<string, number>()
    people.forEach(p => betweenness.set(p.id, 0))
    // For each node as source
    people.forEach(source => {
      const S: string[] = []
      const P: Record<string, string[]> = {}
      const sigma: Record<string, number> = {}
      const d: Record<string, number> = {}
      people.forEach(p => {
        P[p.id] = []
        sigma[p.id] = 0
        d[p.id] = -1
      })
      sigma[source.id] = 1
      d[source.id] = 0
      const Q: string[] = [source.id]
      while (Q.length > 0) {
        const v = Q.shift()!
        S.push(v)
        // Get neighbors
        const neighbors = connections
          .filter(c => c.from === v || c.to === v)
          .map(c => c.from === v ? c.to : c.from)
        neighbors.forEach(w => {
          if (d[w] < 0) {
            Q.push(w)
            d[w] = d[v] + 1
          }
          if (d[w] === d[v] + 1) {
            sigma[w] += sigma[v]
            P[w].push(v)
          }
        })
      }
      const delta: Record<string, number> = {}
      people.forEach(p => delta[p.id] = 0)
      while (S.length > 0) {
        const w = S.pop()!
        P[w].forEach(v => {
          const coeff = (sigma[v] / sigma[w]) * (1 + delta[w])
          delta[v] += coeff
        })
        if (w !== source.id) {
          betweenness.set(w, (betweenness.get(w) || 0) + delta[w])
        }
      }
    })
    // Normalize betweenness
    const maxB = Math.max(...Array.from(betweenness.values()))
    const normalizedBetweenness = new Map<string, number>()
    betweenness.forEach((val, key) => {
      normalizedBetweenness.set(key, maxB > 0 ? val / maxB : 0)
    })
    // Calculate Clustering Coefficient
    const clustering = new Map<string, number>()
    people.forEach(person => {
      const neighbors = connections
        .filter(c => c.from === person.id || c.to === person.id)
        .map(c => c.from === person.id ? c.to : c.from)
      if (neighbors.length < 2) {
        clustering.set(person.id, 0)
        return
      }
      let triangles = 0
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          const exists = connections.some(c =>
            (c.from === neighbors[i] && c.to === neighbors[j]) ||
            (c.from === neighbors[j] && c.to === neighbors[i])
          )
          if (exists) triangles++
        }
      }
      const possible = neighbors.length * (neighbors.length - 1) / 2
      clustering.set(person.id, possible > 0 ? triangles / possible : 0)
    })
    // Calculate Network Density
    const n = people.length
    const possibleConnections = n * (n - 1) / 2
    const density = possibleConnections > 0 ? connections.length / possibleConnections : 0
    // Update state
    setPeople(prev =>
      prev.map(p => ({
        ...p,
        betweenness: normalizedBetweenness.get(p.id) || 0,
        clustering: clustering.get(p.id) || 0
      }))
    )
    setNetworkStats({
      density,
      avgClustering: Array.from(clustering.values()).reduce((a, b) => a + b, 0) / (clustering.size || 1),
      maxBetweenness: maxB
    })
  }

  // Person Management
  const addPerson = () => {
    if (!newPersonName.trim()) return
    const id = newPersonName.trim()
    if (people.find((p) => p.id === id)) return
    const newPerson: Person = {
      id,
      name: id,
      x: Math.random() * 600 + 100,
      y: Math.random() * 300 + 50,
      connections: 0,
    }
    setPeople([...people, newPerson])
    setNewPersonName("")
  }

  const removePerson = (personId: string) => {
    setPeople(people.filter((p) => p.id !== personId))
    setConnections(connections.filter((c) => c.from !== personId && c.to !== personId))
    if (selectedPerson === personId) setSelectedPerson(people[0]?.id || "")
  }

  // Connection Management
  const addConnection = () => {
    if (!connectFrom || !connectTo || connectFrom === connectTo) return
    const parsedWeight = parseInt(interactionWeight)
    const weight = isNaN(parsedWeight) ? 5 : parsedWeight
    const exists = connections.find(
      (c) => (c.from === connectFrom && c.to === connectTo) || (c.from === connectTo && c.to === connectFrom)
    )
    if (!exists) {
      setConnections([...connections, {
        from: connectFrom,
        to: connectTo,
        weight,
        type: connectionType
      }])
      setConnectFrom("")
      setConnectTo("")
      setInteractionWeight("7")
      setConnectionType("professional")
    }
  }

  const removeConnection = (from: string, to: string) => {
    setConnections(
      connections.filter(
        (c) => !(c.from === from && c.to === to) && !(c.from === to && c.to === from)
      )
    )
  }

  // Random Network Generation
  const generateRandomNetwork = () => {
    const nodeCount = 8
    const newPeople: Person[] = []
    const newConnections: Connection[] = []
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i * 2 * Math.PI) / nodeCount
      const radius = 150
      const centerX = 400
      const centerY = 200
      newPeople.push({
        id: String.fromCharCode(65 + i),
        name: String.fromCharCode(65 + i),
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        connections: 0,
      })
    }
    for (let i = 0; i < nodeCount; i++) {
      const connectionCount = Math.floor(Math.random() * 3) + 2
      for (let j = 0; j < connectionCount; j++) {
        const targetIndex = Math.floor(Math.random() * nodeCount)
        if (targetIndex !== i) {
          const weight = Math.floor(Math.random() * 5) + 5
          const type = connectionTypes[Math.floor(Math.random() * connectionTypes.length)]
          const conn: Connection = {
            from: newPeople[i].id,
            to: newPeople[targetIndex].id,
            weight,
            type
          }
          if (!newConnections.find((e) => e.from === conn.from && e.to === conn.to)) {
            newConnections.push(conn)
          }
        }
      }
    }
    setPeople(newPeople)
    setConnections(newConnections)
    setSelectedPerson(newPeople[0]?.id || "")
  }

  // CSV Import/Export
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      parseCSV(text)
    }
    reader.readAsText(file)
  }

  const parseCSV = (csvText: string) => {
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length === 0) {
        throw new Error("Empty file");
      }
      // Parse header
      const headers = lines[0].split(',').map(h => h.trim());
      const requiredHeaders = ['person1', 'person2', 'interaction_strength'];
      // Validate headers
      if (!requiredHeaders.every(h => headers.includes(h))) {
        throw new Error(`CSV must contain headers: ${requiredHeaders.join(', ')}`);
      }
      const newPeopleMap = new Map<string, Person>();
      const newConnections: Connection[] = [];
      // Process data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = line.split(',').map(v => v.trim());
        if (values.length < 3) continue;
        const person1 = values[headers.indexOf('person1')];
        const person2 = values[headers.indexOf('person2')];
        const parsedWeight = parseInt(values[headers.indexOf('interaction_strength')]);
        const weight = isNaN(parsedWeight) ? 5 : parsedWeight;
        const type = headers.includes('type')
          ? values[headers.indexOf('type')] || 'other'
          : 'other';
        if (!person1 || !person2) continue;
        // Add people if not exists
        if (!newPeopleMap.has(person1)) {
          newPeopleMap.set(person1, {
            id: person1,
            name: person1,
            x: Math.random() * 600 + 100,
            y: Math.random() * 300 + 50,
            connections: 0
          });
        }
        if (!newPeopleMap.has(person2)) {
          newPeopleMap.set(person2, {
            id: person2,
            name: person2,
            x: Math.random() * 600 + 100,
            y: Math.random() * 300 + 50,
            connections: 0
          });
        }
        // Add connection
        newConnections.push({
          from: person1,
          to: person2,
          weight,
          type
        });
      }
      if (newPeopleMap.size === 0) {
        throw new Error("No valid data found in CSV");
      }
      setPeople(Array.from(newPeopleMap.values()));
      setConnections(newConnections);
      setSelectedPerson(Array.from(newPeopleMap.keys())[0]);
    } catch (error) {
      console.error("Error parsing CSV:", error);
      alert(`Invalid CSV format. Error: ${(error as Error).message}`);
    }
  }

  const exportCSV = () => {
    const headers = ["person1", "person2", "interaction_strength", "type"]
    const rows = connections.map(conn =>
      [conn.from, conn.to, conn.weight, conn.type || "other"].join(",")
    )
    const csvContent = [headers.join(","), ...rows].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "social_network.csv"
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  // Drag handlers
  const handleMouseDown = (personId: string, e: React.MouseEvent) => {
    const person = people.find((p) => p.id === personId)
    if (!person) return
    setIsDragging(true)
    setDraggedPersonId(personId)
    const svgRect = svgRef.current?.getBoundingClientRect()
    if (svgRect) {
      setDragOffset({
        x: e.clientX - svgRect.left - person.x,
        y: e.clientY - svgRect.top - person.y,
      })
    }
    e.preventDefault()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggedPersonId || !svgRef.current) return
    const svgRect = svgRef.current.getBoundingClientRect()
    const newX = e.clientX - svgRect.left - dragOffset.x
    const newY = e.clientY - svgRect.top - dragOffset.y
    setPeople((prev) =>
      prev.map((person) =>
        person.id === draggedPersonId
          ? { ...person, x: Math.max(30, Math.min(770, newX)), y: Math.max(30, Math.min(370, newY)) }
          : person
      )
    )
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDraggedPersonId(null)
  }

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!svgRef.current) return
        const svgRect = svgRef.current.getBoundingClientRect()
        const newX = e.clientX - svgRect.left - dragOffset.x
        const newY = e.clientY - svgRect.top - dragOffset.y
        setPeople((prev) =>
          prev.map((person) =>
            person.id === draggedPersonId
              ? { ...person, x: Math.max(30, Math.min(770, newX)), y: Math.max(30, Math.min(370, newY)) }
              : person
          )
        )
      }
      const handleGlobalMouseUp = () => {
        setIsDragging(false)
        setDraggedPersonId(null)
      }
      window.addEventListener("mousemove", handleGlobalMouseMove)
      window.addEventListener("mouseup", handleGlobalMouseUp)
      return () => {
        window.removeEventListener("mousemove", handleGlobalMouseMove)
        window.removeEventListener("mouseup", handleGlobalMouseUp)
      }
    }
  }, [isDragging, draggedPersonId, dragOffset])

  const renderNetwork = () => {
    return (
      <svg
        ref={svgRef}
        viewBox="0 0 800 400"
        className="w-full h-auto max-w-[800px] border rounded-lg bg-white"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {connections.map((conn, idx) => {
          const fromPerson = people.find((p) => p.id === conn.from)
          const toPerson = people.find((p) => p.id === conn.to)
          if (!fromPerson || !toPerson) return null
          const dx = toPerson.x - fromPerson.x
          const dy = toPerson.y - fromPerson.y
          const len = Math.sqrt(dx * dx + dy * dy)
          const normX = dx / len
          const normY = dy / len
          // Color based on connection type
          let strokeColor = "#e5e7eb"
          if (conn.type === "professional") strokeColor = "#3b82f6"
          else if (conn.type === "personal") strokeColor = "#10b981"
          else if (conn.type === "other") strokeColor = "#f59e0b"
          if (conn.isHighlighted) strokeColor = "#22c55e"
          return (
            <g key={idx}>
              <line
                x1={fromPerson.x}
                y1={fromPerson.y}
                x2={toPerson.x}
                y2={toPerson.y}
                stroke={strokeColor}
                strokeWidth={conn.isHighlighted ? "3" : "2"}
                style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
              />
              <text
                x={(fromPerson.x + toPerson.x) / 2 + 10 * -normY}
                y={(fromPerson.y + toPerson.y) / 2 + 10 * normX}
                textAnchor="middle"
                className="text-xs font-bold fill-blue-600"
                style={{ userSelect: "none" }}
              >
                {conn.weight}
              </text>
            </g>
          )
        })}
        {people.map((person) => {
          const isSelected = person.id === selectedPerson
          const isRecommended = recommendations.includes(person.id)
          const radius = 20
          let fillColor = "#ffffff"
          let strokeColor = "#6b7280"
          if (analysisMode === "community" && person.color) {
            fillColor = person.color
            strokeColor = person.color
          } else if (analysisMode === "influence" && person.influence) {
            const maxInfluence = Math.max(...people.map((p) => p.influence || 0))
            const intensity = (person.influence! / maxInfluence) * 100
            fillColor = intensity > 50 ? "#f59e0b" : "#ffffff"
            strokeColor = "#f59e0b"
          } else if (analysisMode === "advanced" && person.betweenness) {
            const intensity = person.betweenness * 100
            fillColor = `hsl(${240 - intensity * 2.4}, 70%, 60%)`
            strokeColor = "#4f46e5"
          } else if (isSelected) {
            fillColor = "#22c55e"
            strokeColor = "#16a34a"
          } else if (isRecommended) {
            fillColor = "#6366f1"
            strokeColor = "#4f46e5"
          }
          return (
            <g key={person.id}>
              <circle
                cx={person.x}
                cy={person.y}
                r={radius}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth="2"
                className="cursor-move"
                onMouseDown={(e) => handleMouseDown(person.id, e)}
                style={{ transition: "fill 0.3s, stroke 0.3s" }}
              />
              <text
                x={person.x}
                y={person.y + 5}
                textAnchor="middle"
                className="text-sm font-bold pointer-events-none"
                fill={fillColor === "#ffffff" ? "#374151" : "#ffffff"}
              >
                {person.name}
              </text>
              {analysisMode === "influence" && person.influence && (
                <text x={person.x} y={person.y - 30} textAnchor="middle" className="text-xs font-bold fill-blue-600">
                  {person.influence.toFixed(2)}
                </text>
              )}
              {analysisMode === "advanced" && (
                <g>
                  <text x={person.x} y={person.y - 30} textAnchor="middle" className="text-xs font-bold fill-purple-600">
                    B: {person.betweenness?.toFixed(2)}
                  </text>
                  <text x={person.x} y={person.y - 15} textAnchor="middle" className="text-xs font-bold fill-orange-600">
                    C: {person.clustering?.toFixed(2)}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    )
  }

  // Reset function
  const reset = () => {
    setConnections((prev) => prev.map((c) => ({ ...c, isHighlighted: false })))
    setPeople((prev) =>
      prev.map((p) => ({
        ...p,
        color: undefined,
        community: undefined,
        influence: undefined,
        betweenness: undefined,
        clustering: undefined
      }))
    )
    setRecommendations([])
    setInfluencers([])
    setCommunities([])
  }

  const modeInfo = {
    friends: { name: "Friend Recommendations", time: "O(V + E)", space: "O(V)" },
    community: { name: "Community Detection", time: "O(V + E)", space: "O(V)" },
    influence: { name: "Influence Measurement", time: "O(k·E)", space: "O(V)" },
    advanced: { name: "Advanced Metrics", time: "O(V·E)", space: "O(V²)" },
  }

  const currentMode = modeInfo[analysisMode]

  const SNAConcepts = (
    <div className="space-y-6">
      <Card className="bg-card shadow-md border border-border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            What is Social Network Analysis?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm md:text-base">
          <p>
            <strong>Social Network Analysis (SNA)</strong> is the process of investigating social structures using networks and graph theory. It characterizes networked structures in terms of <em>nodes</em> (individual actors, people, or things within the network) and the <em>ties, edges, or links</em> (relationships or interactions) that connect them.
          </p>
          <div className="p-4 bg-muted/30 border rounded-lg shadow-sm space-y-2 mt-4">
            <h4 className="font-semibold text-foreground text-sm">Real-World Examples:</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Social Media:</strong> Recommending friends (Facebook), identifying influencers (Twitter/X).</li>
              <li><strong>Epidemiology:</strong> Tracking the spread of diseases through human contact networks.</li>
              <li><strong>Fraud Detection:</strong> Uncovering organized crime rings by analyzing transaction networks between bank accounts.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-foreground">
              Core Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Density</h4>
                <p className="text-xs">The proportion of potential connections in a network that actually exist. A dense network has many connections; a sparse network has few.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Clustering Coefficient</h4>
                <p className="text-xs">A measure of the degree to which nodes in a graph tend to cluster together. High clustering implies that a person's friends are likely to be friends with each other.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Betweenness Centrality</h4>
                <p className="text-xs">Quantifies the number of times a node acts as a bridge along the shortest path between two other nodes. High betweenness indicates an individual who connects disparate groups (a "broker").</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-foreground">
              Common Algorithms
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Friend Recommendation</h4>
                <p className="text-xs">Based on <em>Triadic Closure</em>. If Alice knows Bob, and Bob knows Carol, there is a high probability Alice will know Carol. Often solved by finding common neighbors.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Community Detection</h4>
                <p className="text-xs">Finding groups of nodes that are densely connected internally but loosely connected to the rest of the network (e.g., using algorithms like Louvain or Girvan-Newman).</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Influence (PageRank)</h4>
                <p className="text-xs">Calculates the importance of a node by counting the number and quality of links to it. A node is important if it receives links from other important nodes.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <VisualizerLayout
      title="Social Network Analysis"
      description="Discover connections, communities, and influencers in social graphs with advanced metrics"
      difficulty="Intermediate"

      complexity={{
        time: currentMode.time,
        space: currentMode.space,
      }}
      applications={[]}
      concepts={SNAConcepts}
    >
      <div className="w-full space-y-6">

        <div className="flex justify-center p-4 bg-muted/10 rounded-lg">{renderNetwork()}</div>

        {/* Auxiliary Data / Metrics Visualization */}
        <Card className="border-border">
          <CardHeader className="py-3 px-4 bg-muted/30 border-b">
            <CardTitle className="text-sm font-semibold flex items-center">
              <span>
                {analysisMode === "community" && "Active Queue (BFS Community Detection)"}
                {analysisMode === "influence" && "PageRank Influence Array"}
                {analysisMode === "advanced" && "Centrality & Clustering Array"}
                {analysisMode === "friends" && "Friend Recommendations Array"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 bg-muted/10">
            <div className="w-full overflow-x-auto pb-2">
              <div className="flex items-center min-w-max">
                {analysisMode === "community" && (
                  <>
                    <span className="text-xs font-bold text-muted-foreground uppercase mr-3">Next</span>
                    <div className="flex items-center gap-2 transition-all duration-200 min-h-[40px]">
                      {activeQueue.length === 0 ? (
                        <div className="px-3 py-1 border border-dashed rounded text-xs text-muted-foreground italic">Queue Empty</div>
                      ) : (
                        activeQueue.map((id, idx) => {
                          const isTop = idx === 0
                          return (
                            <div key={`${idx}-${id}`} className="flex items-center">
                              <div className={`px-3 py-1.5 text-xs font-mono font-bold rounded shadow-sm border whitespace-nowrap ${isTop ? 'bg-blue-100 border-blue-400 text-blue-800 scale-105' : 'bg-background border-border text-foreground'}`}>
                                {id}
                              </div>
                              {idx < activeQueue.length - 1 && <div className="text-xs text-muted-foreground px-1.5">←</div>}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </>
                )}
                {analysisMode === "influence" && (
                  <div className="flex gap-2">
                    {influencers.length === 0 ? <span className="text-xs text-muted-foreground italic">Calculating...</span> :
                      influencers.map((inf, idx) => (
                        <div key={inf.id} className="flex flex-col items-center bg-background border rounded shadow-sm p-1.5 min-w-[60px]">
                          <span className="text-xs font-bold">{inf.id}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{inf.score.toFixed(2)}</span>
                        </div>
                      ))
                    }
                  </div>
                )}
                {analysisMode === "advanced" && (
                  <div className="flex gap-2">
                    {people.filter(p => p.betweenness !== undefined).length === 0 ? <span className="text-xs text-muted-foreground italic">Calculating...</span> :
                      people.map((p, idx) => (
                        <div key={p.id} className="flex flex-col items-center bg-background border rounded shadow-sm p-1.5 min-w-[80px]">
                          <span className="text-xs font-bold">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">B: {(p.betweenness || 0).toFixed(2)}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">C: {(p.clustering || 0).toFixed(2)}</span>
                        </div>
                      ))
                    }
                  </div>
                )}
                {analysisMode === "friends" && (
                  <span className="text-xs text-muted-foreground italic">Select a person to view recommendation processing.</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analysis Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={analysisMode} onValueChange={(value) => setAnalysisMode(value as AnalysisMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friends">Friend Recommendations</SelectItem>
                  <SelectItem value="community">Community Detection</SelectItem>
                  <SelectItem value="influence">Influence Measurement</SelectItem>
                  <SelectItem value="advanced">Advanced Metrics</SelectItem>
                </SelectContent>
              </Select>
              {analysisMode === "friends" && (
                <>
                  <Label>Select Person</Label>
                  <Select value={selectedPerson} onValueChange={setSelectedPerson}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {people.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Person</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Person name"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
              />
              <Button onClick={addPerson} disabled={!newPersonName} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Person
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={generateRandomNetwork} className="w-full">
                <Shuffle className="h-4 w-4 mr-2" />
                Random Network
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
                <Button onClick={exportCSV} variant="outline">
                  <Download className="h-4 w-4" />
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv"
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Connection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Select value={connectFrom} onValueChange={setConnectFrom}>
                  <SelectTrigger>
                    <SelectValue placeholder="From" />
                  </SelectTrigger>
                  <SelectContent>
                    {people.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={connectTo} onValueChange={setConnectTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="To" />
                  </SelectTrigger>
                  <SelectContent>
                    {people.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Weight"
                  value={interactionWeight}
                  onChange={(e) => setInteractionWeight(e.target.value)}
                  className="w-20"
                  min="-10"
                  max="10"
                />
                <Select value={connectionType} onValueChange={setConnectionType}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {connectionTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addConnection} disabled={!connectFrom || !connectTo}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delete Connection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Select value={deleteConnFrom} onValueChange={setDeleteConnFrom}>
                  <SelectTrigger>
                    <SelectValue placeholder="From" />
                  </SelectTrigger>
                  <SelectContent>
                    {people.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={deleteConnTo} onValueChange={setDeleteConnTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="To" />
                  </SelectTrigger>
                  <SelectContent>
                    {people.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (deleteConnFrom && deleteConnTo) {
                      removeConnection(deleteConnFrom, deleteConnTo)
                      setDeleteConnFrom("")
                      setDeleteConnTo("")
                    }
                  }}
                  disabled={!deleteConnFrom || !deleteConnTo}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Delete Person</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Select value={deletePersonId} onValueChange={setDeletePersonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deletePersonId) {
                    removePerson(deletePersonId)
                    setDeletePersonId("")
                  }
                }}
                disabled={!deletePersonId}
              >
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            {analysisMode === "friends" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Recommended friends for <strong>{selectedPerson}</strong> based on mutual connections:
                </p>
                {recommendations.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {recommendations.map((personId) => (
                      <Badge key={personId} variant="outline">
                        {personId}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recommendations available</p>
                )}
              </div>
            )}
            {analysisMode === "community" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Detected <strong>{communities.length}</strong> communities:
                </p>
                {communities.map((community) => (
                  <div key={community.id} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: community.color }} />
                    <div className="flex flex-wrap gap-1">
                      {community.members.map((memberId) => (
                        <Badge key={memberId} variant="secondary">
                          {memberId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {analysisMode === "influence" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-2">
                  Top influencers by network centrality:
                </p>
                {influencers.slice(0, 5).map((inf, idx) => (
                  <div key={inf.id} className="flex items-center justify-between p-2 bg-muted/10 rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">#{idx + 1}</Badge>
                      <span className="font-medium">{inf.id}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{inf.score.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            )}
            {analysisMode === "advanced" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted/20 p-3 rounded">
                    <div className="text-sm text-muted-foreground">Network Density</div>
                    <div className="text-xl font-bold">{networkStats.density.toFixed(3)}</div>
                  </div>
                  <div className="bg-muted/20 p-3 rounded">
                    <div className="text-sm text-muted-foreground">Avg Clustering</div>
                    <div className="text-xl font-bold">{networkStats.avgClustering.toFixed(3)}</div>
                  </div>
                  <div className="bg-muted/20 p-3 rounded">
                    <div className="text-sm text-muted-foreground">Max Betweenness</div>
                    <div className="text-xl font-bold">{networkStats.maxBetweenness.toFixed(1)}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Top connectors (Betweenness Centrality):
                  </p>
                  {people
                    .filter(p => p.betweenness !== undefined)
                    .sort((a, b) => (b.betweenness || 0) - (a.betweenness || 0))
                    .slice(0, 5)
                    .map((person, idx) => (
                      <div key={person.id} className="flex items-center justify-between p-2 bg-muted/10 rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{idx + 1}</Badge>
                          <span className="font-medium">{person.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{(person.betweenness || 0).toFixed(3)}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Network Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-accent">{people.length}</div>
                <div className="text-sm text-muted-foreground">People</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">{connections.length}</div>
                <div className="text-sm text-muted-foreground">Connections</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">
                  {(connections.reduce((sum, c) => sum + c.weight, 0) / connections.length || 0).toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Avg Strength</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">
                  {`${connections.filter(c => c.type === 'professional').length}/
                    ${connections.filter(c => c.type === 'personal').length}/
                    ${connections.filter(c => c.type === 'other').length}`.replace(/\s+/g, '')}
                </div>
                <div className="text-sm text-muted-foreground">Prof/Per/Other</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border-2 border-gray-400 rounded-full"></div>
                <span>Regular Person</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>Selected Person</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span>Recommended Friend</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span>High Influence</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                <span>High Betweenness</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                <span>High Clustering</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm mt-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-blue-500"></div>
                <span>Professional</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-green-500"></div>
                <span>Personal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-amber-500"></div>
                <span>Other</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </VisualizerLayout>
  )
}