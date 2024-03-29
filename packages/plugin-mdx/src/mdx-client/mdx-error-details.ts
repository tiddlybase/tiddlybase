export interface Position {
  line: number | null;
  column: number | null;
  offset?: number;
}

export interface MDXErrorDetails {
  line?: number;
  column?: number;
  fatal?: boolean;
  name: string;
  message: string;
  position: {
    start: Position;
    end: Position;
  };
  reason: string;
  ruleId: string;
  source: string;
  url?: string;
}
