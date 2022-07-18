// export type

import type { MDXErrorDetails } from "../../mdx-client/mdx-error-details";

const mandatoryMDXErrorDetailsFields = ['name', 'message', 'position', 'reason', 'ruleId', 'source'];

export const isMDXErrorDetails = (o: any): o is MDXErrorDetails => {
  return mandatoryMDXErrorDetailsFields.every(p => p in o);
}

export interface MDXErrorProps {
  title?: string,
  details: MDXErrorDetails
}

export const MDXError = (props: MDXErrorProps) => {
  console.dir(props);
  return <div>{props.details.message}</div>;
};
