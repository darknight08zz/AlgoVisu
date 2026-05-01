"use client";

import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Separator } from "../components/ui/separator";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Settings,
  Clock,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import Header from "../components/header";
import { FaGithub } from "react-icons/fa";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";


interface VisualizerLayoutProps {
  title: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  children: ReactNode;
  isPlaying?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onStepBack?: () => void;
  onStepForward?: () => void;
  onReset?: () => void;
  currentStep?: number;
  totalSteps?: number;
  complexity?: {
    time: string;
    space: string;
  };
  applications?: Array<{
    title: string;
    description: string;
    examples: string[];
  }>;
  concepts?: ReactNode;
  defaultTab?: "visualize" | "concepts";
}

export function VisualizerLayout({
  title,
  description,
  difficulty,
  children,
  isPlaying = false,
  onPlay,
  onPause,
  onStepBack,
  onStepForward,
  onReset,
  currentStep = 0,
  totalSteps = 0,
  complexity,
  applications = [],
  concepts,
  defaultTab = "visualize",
}: VisualizerLayoutProps) {
  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "Beginner":
        return "bg-green-100 text-green-800 border-green-200";
      case "Intermediate":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Advanced":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // ✅ NEW: Check if algorithm controls should be shown
  const hasAlgorithmControls = !!(
    onPlay &&
    onPause &&
    onStepBack &&
    onStepForward &&
    onReset
  );
  const progressPercentage =
    totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Enhanced Header */}
      <header className="py-4 mb-4 backdrop-blur-md z-50 shadow-sm bg-green-400">
        <div className="container mx-auto px-4 py-4 max-w-[95rem]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-10">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="hover:bg-orange-50 hover:scale-120 hover:text-primary "
              >
                <Link href="/visualizers">
                  <ArrowLeft strokeWidth="2px" size="30" className="h-6 w-6 " />
                </Link>
              </Button>

              <div>
                <div className="flex gap-4">
                  <h1 className="text-xl font-bold text-foreground">{title}</h1>
                  {/* <Badge
                    className={`text-xs border ${getDifficultyColor(
                      difficulty
                    )}`}
                  >
                    {difficulty}
                  </Badge> */}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-primary">{description}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative -top-1 h-12 w-40 rounded-xl bg-black dark:bg-white">
                <Link
                  href="https://github.com/darknight08zz/AlgoVisu"
                  className="absolute inset-0 border-2 bg-white dark:bg-black dark:text-white dark:border-white border-black hover:-top-1 hover:-left-0.5 rounded-xl flex h-full w-full items-center justify-center z-50 transition-all"
                >
                  <FaGithub className="h-6 w-6 mr-4" />
                  <span className="font-semibold">Contribute</span>
                </Link>
              </div>

            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-[85rem] pb-16 ">
        <div className="grid lg:grid-cols-4 gap-6 ">
          {/* Main Visualization Area */}
          <div className="lg:col-span-3 ">
            <Tabs defaultValue={defaultTab} className="w-full">
              {concepts && (
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-6">
                  <TabsTrigger value="visualize" className="text-sm font-semibold">Visualization</TabsTrigger>
                  <TabsTrigger value="concepts" className="text-sm font-semibold">Learn Concepts</TabsTrigger>
                </TabsList>
              )}

              <TabsContent value="visualize" className="mt-0 space-y-6">
                {/* Enhanced Visualization Card */}
                <Card className="shadow-lg bg-[#C2C9FF] backdrop-blur-sm border-2 border-primary rounded">
                  <CardContent className="p-0 ">
                    {/* Progress Bar — only show if steps exist AND algorithm controls are active */}
                    {hasAlgorithmControls && totalSteps > 0 && (
                      <div className="px-6 pt-6 pb-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">
                            Progress
                          </span>
                          <span className="text-sm font-mono text-foreground">
                            {currentStep}/{totalSteps}
                          </span>
                        </div>
                        <Progress value={progressPercentage} className="h-2" />
                      </div>
                    )}

                    {/* Visualization Canvas */}
                    <div className="py-2">
                      <div className=" rounded p-6 min-h-[400px] flex items-center justify-center ">
                        {children}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ✅ Conditionally render Algorithm Controls */}
                {hasAlgorithmControls && (
                  <Card className="shadow-lg bg-card backdrop-blur-sm border-2 border-primary rounded">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Play className="h-5 w-5 text-blue-600" />
                        Algorithm Controls
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center gap-3 mb-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onStepBack}
                          disabled={currentStep === 0}
                          className="hover:bg-blue-50 disabled:opacity-50  border-2 border-primary bg-transparent"
                        >
                          <SkipBack className="h-4 w-4" />
                        </Button>
                        {isPlaying ? (
                          <Button
                            onClick={onPause}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 shadow-md"
                          >
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </Button>
                        ) : (
                          <Button
                            onClick={onPlay}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 shadow-md"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Play
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onStepForward}
                          disabled={currentStep >= totalSteps}
                          className="hover:bg-blue-50 border-2 border-primary disabled:opacity-50"
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onReset}
                          className="hover:bg-red-50 hover:border-red-200 border-2 border-primary hover:text-red-600 bg-transparent"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Status Indicator */}
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-sm border-border border">
                          <div
                            className={`w-2 h-2 rounded-full ${isPlaying
                              ? "bg-green-500 animate-pulse"
                              : "bg-gray-400"
                              }`}
                          ></div>
                          {isPlaying ? "Running" : "Paused"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {concepts && (
                <TabsContent value="concepts" className="mt-0">
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {concepts}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* Enhanced Sidebar */}
          <div className="space-y-6">
            {/* Complexity Analysis */}
            {complexity && (
              <Card className="shadow-lg bg-yellow-200 backdrop-blur-sm border-2 border-primary rounded">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2 text-black">
                    <Zap className="h-5 w-5 text-yellow-600" />
                    Complexity Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-100">
                    <div className="flex items-center gap-2 mb-1 ">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Time Complexity
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="font-mono text-blue-700 bg-blue-50 border-blue-200"
                    >
                      {complexity.time}
                    </Badge>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">
                        Space Complexity
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="font-mono text-green-700 bg-green-50 border-green-200"
                    >
                      {complexity.space}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Algorithm Steps — only show if controls exist */}
            {hasAlgorithmControls && (
              <Card className="shadow-lg bg-red-200 backdrop-blur-sm border-2 border-primary rounded">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg text-black">Algorithm Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-black/80 p-3 bg-white/70 rounded-lg border-2 border-white/50">
                    Step-by-step explanation will appear here as you progress
                    through the algorithm.
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Real-world Applications */}
            {applications.length > 0 && (
              <Card className="shadow-lg bg-sky-300 backdrop-blur-sm border-2 border-primary rounded">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg text-black">
                    Real-world Applications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {applications.map((app, index) => (
                    <div key={index}>
                      <div className="py-4 bg-muted/40 px-4 rounded-xl border border-border">
                        <h4 className="font-semibold text-sm mb-2 text-blue-900">
                          {app.title}
                        </h4>
                        <p className="text-xs text-black/80 mb-3 leading-relaxed">
                          {app.description}
                        </p>
                        <div className="space-y-1">
                          {app.examples.map((example, exIndex) => (
                            <div
                              key={exIndex}
                              className="text-xs bg-white/80 rounded-md px-3 py-1.5 border border-slate-200 text-slate-700"
                            >
                              {example}
                            </div>
                          ))}
                        </div>
                      </div>
                      {index < applications.length - 1 && (
                        <Separator className="mt-4 bg-neutral-800" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
