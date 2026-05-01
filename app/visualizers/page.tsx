import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import Link from "next/link";
import Header from "@/components/header";
import {
  Play,
  BarChart3,
  GitBranch,
  Layers,
  Network,
  Music,
  Zap,
  Sigma,
  Printer,
  Search,
  Shuffle,
  FolderTree,
  Trophy,
  TrendingUp,
  ArrowLeft,
  Crown,
  ChartBar,
} from "lucide-react";
import Footer from "@/components/Footer";

const VisualizersPage = () => {
  const visualizers = [
    {
      id: "array",
      title: "Array Visualizer",
      description: "Interactive array operations and basic algorithms",
      icon: <BarChart3 className="h-6 w-6" />,
      difficulty: "Beginner",
      topics: ["Arrays", "Linear Search", "Binary Search"],
      available: true,
      type: "visualizer",
    },
    {
      id: "stack",
      title: "Stack Visualizer",
      description: "LIFO operations with push, pop, and peek",
      icon: <Layers className="h-6 w-6" />,
      difficulty: "Beginner",
      topics: ["Stack", "LIFO", "Expression Evaluation"],
      available: true,
      type: "visualizer",
    },
    {
      id: "queue",
      title: "Queue Visualizer",
      description: "FIFO operations with push, pop, and peek",
      icon: <Layers className="h-6 w-6" />,
      difficulty: "Beginner",
      topics: ["Queue", "FIFO", "Expression Evaluation"],
      available: true,
      type: "visualizer",
    },
    {
      id: "sorting",
      title: "Sorting Algorithms",
      description: "Compare different sorting algorithms side by side",
      icon: <Shuffle className="h-6 w-6" />,
      difficulty: "Intermediate",
      topics: ["Bubble Sort", "Selection Sort", "Insertion Sort"],
      available: true,
      type: "visualizer",
    },
    {
      id: "hash-table",
      title: "Hash Table Visualizer",
      description:
        "Explore key-value storage, hash functions, and collision resolution strategies like chaining and open addressing",
      icon: <Sigma className="h-6 w-6" />,
      difficulty: "Intermediate",
      topics: ["Hashing", "Collision Resolution", "Chaining"],
      available: true,
      type: "visualizer",
    },
    {
      id: "linked-list",
      title: "Linked List Visualizer",
      description: "Single, doubly, and circular linked lists",
      icon: <Network className="h-6 w-6" />,
      difficulty: "Advanced",
      topics: ["Single", "Double", "Circular"],
      available: true,
      type: "visualizer",
    },
    {
      id: "tree",
      title: "Tree Visualizer",
      description: "Binary trees and Binary Search Trees",
      icon: <GitBranch className="h-6 w-6" />,
      difficulty: "Intermediate",
      topics: ["Binary Tree", "BST", "Traversals", "Insert/Delete"],
      available: true,
      type: "visualizer",
    },
    {
      id: "trie",
      title: "Trie Visualizer",
      description:
        "Visualize prefix trees used in autocomplete, spell checkers, and IP routing with dynamic insertion and search",
      icon: <Search className="h-6 w-6" />,
      difficulty: "Intermediate",
      topics: ["Trie", "Prefix Search", "Autocomplete"],
      available: true,
      type: "visualizer",
    },
    {
      id: "heap",
      title: "Heap Visualizer",
      description:
        "Understand min-heaps and max-heaps, heapify operations, and priority queue implementations",
      icon: <BarChart3 className="h-6 w-6" />,
      difficulty: "Intermediate",
      topics: [
        "Min-Heap",
        "Max-Heap",
        "Heapify",
        "Priority Queue",
        "Heap Sort",
      ],
      available: true,
      type: "visualizer",
    },
    {
      id: "pathfinding",
      title: "Pathfinding Visualizer",
      description: "Visualize pathfinding algorithms like A*, Dijkstra, and BFS on an interactive grid",
      icon: <Network className="h-6 w-6" />,
      difficulty: "Advanced",
      topics: ["A* Search", "Dijkstra", "BFS", "Grid Search"],
      available: true,
      type: "visualizer",
    },
    {
      id: "n-queens",
      title: "N-Queens Visualizer",
      description: "Visualize Backtracking by solving the N-Queens problem on a dynamic board",
      icon: <Crown className="h-6 w-6" />,
      difficulty: "Advanced",
      topics: ["Backtracking", "Recursion", "Constraint Satisfaction"],
      available: true,
      type: "visualizer",
    },
    {
      id: "sorting-race",
      title: "Sorting Race Mode",
      description: "Compare sorting algorithms side-by-side to visualize time complexity differences",
      icon: <Trophy className="h-6 w-6" />,
      difficulty: "Intermediate",
      topics: ["Time Complexity", "Big O", "Algorithm Comparison"],
      available: true,
      type: "visualizer",
    },
    {
      id: "graph",
      title: "Graph Algorithms",
      description: "BFS, DFS, shortest path algorithms",
      icon: <Network className="h-6 w-6" />,
      difficulty: "Advanced",
      topics: ["BFS", "DFS", "Graph Traversal", "Shortest Path"],
      available: true,
      type: "visualizer",
    },
    {
      id: "mst",
      title: "Minimum Spanning Tree Visualizer",
      description: "Kruskal's and Prim's algorithms",
      icon: <Network className="h-6 w-6" />,
      difficulty: "Advanced",
      topics: ["Kruskal's", "Prim's"],
      available: true,
      type: "visualizer",
    },
    {
      id: "avl",
      title: "AVL Tree Visualizer",
      description:
        "Self-balancing binary search trees with automatic rotations to maintain O(log n) height",
      icon: <GitBranch className="h-6 w-6" />,
      difficulty: "Advanced",
      topics: [
        "AVL Tree",
        "Tree Rotations",
        "Balance Factor",
        "Self-Balancing BST",
      ],
      available: true,
      type: "visualizer",
    },

    /** -------------------- Applications (with mapping) -------------------- **/
    {
      id: "sna",
      title: "Social Network Analyzer",
      description: "Real-world applications and case studies",
      icon: <Network className="h-6 w-6" />,
      difficulty: "Advanced",
      topics: ["Real-World", "Case Studies"],
      available: true,
      type: "application",
      relatedTo: ["graph"],
    },
    {
      id: "navigation-system",
      title: "Navigation System Analyzer",
      description: "Real-world applications and case studies",
      icon: <Network className="h-6 w-6" />,
      difficulty: "Advanced",
      topics: ["Real-World", "Case Studies"],
      available: true,
      type: "application",
      relatedTo: ["graph"],
    },
    {
      id: "music-playlist",
      title: "Music Playlist Manager",
      description:
        "How linked lists enable dynamic song insertion, deletion, and seamless looping in music apps",
      icon: <Music className="h-6 w-6" />,
      difficulty: "Intermediate",
      topics: ["Real-World", "Media Apps", "User Experience"],
      available: true,
      type: "application",
      relatedTo: ["linked-list"],
    },
    {
      id: "lru-cache",
      title: "LRU Cache Simulator",
      description:
        "How doubly linked lists + hash maps enable O(1) caching in systems like Redis and browsers",
      icon: <Zap className="h-6 w-6" />,
      difficulty: "Advanced",
      topics: ["Systems Design", "Caching", "Performance"],
      available: true,
      type: "application",
      relatedTo: ["linked-list"],
    },
    {
      id: "mst-clustering",
      title: "MST Clustering Visualizer",
      description:
        "How Minimum Spanning Trees enable single-linkage hierarchical clustering and outlier detection in data",
      icon: <GitBranch className="h-6 w-6" />,
      difficulty: "Intermediate",
      topics: ["Clustering", "Graph Algorithms", "Data Analysis"],
      available: true,
      type: "application",
      relatedTo: ["mst"],
    },
    {
      id: "prefix-search-visualizer",
      title: "Prefix Search Visualizer",
      description:
        "How linear search over arrays powers real-time autocomplete systems in search engines, IDEs, and command-line tools",
      icon: <Search className="h-6 w-6" />,
      difficulty: "Beginner",
      topics: ["String Algorithms", "User Experience", "Data Structures"],
      available: true,
      type: "application",
      relatedTo: ["array"],
    },
    {
      id: "print-queue",
      title: "Print Job Queue Visualizer",
      description:
        "How linear (FIFO) queues manage document printing order in operating systems, ensuring fair and sequential processing in shared printers",
      icon: <Printer className="h-6 w-6" />,
      difficulty: "Beginner",
      topics: ["Queues", "Operating Systems", "Real-World Algorithms"],
      available: true,
      type: "application",
      relatedTo: ["queue"],
    },
    {
      id: "file-system-explorer",
      title: "File System & Folder Explorer",
      description:
        "Model hierarchical file systems as trees: navigate folders, create/move/delete nodes, and understand traversals and path operations.",
      icon: <FolderTree className="h-6 w-6" />,
      difficulty: "Intermediate",
      topics: ["Hierarchy", "Tree Traversal", "Paths", "CRUD on Nodes"],
      available: true,
      type: "application",
      relatedTo: ["tree"],
    },
    {
      id: "ecommerce-ranking",
      title: "E-Commerce Ranking",
      description:
        "Understand how products are sorted dynamically by price, date, ratings, or popularity in online marketplaces.",
      icon: <TrendingUp className="h-6 w-6" />,
      difficulty: "Intermediate",
      topics: [
        "Sorting",
        "Ranking Systems",
        "Custom Comparators",
        "User Experience",
      ],
      available: true,
      type: "application",
      relatedTo: ["sorting"],
    },
    {
      id: "performance-benchmark",
      title: "Performance Benchmark",
      description:
        "Upload a dataset and compare the performance, execution time, and total operations of two algorithms side-by-side.",
      icon: <ChartBar className="h-6 w-6" />,
      difficulty: "Advanced",
      topics: [
        "Time Complexity",
        "Empirical Analysis",
        "Big O",
        "Testing",
      ],
      available: true,
      type: "application",
      relatedTo: ["sorting", "sorting-race"],
    },

    {
      id: "realtime-leaderboard",
      title: "Real-Time Leaderboards (Ordered Inserts)",
      description:
        "Use AVL rotations to maintain a sorted scoreboard with fast inserts, deletes, and rank queries",
      icon: <Trophy className="h-6 w-6" />,
      difficulty: "Advanced",
      topics: ["AVL Tree", "Rotations", "Order Statistics", "Rank Queries"],
      available: true,
      type: "application",
      relatedTo: ["avl"],
    },
  ] as any[];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-100 text-green-800";
      case "Intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "Advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Group visualizers by structure type
  const linearVisualizers = visualizers
    .filter((v) => v.type === "visualizer")
    .filter((v) =>
      [
        "array",
        "stack",
        "queue",
        "sorting",
        "hash-table",
        "linked-list",
        "sorting-race",
      ].includes(v.id)
    );

  const nonLinearVisualizers = visualizers
    .filter((v) => v.type === "visualizer")
    .filter((v) =>
      ["tree", "avl", "trie", "graph", "mst", "heap", "pathfinding", "n-queens"].includes(v.id)
    );

  // Build visualizer meta for easy lookup
  const visualizerMeta = Object.fromEntries(
    [...linearVisualizers, ...nonLinearVisualizers].map((v) => [
      v.id,
      { title: v.title, icon: v.icon },
    ])
  );

  // Group applications under their related visualizers
  const applications = visualizers.filter(
    (v) => v.type === "application"
  ) as Array<(typeof visualizers)[number] & { relatedTo: string[] }>;

  const appsByVisualizer: Record<string, typeof applications> = {};
  for (const app of applications) {
    for (const vid of app.relatedTo) {
      if (!appsByVisualizer[vid]) appsByVisualizer[vid] = [];
      appsByVisualizer[vid].push(app);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {/* <Header /> */}

      <main className="container mx-auto px-4 py-6 max-w-[80rem]">
        <div className="my-8 mb-16">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              aria-label="Back to Home"
              className={[
                // neo-brutalism: chunky borders + offset shadow
                "relative inline-flex items-center gap-2 px-3 py-2",
                "bg-card text-card-foreground border-4 border-foreground/50 dark:border-border",
                "shadow-[6px_6px_0_0_hsl(var(--foreground))] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))]",
                "active:shadow-[2px_2px_0_0_hsl(var(--foreground))]",
                "transition-all",
                "rounded-none",                // square look
                "hover:translate-x-[2px] hover:translate-y-[2px]",
                "active:translate-x-[4px] active:translate-y-[4px]",
                "select-none"
              ].join(" ")}
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-extrabold tracking-wide uppercase">
                Back
              </span>
            </Link>

            <h1 className="text-5xl font-bold">
              Choose Your Learning Path
            </h1>
          </div>

          <p className="text-primary text-lg mt-3">
            Select a visualizer to start exploring data structures and algorithms interactively
          </p>
        </div>

        <div className="space-y-12">
          {/* Visualizers Section - Split into Linear & Non-Linear */}
          <div>
            <h2 className="text-3xl font-bold mb-6 text-primary flex items-center">
              <BarChart3 className="h-8 w-8 mr-2" />
              Data Structure Visualizers
            </h2>

            <div className="flex flex-col gap-4">
              {/* Linear Data Structures */}
              <div className="mb-12 mt-2">
                <h3 className="text-2xl font-semibold mb-6 text-primary flex items-center">
                  <Layers className="h-6 w-6 mr-2" />
                  Linear Data Structures
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {linearVisualizers.map((visualizer) => (
                    <Card
                      key={visualizer.id}
                      className={`relative bg-sky-400 rounded border-4 border-primary ${!visualizer.available
                        ? "opacity-60"
                        : "hover:shadow-lg transition-shadow"
                        }`}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-neutral-200 rounded-lg flex items-center justify-center text-primary">
                              {visualizer.icon}
                            </div>
                            <div className="">
                              <CardTitle className="text-lg text-black">
                                {visualizer.title}
                              </CardTitle>
                              <Badge
                                className={`text-xs mt-1 border border-primary pointer-events-none ${getDifficultyColor(
                                  visualizer.difficulty
                                )}`}
                              >
                                {visualizer.difficulty}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="mb-4 font-medium text-black/80">
                          {visualizer.description}
                        </CardDescription>
                        <div className="flex flex-wrap gap-1 mb-4">
                          {visualizer.topics.map((topic, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs border-2 border-primary rounded bg-orange-50"
                            >
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter>
                        {visualizer.available ? (
                          <Button asChild className="w-full">
                            <Link href={`/visualizers/${visualizer.id}`}>
                              <Play className="h-4 w-4 mr-2" />
                              Start Learning
                            </Link>
                          </Button>
                        ) : (
                          <Button disabled className="w-full">
                            Coming Soon
                          </Button>
                        )}
                      </CardFooter>

                      {!visualizer.available && (
                        <div className="absolute inset-0 bg-background/50 rounded-lg flex items-center justify-center">
                          <h1 className="-rotate-45 font-extrabold text-muted-foreground text-4xl">
                            Coming Soon
                          </h1>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>

              {/* Non-Linear Data Structures */}
              <div>
                <h3 className="text-2xl font-semibold mb-4 text-primary flex items-center">
                  <GitBranch className="h-6 w-6 mr-2" />
                  Non-Linear Data Structures
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {nonLinearVisualizers.map((visualizer) => (
                    <Card
                      key={visualizer.id}
                      className={`relative bg-orange-200 rounded border-4 border-primary ${!visualizer.available
                        ? "opacity-60"
                        : "hover:shadow-lg transition-shadow"
                        }`}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-neutral-200 rounded-lg flex items-center justify-center text-primary">
                              {visualizer.icon}
                            </div>
                            <div>
                              <CardTitle className="text-lg text-primary">
                                {visualizer.title}
                              </CardTitle>
                              <Badge
                                className={`text-xs mt-1 border border-primary pointer-events-none ${getDifficultyColor(
                                  visualizer.difficulty
                                )}`}
                              >
                                {visualizer.difficulty}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="mb-4 font-medium text-black/80">
                          {visualizer.description}
                        </CardDescription>
                        <div className="flex flex-wrap gap-1 mb-4">
                          {visualizer.topics.map((topic, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs border-2 border-primary rounded bg-orange-50"
                            >
                              {topic}
                            </Badge>
                          ))}
                        </div>
                        {visualizer.available ? (
                          <Button asChild className="w-full">
                            <Link href={`/visualizers/${visualizer.id}`}>
                              <Play className="h-4 w-4 mr-2" />
                              Start Learning
                            </Link>
                          </Button>
                        ) : (
                          <Button disabled className="w-full">
                            Coming Soon
                          </Button>
                        )}
                      </CardContent>
                      {!visualizer.available && (
                        <div className="absolute inset-0 bg-background/50 rounded-lg flex items-center justify-center">
                          <h1 className="-rotate-45 font-extrabold text-muted-foreground text-4xl">
                            Coming Soon
                          </h1>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* Applications by Visualizer (grouped view) */}
            <div className="mt-12">
              <h2 className="text-3xl font-bold mb-6 text-primary flex items-center">
                <Layers className="h-8 w-8 mr-2" />
                Applications by Visualizer
              </h2>

              <div className="space-y-10">
                {Object.entries(appsByVisualizer).map(([vizId, apps]) => {
                  const viz = visualizerMeta[vizId];
                  if (!viz) return null;
                  return (
                    <div key={vizId}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-8 w-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                          {viz.icon}
                        </div>
                        <Link
                          href={`/visualizers/${vizId}`}
                          className="text-2xl font-semibold text-primary hover:underline"
                        >
                          {viz.title}
                        </Link>
                      </div>

                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {apps.map((visualizer) => (
                          <Card
                            key={visualizer.id}
                            className={`relative bg-[#23A094] rounded border-4 border-primary ${!visualizer.available
                              ? "opacity-60"
                              : "hover:shadow-lg transition-shadow"
                              }`}
                          >
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 bg-neutral-200 rounded-lg flex items-center justify-center text-primary">
                                    {visualizer.icon}
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg text-black">
                                      {visualizer.title}
                                    </CardTitle>
                                    <Badge
                                      className={`text-xs mt-1 border border-black/20 text-black pointer-events-none ${getDifficultyColor(
                                        visualizer.difficulty
                                      )}`}
                                    >
                                      {visualizer.difficulty}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <CardDescription className="mb-4 font-medium text-black/80">
                                {visualizer.description}
                              </CardDescription>
                              <div className="flex flex-wrap gap-1 mb-4">
                                {visualizer.topics.map((topic, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-xs border-black/20 text-black rounded bg-white/50"
                                  >
                                    {topic}
                                  </Badge>
                                ))}
                              </div>

                              {visualizer.available ? (
                                <Button asChild className="w-full">
                                  <Link href={`/visualizers/${visualizer.id}`}>
                                    <Play className="h-4 w-4 mr-2" />
                                    Start Learning
                                  </Link>
                                </Button>
                              ) : (
                                <Button disabled className="w-full">
                                  Coming Soon
                                </Button>
                              )}
                            </CardContent>
                            {!visualizer.available && (
                              <div className="absolute inset-0 bg-background/50 rounded-lg flex items-center justify-center">
                                <h1 className="-rotate-45 font-extrabold text-muted-foreground text-4xl">
                                  Coming Soon
                                </h1>
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="text-4xl mt-8 py-8 text-center w-full font-semibold">
          and more coming soon...
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VisualizersPage;
