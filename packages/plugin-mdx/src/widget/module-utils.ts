import type {PatchedModules} from '@tiddlybase/plugin-init/src/patched-modules';

export const getPatchedModules = (modules:$tw.TW5Modules=$tw.modules):PatchedModules|undefined => {
  if ('isPatched' in modules) {
    return (modules as PatchedModules);
  }
  return undefined;
}

export const getModuleDependencies = (modules:$tw.TW5Modules=$tw.modules, moduleName:string):Set<string> => {
  const maybeModuleInfo = modules.titles[moduleName];
  if (maybeModuleInfo) {
    return getPatchedModules(modules)?.getAllModulesRequiredBy(moduleName) ?? maybeModuleInfo.requires ?? new Set<string>([]);
  }
  return new Set<string>([]);
}
