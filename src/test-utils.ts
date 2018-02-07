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
