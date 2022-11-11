/// <reference types="@tiddlybase/tw5-types/src/tw5" />
import { patchedEvalGlobal } from './patched-eval-global';

const breadthFirstSearch = <T>(previousLevel: Set<T>, getParents:(node:T)=>Set<T>): Set<T> => {
  if (previousLevel.size === 0) {
    return previousLevel;
  }
  const nextLevel = new Set<T>([]);
  for (let node of previousLevel) {
    getParents(node).forEach(n => {
      if (!previousLevel.has(n)) {
        nextLevel.add(n)
      }
    });
  }
  return new Set<T>([...previousLevel, ...nextLevel, ...(breadthFirstSearch(nextLevel, getParents))]);
};

const depthFirstSearch = <T>(currentNode: T, visited: Set<T>, getParents:(node:T)=>Set<T>) => {
  visited.add(currentNode);
  for (let parent of getParents(currentNode)) {
    if (!visited.has(parent)) {
      depthFirstSearch(parent, visited, getParents);
    }
  }
  return visited;
};

export class PatchedModules implements $tw.TW5Modules {
  titles: Record<string, $tw.TW5Module> = {};
  types: Partial<Record<$tw.ModuleType, Record<string, $tw.TW5Module>>> = {};

  constructor(titles?: Record<string, $tw.TW5Module>, types?: Partial<Record<$tw.ModuleType, Record<string, $tw.TW5Module>>>) {
    Object.assign(this.titles, titles);
    Object.assign(this.types, types);
    // preventExtensions prevents boot/boot.js from overriding class methods with its own version.
    Object.preventExtensions(this);
  }

  invalidateModuleExports(moduleName: string): void {
    if (this.titles[moduleName]) {
      this.titles[moduleName].exports = undefined;
    }
  }

  getModulesRequiring(moduleName: string): Set<string> {
    return Object.entries(this.titles[moduleName] ? this.titles : {}).reduce((consumerSet, [title, moduleInfo]) => {
      if (moduleInfo?.requires?.has(moduleName)) {
        consumerSet.add(title);
      }
      return consumerSet;
    }, new Set<string>([]));
  }

  getModulesRequiredBy(moduleName: string): Set<string> {
    return this.titles[moduleName]?.requires ?? new Set<string>([]);
  }

  getAllModulesRequiring(moduleName:string): Set<string> {
    const moduleSet = breadthFirstSearch(new Set<string>([moduleName]), this.getModulesRequiring.bind(this));
    moduleSet.delete(moduleName);
    return moduleSet;
  }

  getAllModulesRequiredBy(moduleName:string): Set<string> {
    const moduleSet = depthFirstSearch(moduleName, new Set<string>([]), this.getModulesRequiredBy.bind(this));
    moduleSet.delete(moduleName);
    return moduleSet;
  }

  normalizeModuleName(moduleName: string, moduleRoot?: string): string {
    let name = moduleName;
    if (moduleName.charAt(0) === ".") {
      name = $tw.utils.resolvePath(moduleName, moduleRoot);
    }
    if (!this.titles[name]) {
      if (this.titles[name + ".js"]) {
        name = name + ".js";
      } else if (this.titles[name + "/index.js"]) {
        name = name + "/index.js";
      } else if (this.titles[moduleName]) {
        name = moduleName;
      } else if (this.titles[moduleName + ".js"]) {
        name = moduleName + ".js";
      } else if (this.titles[moduleName + "/index.js"]) {
        name = moduleName + "/index.js";
      }
    }
    return name;
  }

  define(moduleName: string, moduleType: $tw.ModuleType, definition: $tw.ModuleExports | string) {
    // Create the moduleInfo
    var moduleInfo: $tw.TW5Module = {
      moduleType: moduleType,
      definition: definition,
      exports: undefined,
      requires: new Set<string>([])
    };
    // If the definition is already an object we can use it as the exports
    if (typeof definition === "object") {
      moduleInfo.exports = definition;
    }
    // Store the module in the titles hashmap
    /*
    if (moduleName in this.titles) {
      console.log("Warning: Redefined module - " + moduleName);
    }
    */
    this.titles[moduleName] = moduleInfo;
    // Store the module in the types hashmap
    let modulesOfType: Record<string, $tw.TW5Module> | undefined = this.types[moduleType];

    if (!modulesOfType) {
      this.types[moduleType] = modulesOfType = {};
    }
    /*
    if (moduleName in modulesOfType) {
      console.log("Warning: Redefined module - " + moduleName);
    }
    */
    modulesOfType[moduleName] = moduleInfo;
  }

