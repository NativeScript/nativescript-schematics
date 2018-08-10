import { getNsConfig, getPackageJson } from "../utils";
import { Tree } from "@angular-devkit/schematics";
import { extname } from "path";

export interface Extensions {
  web: string,
  ns: string,
};

// export const validateProject = () => (tree: Tree, options: any) => {
//   // if --web flag explicitly specified
//   if (options.web === true) {
//     // then nsconfig.json must be present
//     if (tree.exists('nsconfig.json')) {
//       throw new SchematicsException(`nsconfig.json not found. While --web flag specified`);
//     }

//     // also nsconfig must contain the "webext" property
//     const nsconfig = getNsConfig(tree);
//     if (nsconfig.webext == null) {
//       throw new SchematicsException(`property webext is missing in nsconfig.json.
//   Add the following to the configuration:
//     "webext": ""`);
//     }
//   }
// }

export const DEFAULT_SHARED_EXTENSIONS: Extensions = {
  web: '',
  ns: '.tns'
};

const isNs = (tree: Tree) => {
  const packageJson = getPackageJson(tree);

  return !!packageJson.nativescript;
}

const isWeb = (tree: Tree) => {
  if (!tree.exists('nsconfig.json')) {
    // console.log(`nsconfig.json not found. Assuming this is a {N} only project`);
    return false;
  }

  const config = getNsConfig(tree);
  return config.webext != null;
}

export interface PlatformUse {
  /** Dictates if the project has {N} configuration */
  nsReady: boolean;
  /** Dictates if the project has web configuration */
  webReady: boolean;
  /** Dictates if this is a nsOnly project */
  nsOnly: boolean;
  /** Dictates if the schematic should include {N} scripts */
  useNs: boolean,
  /** Dictates if the schematic should include web scripts */
  useWeb: boolean
}

export const getPlatformUse = (tree: Tree, options: any): PlatformUse => {
  const nsReady = isNs(tree);
  const webReady = isWeb(tree);
  const nsOnly = nsReady && !webReady;

  const useNs = options.nativescript && nsReady;
  const useWeb = options.web && webReady;

  return {
    nsReady,
    webReady,
    nsOnly,
    useNs,
    useWeb
  }
}

export const getExtensions = (tree: Tree, options: { nsExtension?: string; webExtension?: string; }): Extensions => {
  let ns = options.nsExtension;
  let web = options.webExtension;

  if (isWeb(tree)) {
    const nsconfig = getNsConfig(tree);

    ns = ns || nsconfig.nsext;
    web = web || nsconfig.webext;

    if (ns === web) {
      ns = DEFAULT_SHARED_EXTENSIONS.ns;
      web = DEFAULT_SHARED_EXTENSIONS.web
    }
  }

  return {
    ns: parseExtension(ns || ""),
    web: parseExtension(web || "")
  }
}

const parseExtension = (ext: string): string => {
  // don't change, if the extension is empty or it already starts with a .
  if (ext === '' || ext.startsWith('.')) {
    return ext;
  }

  return '.' + ext;
}

export const getNsConfigExtension = (tree: Tree): Extensions => {
  if (!tree.exists('nsconfig.json')) {
    console.warn('nsconfig not found, using .tns as a default extension for NativeScript files');
    return {
      ns: '.tns',
      web: ''
    };
  }

  const nsconfig = getNsConfig(tree);
  return {
    ns: nsconfig.nsext || '.tns',
    web: nsconfig.webext || ''
  }
}

export const removeNsSchemaOptions = (options: any) => {
  const duplicate = { ...options };
  delete duplicate['web'];
  delete duplicate['nativescript'];
  delete duplicate['nsExtension'];
  delete duplicate['webExtension'];

  return duplicate;
};

export const addExtension = (fileName: string, ext: string) => {
  const fileExtension = extname(fileName);
  return fileName.replace(fileExtension, `${ext}${fileExtension}`);
}
