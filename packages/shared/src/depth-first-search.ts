export const depthFirstSearch = async <T>(getChildren: (node: T) => Promise<Set<T>>, currentNode: T, visited: Set<T> = new Set<T>([])) => {
  visited.add(currentNode);
  for (let child of await getChildren(currentNode)) {
    if (!visited.has(child)) {
      await depthFirstSearch(getChildren, child, visited);
    }
  }
  return visited;
};
