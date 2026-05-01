import { useState, useEffect, useCallback, useRef } from 'react';

export function useAudioNarration() {
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Initialize
    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            synthRef.current = window.speechSynthesis;

            // Load preference from localStorage
            const savedPreference = localStorage.getItem('algovisu-audio-enabled');
            if (savedPreference !== null) {
                setIsAudioEnabled(savedPreference === 'true');
            }
        }

        return () => {
            // Clean up on unmount
            if (synthRef.current) {
                synthRef.current.cancel();
            }
        };
    }, []);

    const toggleAudio = useCallback(() => {
        setIsAudioEnabled((prev) => {
            const newVal = !prev;
            localStorage.setItem('algovisu-audio-enabled', newVal.toString());
            if (!newVal && synthRef.current) {
                synthRef.current.cancel(); // Stop playing immediately if disabled
            }
            return newVal;
        });
    }, []);

    const announce = useCallback((text: string | null | undefined) => {
        if (!text || !isAudioEnabled || !synthRef.current) return;

        // Stop any currently playing audio
        synthRef.current.cancel();

        // Create a new utterance
        const utterance = new SpeechSynthesisUtterance(text);

        // Customize voice (optional)
        // utterance.rate = 1.0;
        // utterance.pitch = 1.0;

        currentUtteranceRef.current = utterance;
        synthRef.current.speak(utterance);
    }, [isAudioEnabled]);

    const stop = useCallback(() => {
        if (synthRef.current) {
            synthRef.current.cancel();
        }
    }, []);

    return {
        isAudioEnabled,
        toggleAudio,
        announce,
        stop
    };
}
