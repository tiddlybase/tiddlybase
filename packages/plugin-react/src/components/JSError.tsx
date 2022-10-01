export interface JSErrorProps {
  title?: string,
  error:Error
}

export const JSError = (props:JSErrorProps) => {
  console.dir(props)
  const title = props.title || "Javascript error"
  return (
    <div style={{
      border: '1px solid #eee',
      borderLeftColor: '#eb4747',
      backgroundColor: 'rgb(220 59 59 / 51%)',
      padding: '20px',
      margin: '20px 0',
      borderLeftWidth: '5px',
      borderRadius: '3px'
    }}>
      <h3>{title }</h3>
      <div>
      {props.error.message}{" "}
      </div>
      {props.error.stack && (
        <pre>{props.error.stack}</pre>
      )}
    </div>
  );
  return (<div>{props.error.message}</div>);
}

export const errorMsg = (message: string, title?:string, name?:string) => JSError({
  title: title ?? 'Error rendering react component',
  error: { name: name ?? 'react-wrapper-error', message }
});
