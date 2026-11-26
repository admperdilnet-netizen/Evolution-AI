/**
 * Private contract between the Evolution AI server and its self-hosted GPU worker.
 * This file is intentionally not wired into the existing production generation flow.
 */

export type EvolutionEngineJobStatus =
  | "queued"
  | "starting"
  | "running"
  | "assembling"
  | "completed"
  | "failed"
  | "cancelled";

export type EvolutionEngineAspectRatio = "9:16" | "16:9" | "1:1";

export interface EvolutionEngineGenerateRequest {
  prompt: string;
  durationSeconds: 4 | 8;
  aspectRatio: EvolutionEngineAspectRatio;
  /** Optional deterministic seed for reproducible benchmark runs. */
  seed?: number;
}

export interface EvolutionEngineJob {
  id: string;
  status: EvolutionEngineJobStatus;
  progress?: number;
  message?: string;
  resultUrl?: string;
  error?: string;
}

export interface EvolutionEngineWorkerHealth {
  status: "ready" | "busy" | "unavailable";
  model?: string;
  gpu?: string;
  vramGb?: number;
}
