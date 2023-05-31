import type { MDXModuleLoader, ModuleSet } from './mdx-module-loader';

export const depthFirstSearch = async <T>(getChildren:(node:T)=>Promise<Set<T>>, currentNode: T, visited: Set<T>=new Set<T>([])) => {
  visited.add(currentNode);
  for (let child of await getChildren(currentNode)) {
    if (!visited.has(child)) {
      await depthFirstSearch(getChildren, child, visited);
    }
  }
  return visited;
};

// NOTE: includes the module itself in the set of consumers
export const getTransitiveMDXModuleDependencies = async (moduleName:string, loader:MDXModuleLoader, visited: Set<string>=new Set<string>([])): Promise<ModuleSet> => {
  if (await loader.hasModule(moduleName)) {
    return await depthFirstSearch(
      (moduleName:string) => loader.getDependencies(moduleName),
      moduleName,
      visited);
  }
  return visited;
}