  execute(moduleName: string, moduleRoot?: string): $tw.ModuleExports {
    const name = this.normalizeModuleName(moduleName, moduleRoot);
    const moduleInfo = this.titles[name];
    const tiddler = $tw.wiki.getTiddler(name);
    if (!moduleInfo) {
      // nodejs and browser require() fallback not supported
      throw "Cannot find module named '" + moduleName + "' required by module '" + moduleRoot + "', resolved to " + name;
    }
    if (moduleInfo.exports) {
      return moduleInfo.exports;
    }

    const _exports = {};
    const sandbox = {
      module: { exports: _exports },
      //moduleInfo: moduleInfo,
      exports: _exports,
      console: console,
      setInterval: setInterval,
      clearInterval: clearInterval,
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      Buffer: $tw.browser ? undefined : Buffer,
      $tw: $tw,
      require: (title: string): $tw.ModuleExports | undefined => {
        // name refers to the name of the parent module,
        // title is the name of the module it requires
        const normalizedName = this.normalizeModuleName(title, name);
        moduleInfo.requires?.add(normalizedName);
        return this.execute(normalizedName, name);
      }
    };

    Object.defineProperty(sandbox.module, "id", {
      value: name,
      writable: false,
      enumerable: true,
      configurable: false
    });


    /*
    CommonJS optional require.main property:
     In a browser we offer a fake main module which points back to the boot function
     (Theoretically, this may allow TW to eventually load itself as a module in the browser)
    */
    Object.defineProperty(sandbox.require, "main", {
      value: (typeof (require) !== "undefined") ? require.main : { TiddlyWiki: $tw },
      writable: false,
      enumerable: true,
      configurable: false
    });

    // Execute the module if we haven't already done so
    if (!moduleInfo.exports) {
      try {
        // Check the type of the definition
        if (typeof moduleInfo.definition === "function") { // Function
          moduleInfo.exports = _exports;
          moduleInfo.definition(moduleInfo, moduleInfo.exports, sandbox.require);
        } else if (typeof moduleInfo.definition === "string") { // String
          moduleInfo.exports = _exports;
          patchedEvalGlobal(moduleInfo.definition, sandbox, tiddler?.fields?.title ?? name);
          if (sandbox.module.exports) {
            moduleInfo.exports = sandbox.module.exports; //more codemirror workaround
          }
        } else { // Object
          moduleInfo.exports = moduleInfo.definition;
        }
      } catch (e) {
        if (e instanceof SyntaxError) {
          var line = (e as any).lineNumber || (e as any).line; // Firefox || Safari
          if (typeof (line) != "undefined" && line !== null) {
            $tw.utils.error("Syntax error in boot module " + name + ":" + line + ":\n" + e.stack);
          } else if (!$tw.browser) {
            // this is the only way to get node.js to display the line at which the syntax error appeared,
            // and $tw.utils.error would exit anyway
            // cf. https://bugs.chromium.org/p/v8/issues/detail?id=2589
            throw e;
          } else {
            // Opera: line number is included in e.message
            // Chrome/IE: there's currently no way to get the line number
            $tw.utils.error("Syntax error in boot module " + name + ": " + e.message + "\n" + e.stack);
          }
        } else {
          // line number should be included in e.stack for runtime errors
          $tw.utils.error("Error executing boot module " + name + ": " + JSON.stringify(e) + "\n\n" + (e as any).stack);
        }
      }
    }
    // Return the exports of the module
    return moduleInfo.exports!;
  }

  /*
  Apply a callback to each module of a particular type
      moduleType: type of modules to enumerate
      callback: function called as callback(title,moduleExports) for each module
  */
  forEachModuleOfType(moduleType: $tw.ModuleType, callback: (title: string, exports: $tw.ModuleExports) => void): any {
    Object.keys(this.types[moduleType] ?? {}).forEach(title => callback(title, this.execute(title)));
  }

  /*
  Get all the modules of a particular type in a hashmap by their `name` field
  */
  getModulesByTypeAsHashmap(moduleType: $tw.ModuleType, nameField?: string): Record<string, $tw.ModuleExports> {
    const name = nameField || "name";
    var results = Object.create(null);
    this.forEachModuleOfType(moduleType, function (_title, module) {
      results[module[name]] = module;
    });
    return results;
  }

  /*
  Apply the exports of the modules of a particular type to a target object
  */
  applyMethods(moduleType: $tw.ModuleType, targetObject: any): any {
    if (!targetObject) {
      targetObject = Object.create(null);
    }
    this.forEachModuleOfType(moduleType, (_title, module) => {
      Object.assign(targetObject, module);
    });
    return targetObject;
  }

  /*
  Return a class created from a modules. The module should export the properties to be added to those of the optional base class
  */
  createClassFromModule(moduleExports: $tw.ModuleExports, baseClass: $tw.ClassConstructor) {
    var newClass = function () { };
    if (baseClass) {
      newClass.prototype = new baseClass();
      newClass.prototype.constructor = baseClass;
    }
    Object.assign(newClass.prototype, moduleExports);
    return newClass;
  }

  createClassesFromModules(moduleType: $tw.ModuleType, subType: string, baseClass: $tw.ClassConstructor): any {
    var classes = Object.create(null);
    this.forEachModuleOfType(moduleType, (_title, moduleExports) => {
      if (!subType || moduleExports.types[subType]) {
        classes[moduleExports.name] = this.createClassFromModule(moduleExports, baseClass);
      }
    });
    return classes;
  }

}
