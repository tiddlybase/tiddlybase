const TestComponent = (props: Record<string, string>) => (
  <pre>{JSON.stringify(props, Object.keys(props).sort())}</pre>
);

export { TestComponent };
