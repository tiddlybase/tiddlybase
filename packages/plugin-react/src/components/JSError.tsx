export interface JSErrorProps {
  title?: string,
  error:Error
}

export const JSError = (props:JSErrorProps) => {
  console.dir(props)
  return (<div>{props.error.message}</div>);
}

