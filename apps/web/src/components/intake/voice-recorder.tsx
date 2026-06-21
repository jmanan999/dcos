"use client";

import { useState, useRef } from "react";
import { Mic, Square, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@dcos/ui";

type Status = "idle" | "recording" | "transcribing" | "done" | "error";

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  language?: string;
}

export default function VoiceRecorder({ onTranscription }: VoiceRecorderProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  async function startRecording() {
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorder.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunks.current, { type: mime });
        if (blob.size < 100) {
          setStatus("error");
          setErrorMsg("Recording too short — please try again");
          return;
        }
        transcribe(blob);
      };

      recorder.start();
      setStatus("recording");
    } catch (err: unknown) {
      setStatus("error");
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setErrorMsg("Microphone access denied — please allow in browser settings");
      } else {
        setErrorMsg("Could not start recording");
      }
    }
  }

  function stopRecording() {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
    }
  }

  async function transcribe(blob: Blob) {
    setStatus("transcribing");
    try {
      const token = localStorage.getItem("dcos_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const form = new FormData();
      form.append("file", blob, "recording.webm");

      const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${base}/api/v1/intake/transcribe`, {
        method: "POST",
        headers,
        body: form,
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || `Server error (${res.status})`);
      }

      const data = await res.json();
      onTranscription(data.text);
      setStatus("done");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Transcription failed");
    }
  }

  function reset() {
    setStatus("idle");
    setErrorMsg("");
  }

  if (status === "done") {
    return (
      <div className="flex items-center gap-2 text-sm text-success">
        <Check className="h-4 w-4" />
        <span>Voice transcribed</span>
        <button
          onClick={reset}
          className="ml-auto text-xs text-muted-foreground underline hover:text-foreground"
        >
          Record again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {status === "idle" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startRecording}
            className="gap-2"
          >
            <Mic className="h-4 w-4" />
            Record voice
          </Button>
        )}

        {status === "recording" && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90"
          >
            <Square className="h-4 w-4 fill-current" />
            <span className="animate-pulse">Recording… tap to stop</span>
          </button>
        )}

        {status === "transcribing" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Transcribing…
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
            <button
              onClick={reset}
              className="ml-auto text-xs underline hover:text-foreground"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
