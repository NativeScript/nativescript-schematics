import { UnitTestTree } from "@angular-devkit/schematics/testing";
import { HostTree } from "@angular-devkit/schematics";
import { virtualFs, Path } from "@angular-devkit/core";

export interface VirtualFile {
  path: string;
  content: string;
}

export const isInModuleMetadata = (
    moduleName: string,
    property: string,
    value: string,
    inArray: boolean,
) =>
    isInDecoratorMetadata(moduleName, property, value, 'NgModule', inArray);

export const isInComponentMetadata = (
    componentName: string,
    property: string,
    value: string,
    inArray: boolean,
) =>
    isInDecoratorMetadata(componentName, property, value, 'Component', inArray);

export const isInDecoratorMetadata = (
    moduleName: string,
    property: string,
    value: string,
    decoratorName: string,
    inArray: boolean,
) =>
    new RegExp(
        `@${decoratorName}\\(\\{([^}]*)` +
            objectContaining(property, value, inArray) +
            '[^}]*\\}\\)' +
            '\\s*' +
        `(export )?class ${moduleName}`
    );

const objectContaining = (
    property: string,
    value: string,
    inArray: boolean,
) =>
    inArray ?
        keyValueInArray(property, value) :
        keyValueString(property, value);

const keyValueInArray = (
    property: string,
    value: string,
) =>
    `${property}: \\[` +
    nonLastValueInArrayMatcher +
    `${value},?` +
    nonLastValueInArrayMatcher +
    lastValueInArrayMatcher +
    `\\s*]`;

const nonLastValueInArrayMatcher = `(\\s*|(\\s*(\\w+,)*)\\s*)*`;
const lastValueInArrayMatcher = `(\\s*|(\\s*(\\w+)*)\\s*)?`;

const keyValueString = (
    property: string,
    value: string,
) => `${property}: ${value}`;

export function setupTestTreeWithBase(files: VirtualFile[]): UnitTestTree {
  const memoryFs = setupInMemoryBase(files);
  const host = new HostTree(memoryFs);
  const tree = new UnitTestTree(host);

  return tree;
}

function setupInMemoryBase(files: VirtualFile[]): virtualFs.SimpleMemoryHost {
  const memoryFs = new virtualFs.SimpleMemoryHost();
  files.forEach(file => {
    const path = file.path as Path;
    // The write method of memoryFs expects an ArrayBuffer.
    // However, when the read method is used to fetch the file from the FS
    // the returned value is not converted properly to string.
    // This is why we're using node Buffer to write the file in the memory FS.
    // const content = stringToArrayBuffer(file.content);
    const content = Buffer.from(file.content);

    (<any>memoryFs).write(path, content).subscribe();
  });

  return memoryFs;
}

function stringToArrayBuffer(text: string): ArrayBuffer {
  const stringLength = text.length;

  const byteLength = stringLength * 2; // 2 bytes for each character
  const arrayBuffer = new ArrayBuffer(byteLength);
  const bufferView = new Uint16Array(arrayBuffer);

  for (let i = 0; i < stringLength; i += 1) {
    bufferView[i] = text.charCodeAt(i);
  }

  return arrayBuffer;
}
