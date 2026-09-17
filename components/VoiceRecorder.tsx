"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_RECORDING_SECONDS } from "@/lib/validation";

type RecorderStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "recorded"
  | "unsupported"
  | "permission-denied"
  | "error";

interface VoiceRecorderProps {
  error?: string;
  onChange: (file: File | null, durationSeconds: number) => void;
}

const CANDIDATE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

function pickSupportedMimeType(): string | null {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return null;
  for (const type of CANDIDATE_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function VoiceRecorder({ error, onChange }: VoiceRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");
  // Mirrors `elapsed` outside React state so the onstop handler can read the
  // final value directly, instead of reaching for it inside a setState
  // updater (which runs during VoiceRecorder's render and must stay pure —
  // calling the parent's onChange/setState from in there is not allowed).
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (pickSupportedMimeType() === null) {
      setStatus("unsupported");
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    setStatus("requesting");

    const supportedType = pickSupportedMimeType();
    if (supportedType === null) {
      setStatus("unsupported");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = supportedType || undefined;
      mimeTypeRef.current = mimeType || "audio/webm";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stopTimer();
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        const url = URL.createObjectURL(blob);
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });

        const finalElapsed = elapsedRef.current;
        setDuration(finalElapsed);
        const ext = extensionForMimeType(mimeTypeRef.current);
        const file = new File([blob], `voice-note.${ext}`, { type: mimeTypeRef.current });
        onChange(file, finalElapsed);

        setStatus("recorded");
      };

      recorder.start();
      setStatus("recording");
      elapsedRef.current = 0;
      setElapsed(0);

      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= MAX_RECORDING_SECONDS) {
          stopRecording();
        }
      }, 1000);
    } catch (err) {
      console.error("Microphone access failed", err);
      const isPermissionError =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      setStatus(isPermissionError ? "permission-denied" : "error");
      setErrorMessage(
        isPermissionError
          ? "Microphone access was denied. Please allow microphone permission in your browser settings and try again."
          : "We couldn't access your microphone. Please check your device and try again."
      );
    }
  }, [onChange, stopRecording, stopTimer]);

  function handleRecordAgain() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    elapsedRef.current = 0;
    setElapsed(0);
    setDuration(0);
    setStatus("idle");
    onChange(null, 0);
  }

  if (status === "unsupported") {
    return (
      <div
        role="alert"
        className="rounded-lg border border-elevacx-required bg-elevacx-inputBg px-4 py-3 text-sm text-elevacx-required"
      >
        Your browser doesn&apos;t support in-browser audio recording. Please try the latest
        version of Chrome, Firefox, Edge, or Safari.
      </div>
    );
  }

  return (
    <div>
      {status === "idle" && (
        <button
          type="button"
          onClick={startRecording}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-elevacx-accent-gradient px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
        >
          🎙️ Start Recording
        </button>
      )}

      {status === "requesting" && (
        <p className="text-sm text-elevacx-placeholder">Requesting microphone permission...</p>
      )}

      {status === "recording" && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-elevacx-text">
            Recording... {formatTime(elapsed)} / {formatTime(MAX_RECORDING_SECONDS)}
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-elevacx-inputBg">
            <div
              className="h-full bg-elevacx-accentFrom transition-all"
              style={{ width: `${Math.min((elapsed / MAX_RECORDING_SECONDS) * 100, 100)}%` }}
            />
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-elevacx-required px-4 py-3 text-sm font-semibold text-elevacx-required transition-colors hover:bg-elevacx-required hover:text-white sm:w-auto"
          >
            ⏹️ Stop Recording
          </button>
        </div>
      )}

      {status === "recorded" && audioUrl && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-elevacx-text">
            Recording: {formatTime(duration)} / {formatTime(MAX_RECORDING_SECONDS)}
          </p>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio src={audioUrl} controls className="w-full" />
          <button
            type="button"
            onClick={handleRecordAgain}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-elevacx-panelBorder px-4 py-3 text-sm font-semibold text-elevacx-panelBorder transition-colors hover:bg-elevacx-panelBorder hover:text-elevacx-panel sm:w-auto"
          >
            🗑️ Record Again
          </button>
        </div>
      )}

      {(status === "permission-denied" || status === "error") && (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-elevacx-required">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={startRecording}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-elevacx-accent-gradient px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
          >
            🎙️ Try Again
          </button>
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-2 flex items-center gap-1 text-sm text-elevacx-required">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      ) : null}
    </div>
  );
}
