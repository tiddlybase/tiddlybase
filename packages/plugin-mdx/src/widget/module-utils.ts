import type { MDXModuleLoader } from './mdx-module-loader';

export const depthFirstSearch = <T>(getChildren:(node:T)=>Set<T>, currentNode: T, visited: Set<T>=new Set<T>([])) => {
  visited.add(currentNode);
  for (let child of getChildren(currentNode)) {
    if (!visited.has(child)) {
      depthFirstSearch(getChildren, child, visited);
    }
  }
  return visited;
};

// NOTE: includes the module itself in the set of consumers
export const getTransitiveMDXModuleConsumers = (moduleName:string, loader:MDXModuleLoader, visited: Set<string>=new Set<string>([])): Set<string> => {
    if (loader.hasModule(moduleName)) {
      return depthFirstSearch(
        (moduleName:string) => loader.getConsumers(moduleName),
        moduleName,
        visited);
    }
    return visited;
  }

// NOTE: includes the module itself in the set of consumers
export const getTransitiveMDXModuleDependencies = (moduleName:string, loader:MDXModuleLoader, visited: Set<string>=new Set<string>([])): Set<string> => {
  if (loader.hasModule(moduleName)) {
    return depthFirstSearch(
      (moduleName:string) => loader.getDependencies(moduleName) ?? new Set<string>([]),
      moduleName,
      visited);
  }
  return visited;
}
