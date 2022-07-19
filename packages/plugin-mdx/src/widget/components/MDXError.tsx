// export type

import type {
  MDXErrorDetails,
  Position,
} from "../../mdx-client/mdx-error-details";

const mandatoryMDXErrorDetailsFields = [
  "name",
  "message",
  "position",
  "reason",
  "ruleId",
  "source",
];
const POSITION_RE = new RegExp("\\((\\d+):(\\d+)\\-(\\d+):(\\d+)\\)$");

export const isMDXErrorDetails = (o: any): o is MDXErrorDetails => {
  return mandatoryMDXErrorDetailsFields.every((p) => p in o);
};

const getPosition = (
  reason: string
): MDXErrorDetails["position"] | undefined => {
  const match = reason.match(POSITION_RE);
  if (match) {
    return {
      start: {
        line: parseInt(match[1], 10),
        column: parseInt(match[2], 10),
      },
      end: {
        line: parseInt(match[3], 10),
        column: parseInt(match[4], 10),
      },
    };
  }
  return undefined;
};

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

export interface MDXErrorProps {
  fatal?: boolean,
  mdx?: string;
  title?: string;
  details: MDXErrorDetails;
}

export const extractPosition = (
  mdx: string,
  reason: string
): MDXErrorDetails["position"] | undefined => {
  const position = getPosition(reason);
  if (position) {
    if (typeof position.start.offset !== "number") {
      position.start.offset = positionToOffset(mdx, position.start);
    }
    if (typeof position.end.offset !== "number") {
      position.end.offset = positionToOffset(mdx, position.end);
    }
  }
  return position;
};

export const MDXError = (props: MDXErrorProps) => {
  // compile errors don't get the position recorded in the `position` field,
  // but it's included in the `reason` field.
  if (props.mdx && props.details.position.start.line === null) {
    const newPosition = extractPosition(props.mdx, props.details.reason);
    if (newPosition) {
      props.details.position = newPosition;
    }
  }
  console.dir(props);
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
      {props.details.position.start.line && (
        <>On line {props.details.position.start.line} column {props.details.position.start.column || 0}: </>
      )}
      {props.details.message}{" "}
      {props.details.url && (<a href={props.details.url} rel="noopener noreferrer" target="_blank">See explanation.</a>)}
      </div>
      {props.mdx && (
        <code>
          {props.mdx.substring(
            props.details.position.start.offset ?? 0,
            props.details.position.end.offset
          )}
        </code>
      )}
    </div>
  );
};
