/// <reference types="@tiddlybase/tw5-types/src/tw5" />
import { patchedEvalGlobal } from './patched-eval-global';

export class PatchedModules implements $tw.TW5Modules {
  titles: Record<string, $tw.TW5Module>;
  types: Partial<Record<$tw.ModuleType, Record<string, $tw.TW5Module>>>;

  constructor(titles?: Record<string, $tw.TW5Module>, types?: Partial<Record<$tw.ModuleType, Record<string, $tw.TW5Module>>>) {
    this.titles = titles ?? {};
    this.types = types ?? {};
    Object.preventExtensions(this);
  }

  define(moduleName: string, moduleType: $tw.ModuleType, definition: object | string) {
    // Create the moduleInfo
    var moduleInfo: $tw.TW5Module = {
      moduleType: moduleType,
      definition: definition,
      exports: undefined
    };
    // If the definition is already an object we can use it as the exports
    if (typeof definition === "object") {
      moduleInfo.exports = definition;
    }
    // Store the module in the titles hashmap
    if (moduleName in this.titles) {
      console.log("Warning: Redefined module - " + moduleName);
    }
    this.titles[moduleName] = moduleInfo;
    // Store the module in the types hashmap
    let modulesOfType: Record<string, $tw.TW5Module> | undefined = this.types[moduleType];

    if (!modulesOfType) {
      this.types[moduleType] = modulesOfType = {};
    }
    if (moduleName in modulesOfType) {
      console.log("Warning: Redefined module - " + moduleName);
    }
    modulesOfType[moduleName] = moduleInfo;
  }

  execute(moduleName: string, moduleRoot?: string): any {
    var name = moduleName;
    if (moduleName.charAt(0) === ".") {
      name = $tw.utils.resolvePath(moduleName, moduleRoot);
    }
    if (!$tw.modules.titles[name]) {
      if ($tw.modules.titles[name + ".js"]) {
        name = name + ".js";
      } else if ($tw.modules.titles[name + "/index.js"]) {
        name = name + "/index.js";
      } else if ($tw.modules.titles[moduleName]) {
        name = moduleName;
      } else if ($tw.modules.titles[moduleName + ".js"]) {
        name = moduleName + ".js";
      } else if ($tw.modules.titles[moduleName + "/index.js"]) {
        name = moduleName + "/index.js";
      }
    }
    var moduleInfo = $tw.modules.titles[name],
      tiddler = $tw.wiki.getTiddler(name)!,
      _exports = {},
      sandbox = {
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
        require: function (title: string) {
          return $tw.modules.execute(title, name);
        }
      };

    Object.defineProperty(sandbox.module, "id", {
      value: name,
      writable: false,
      enumerable: true,
      configurable: false
    });

    if (!$tw.browser) {
      Object.assign(sandbox, {
        process: process
      });
    } else {
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
    }
    if (!moduleInfo) {
      // We could not find the module on this path
      // Try to defer to browserify etc, or node
      if ($tw.browser) {
        if (window.require) {
          try {
            return window.require(moduleName);
          } catch (e) { }
        }
        throw "Cannot find module named '" + moduleName + "' required by module '" + moduleRoot + "', resolved to " + name;
      } else {
        // If we don't have a module with that name, let node.js try to find it
        return require(moduleName);
      }
    }
    // Execute the module if we haven't already done so
    if (!moduleInfo.exports) {
      try {
        // Check the type of the definition
        if (typeof moduleInfo.definition === "function") { // Function
          moduleInfo.exports = _exports;
          moduleInfo.definition(moduleInfo, moduleInfo.exports, sandbox.require);
        } else if (typeof moduleInfo.definition === "string") { // String
          moduleInfo.exports = _exports;
          patchedEvalGlobal(moduleInfo.definition, sandbox, tiddler.fields.title);
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
    return moduleInfo.exports;
  }

  /*
  Apply a callback to each module of a particular type
      moduleType: type of modules to enumerate
      callback: function called as callback(title,moduleExports) for each module
  */
  forEachModuleOfType(moduleType: $tw.ModuleType, callback: (title: string, exports: any) => void): any {
    Object.keys(this.types[moduleType] ?? {}).forEach(title => callback(title, this.execute(title)));
  }

  /*
  Get all the modules of a particular type in a hashmap by their `name` field
  */
  getModulesByTypeAsHashmap(moduleType: $tw.ModuleType, nameField?: string): Record<string, any> {
    const name = nameField || "name";
    var results = Object.create(null);
    this.forEachModuleOfType(moduleType, function (title, module) {
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
  createClassFromModule(moduleExports: any, baseClass: $tw.ClassConstructor) {
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
