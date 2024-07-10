export interface Position {
  line: number | null;
  column: number | null;
  offset?: number;
}

export interface Range {
  start: Position;
  end?: Position;
}

export interface Cause {
  pos: number,
  loc: Position,
  raisedAt: number
}

export interface MDXErrorDetails {
  line?: number;
  column?: number;
  fatal?: boolean;
  name: string;
  message: string;
  // place used to be called 'position'
  place?: Range | Position;
  cause?: Cause;
  reason: string;
  ruleId: string;
  source: string;
  url?: string;
}
