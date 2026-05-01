"use client";

import { useState, useEffect, useRef } from "react";
import { VisualizerLayout } from "@/components/visualizer-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, FileText, Plus } from "lucide-react";

// Fallback for toast if sonner isn't used
const toast = (typeof window !== "undefined" && (window as any).toast)
  ? (window as any).toast
  : null;

interface PrintJob {
  id: number;
  name: string;
  pages: number;
  timestamp: number;
  printerId?: number;
}

type PrinterStatus = "idle" | "printing";

export default function PrintQueueVisualizerPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([
    { id: 1, name: "Report.pdf", pages: 5, timestamp: Date.now() - 30000 },
    { id: 2, name: "Invoice.docx", pages: 2, timestamp: Date.now() - 20000 },
  ]);
  const [jobName, setJobName] = useState("Homework.pdf");
  const [pages, setPages] = useState("3");
  const [printer1Status, setPrinter1Status] = useState<PrinterStatus>("idle");
  const [printer2Status, setPrinter2Status] = useState<PrinterStatus>("idle");

  const audioContextRef = useRef<AudioContext | null>(null);
  const isAudioEnabledRef = useRef(false);

  const resetQueue = () => {
    setJobs([
      { id: 1, name: "Report.pdf", pages: 5, timestamp: Date.now() - 30000 },
      { id: 2, name: "Invoice.docx", pages: 2, timestamp: Date.now() - 20000 },
    ]);
    setPrinter1Status("idle");
    setPrinter2Status("idle");
  };

  const initAudio = () => {
    if (!audioContextRef.current && typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      isAudioEnabledRef.current = true;
    }
  };

  const playPrinterSound = () => {
    if (!isAudioEnabledRef.current) return;
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.8);
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.8);
  };

  const addJob = () => {
    if (!jobName.trim()) return;
    const pageNum = Math.max(1, parseInt(pages) || 1);
    const newJob: PrintJob = {
      id: Date.now(),
      name: jobName,
      pages: pageNum,
      timestamp: Date.now(),
    };
    setJobs((prev) => [...prev, newJob]);
    setJobName("");
    setPages("1");
  };

  const assignToPrinter = (job: PrintJob) => {
    if (printer1Status === "idle") {
      setPrinter1Status("printing");
      return { ...job, printerId: 1 };
    } else if (printer2Status === "idle") {
      setPrinter2Status("printing");
      return { ...job, printerId: 2 };
    }
    return job;
  };

  const printNext = () => {
    if (jobs.length === 0 || (printer1Status === "printing" && printer2Status === "printing")) return;

    initAudio();
    playPrinterSound();

    const nextJob = jobs[0];
    const jobWithPrinter = assignToPrinter(nextJob);
    const delay = Math.min(3000, 1000 + nextJob.pages * 400);

    const completePrint = () => {
      setJobs((prev) => prev.slice(1));
      if (jobWithPrinter.printerId === 1) {
        setPrinter1Status("idle");
      } else {
        setPrinter2Status("idle");
      }
      const msg = `🖨️ ${nextJob.name} printed on Printer ${jobWithPrinter.printerId}!`;
      toast?.success?.(msg) || alert(msg);
    };

    setTimeout(completePrint, delay);
  };

  useEffect(() => {
    const input = document.getElementById("job-name") as HTMLInputElement;
    if (input) input.focus();
  }, []);

  const PrintQueueConcepts = (
    <div className="space-y-8">
      <Card className="bg-card shadow-md border border-border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            Queues in the Real World
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm md:text-base">
          <p>
            A <strong>Queue</strong> is a fundamental data structure that strictly follows the <strong>First-In, First-Out (FIFO)</strong> principle. It operates exactly like waiting in a physical line at a grocery store or a theme park: the first person to join the line is guaranteed to be the first one served.
          </p>
          <div className="p-4 bg-muted/30 border rounded-lg shadow-sm space-y-2 mt-4">
            <h4 className="font-semibold text-foreground text-sm">Key Characteristics:</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Enqueue (Push):</strong> Adding a new item. This always happens at the <em>back</em> (or tail) of the queue.</li>
              <li><strong>Dequeue (Pop):</strong> Removing and processing an item. This always happens at the <em>front</em> (or head) of the queue.</li>
              <li><strong>Fairness:</strong> Queues are inherently fair. They prevent "starvation" because every item is guaranteed to be processed in the exact order it arrived.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              Multi-Printer Environments
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
            <div className="space-y-3 mt-2">
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Shared Queue Architecture</h4>
                <p className="text-xs">In a busy office with multiple printers, sending jobs directly to a specific physical printer is inefficient. Instead, all jobs are sent to a single, centralized print queue (a print server).</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Worker Pools</h4>
                <p className="text-xs">The physical printers act as "workers." When a printer finishes its current job and becomes idle, it polls the central queue and dequeues the next available job.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Benefits</h4>
                <p className="text-xs">This architecture maximizes throughput, minimizes total wait times, and provides fault tolerance (if one printer jams, the others continue processing the queue).</p>
              </div>
            </div>

            <div className="bg-muted/30 p-2 rounded flex items-center justify-between mt-auto">
              <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Dequeue Complexity:</span>
              <Badge variant="outline" className="font-mono bg-muted/50 border-primary/20">O(1)</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-md border border-border rounded-2xl flex flex-col hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              Beyond Printers
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed space-y-4 text-sm flex-1 flex flex-col justify-between">
            <div className="space-y-3 mt-2 text-xs">
              <p>Queues are ubiquitous in software engineering, especially in distributed systems and asynchronous processing:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Message Brokers:</strong> Systems like RabbitMQ, Kafka, or AWS SQS use message queues to decouple microservices.</li>
                <li><strong>Task Scheduling:</strong> Background job processors (like Celery or Bull) enqueue tasks (e.g., sending emails, resizing images) to be handled by background workers.</li>
                <li><strong>Web Servers:</strong> Incoming HTTP requests are queued before being handed off to thread pools for processing.</li>
                <li><strong>UI Events:</strong> Mouse clicks, keyboard presses, and screen taps are placed in an "event queue" for the main thread to process sequentially.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  return (
    <VisualizerLayout
      title="🖨️ Print Job Queue (Multi-Printer)"
      description="A real-world simulation of FIFO queues using shared printers"
      difficulty="Beginner"
      onReset={resetQueue}
      complexity={{ time: "O(1)", space: "O(n)" }}
      concepts={PrintQueueConcepts}
    >
      <div className="w-full space-y-6">

        {/* Printers */}
        <div className="flex flex-wrap justify-center gap-8">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div
                className={`w-20 h-20 rounded-lg flex items-center justify-center border-2 ${printer1Status === "printing"
                  ? "border-blue-500 bg-blue-50 animate-pulse"
                  : "border-gray-300 bg-gray-100"
                  }`}
              >
                <Printer className="h-8 w-8 text-gray-700" />
              </div>
              <Badge
                variant={printer1Status === "idle" ? "outline" : "default"}
                className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs"
              >
                {printer1Status === "idle" ? "Idle" : "Printing..."}
              </Badge>
            </div>
            <span className="text-sm mt-2 text-muted-foreground">Printer 1</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="relative">
              <div
                className={`w-20 h-20 rounded-lg flex items-center justify-center border-2 ${printer2Status === "printing"
                  ? "border-green-500 bg-green-50 animate-pulse"
                  : "border-gray-300 bg-gray-100"
                  }`}
              >
                <Printer className="h-8 w-8 text-gray-700" />
              </div>
              <Badge
                variant={printer2Status === "idle" ? "outline" : "default"}
                className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs"
              >
                {printer2Status === "idle" ? "Idle" : "Printing..."}
              </Badge>
            </div>
            <span className="text-sm mt-2 text-muted-foreground">Printer 2</span>
          </div>
        </div>

        {/* Queue Visualization */}
        <div className="flex flex-wrap gap-4 justify-center min-h-[120px] items-center p-6 bg-gradient-to-br from-muted/30 to-background rounded-2xl border border-border">
          {jobs.length === 0 ? (
            <span className="text-muted-foreground italic">No print jobs queued</span>
          ) : (
            jobs.map((job, index) => (
              <div
                key={job.id}
                className={`w-28 h-32 border-2 rounded-lg flex flex-col items-center justify-center p-2 bg-card ${index === 0 ? "border-blue-500 bg-blue-50" : "border-border"
                  }`}
              >
                <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="font-medium text-sm text-center truncate w-full">{job.name}</span>
                <span className="text-xs text-muted-foreground mt-1">{job.pages} page{job.pages !== 1 ? "s" : ""}</span>
                {index === 0 && <Badge variant="outline" className="mt-2 text-xs">Next</Badge>}
              </div>
            ))
          )}
        </div>

        {/* Controls */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Print Job
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                id="job-name"
                placeholder="Document name"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Pages"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  min="1"
                  className="w-20"
                />
                <Button onClick={addJob} disabled={!jobName.trim()} className="flex-1">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print Next
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={printNext}
                disabled={jobs.length === 0 || (printer1Status === "printing" && printer2Status === "printing")}
                className="w-full"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Uses first available printer
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </VisualizerLayout>
  );
}