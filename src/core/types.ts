// Observation system types
export interface Observation {
  id: string;
  sessionId: string;
  project: string;
  promptNumber: number;
  timestamp: number;
  type: string;
  title: string;
  subtitle: string;
  narrative: string;
  facts: string[];
  concepts: string[];
  filesRead: string[];
  filesModified: string[];
  toolName?: string;
  correlationId?: string;
  createdAt: number;
}

export interface CompactObservation {
  id: string;
  sessionId: string;
  project: string;
  timestamp: number;
  type: string;
  title: string;
  subtitle: string;
  facts: string[];
  concepts: string[];
  filesRead: string[];
  filesModified: string[];
}

export type PendingEventType = 'tool_use' | 'summarize';

export interface PendingEvent {
  id: string;
  sessionId: string;
  eventType: PendingEventType;
  toolName?: string;
  toolInput?: any;
  toolResponse?: string;
  cwd?: string;
  project?: string;
  timestamp: number;
  processed: boolean;
  createdAt: number;
}
