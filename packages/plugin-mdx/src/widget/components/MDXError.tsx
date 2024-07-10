// export type

import type {
  MDXErrorDetails,
  Position,
  Range
} from "../../mdx-client/mdx-error-details";

export interface MDXErrorProps {
  fatal?: boolean,
  mdx?: string;
  title?: string;
  details: MDXErrorDetails;
}

const positionToOffset = (fullText: string, pos: Position): number => {
  const lines = fullText.split("\n");
  let offset = 0;
  // add the length of all previous lines
  for (let i = 0; i < (pos.line || 0) - 1; i++) {
    offset += lines[i].length + 1;
  }
  offset += (pos.column || 0) - 1;
  return offset;
};

export const extractErrorCause = (range: Range, fullMDXSource:string): string => {
  const startOffset = positionToOffset(fullMDXSource, range.start)
  const endOffset = range.end ? positionToOffset(fullMDXSource, range.end) : fullMDXSource.length
  return fullMDXSource.substring(
    startOffset,
    endOffset
  ).trim();
}

export const extractErrorRange = (
  errorDetails: MDXErrorDetails
): Range => {
  /**
   * Extract a (start, end?) range from the errorDetails object.
   */
  // Simple case, we have start and maybe end in errorDetails.place
  if (errorDetails.place && ('start' in errorDetails.place)) {
    return {
      start: errorDetails.place.start,
      // end might be undefined, that's OK
      end: errorDetails.place.end,
    };
  }
  // 'place' may also be a Position, in this case that will be the start of the
  // Range.
  if (errorDetails.place && ('line' in errorDetails.place)) {
    return {start: errorDetails.place};
  }

  // We don't know where the error is, so the range is the whole mdx text
  return {start: {column: 0, line: 0, offset: 0}}
};

export const parseError = (err: MDXErrorProps) => {
  const range = extractErrorRange(err.details);
  const cause = err.mdx ? extractErrorCause(range, err.mdx) : null;
  return {range, cause}
}

export const MDXError = (props: MDXErrorProps) => {
  const {range, cause} = parseError(props);
  const title = props.title ?? props.details.ruleId
  return (
    <div style={{
      border: '1px solid #eee',
      borderLeftColor: props.fatal ? '#eb4747' : '#eb9f47',
      backgroundColor: props.fatal ? 'rgb(220 59 59 / 51%)' : 'rgb(220 158 86 / 51%)',
      padding: '20px',
      margin: '20px 0',
      borderLeftWidth: '5px',
      borderRadius: '3px'
    }}>
      {title && (<h3>{title }</h3>)}
      <div>
      On line {range.start.line} column {range.start.column}:
      {props.details.message}{" "}
      {props.details.url && (<a href={props.details.url} rel="noopener noreferrer" target="_blank">See explanation.</a>)}
      </div>
      {cause && (
        <code>
          {cause}
        </code>
      )}
    </div>
  );
};
