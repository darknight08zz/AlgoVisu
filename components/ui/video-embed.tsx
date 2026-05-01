"use client";

import { useState } from "react";
import { PlayCircle, X } from "lucide-react";
import { Button } from "./button";

interface VideoEmbedProps {
    youtubeId: string;
    title?: string;
}

export function VideoEmbed({ youtubeId, title = "Explanation Video" }: VideoEmbedProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) {
        return (
            <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2 py-6 border-dashed hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => setIsOpen(true)}
            >
                <PlayCircle className="w-5 h-5 text-primary" />
                <span className="font-semibold text-muted-foreground">{title}</span>
            </Button>
        );
    }

    return (
        <div className="w-full bg-slate-950 rounded-xl overflow-hidden border shadow-lg relative h-[250px] sm:h-[300px] md:h-[400px]">
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70 rounded-full w-8 h-8"
                onClick={() => setIsOpen(false)}
                title="Close Video"
            >
                <X className="w-4 h-4" />
            </Button>
            <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                title={title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
            ></iframe>
        </div>
    );
}
