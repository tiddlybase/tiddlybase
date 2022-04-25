import TestRenderer from 'react-test-renderer';

// test renderer docs: https://reactjs.org/docs/test-renderer.html
export const renderToAST = (component: any) => TestRenderer.create(component).toJSON();
