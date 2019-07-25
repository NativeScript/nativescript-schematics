import * as ts from 'typescript';
import { IRule, Replacement } from 'tslint';
import { tsquery } from '@phenomnomnominal/tsquery';
import { Tree, SchematicContext, isContentAction } from '@angular-devkit/schematics';
import { LoggerApi } from '@angular-devkit/core/src/logger';
import { PreferMappedImportsRule } from '@nativescript/tslint-rules';
import { parseCompilerOptions } from '@nativescript/tslint-rules/dist/preferMappedImportsRule';

import { parseTsConfigFile } from '../ts-utils';
import { getFileContents } from '../utils';
import { getTsConfigFromProject } from '../angular-project-parser';
import { Schema as ConvertRelativeImportsSchema } from './schema';

// TODO: add link to the docs
const conversionFailureMessage = `Failed to generate remapped imports! Please see: ...`;

export default function(options: ConvertRelativeImportsSchema) {
  return (tree: Tree, context: SchematicContext) => {
    const { logger } = context;

    const filesToFix = getFilesToFix(tree, options.filesToIgnore);
    if (filesToFix.size === 0) {
      logger.debug('Convert Relative Imports: No files to fix.');

      return tree;
    }

    const tsConfigPath = getTsConfigPath(tree, options.project, logger) || 'tsconfig.json';
    const compilerOptions = getCompilerOptions(tree, tsConfigPath);

    if (!compilerOptions) {
      logger.debug('Convert Relative Imports: Failed to parse the TS config file.');
      logger.error(conversionFailureMessage);

      return tree;
    }

    return fixImports(tree, logger, filesToFix, compilerOptions);
  };
}

function getFilesToFix(tree: Tree, filesToIgnore: Array<string> = []) {
  const isIgnoredFile = (f: string) =>
    filesToIgnore.some((fileToIgnore) => fileToIgnore === f);

  const files = tree.actions.reduce((acc: Set<string>, action) => {
    const path = action.path.substr(1);  // Remove the starting '/'.
    if (isContentAction(action) && path.endsWith('.ts') && !isIgnoredFile(path)) {
      acc.add(path);
    }

    return acc;
  }, new Set<string>());

  return files;
}

function fixImports(
  tree: Tree,
  logger: LoggerApi,
  filePaths: Set<string>,
  compilerOptions: ts.CompilerOptions,
): Tree {
  const rule = generateTslintRule(compilerOptions);
  if (!rule) {
    logger.debug('Convert Relative Imports: Failed to extract remap options from the TS compiler options.');
    logger.error(conversionFailureMessage);

    return tree;
  }

  filePaths.forEach((path) => {
    const content = getFileContents(tree, path);
    const fixedContent = applyTslintRuleFixes(rule, path, content);

    if (content !== fixedContent) {
      tree.overwrite(path, fixedContent);
    }
  });

  return tree;
}

function applyTslintRuleFixes(rule: IRule, filePath: string, fileContent: string) {
  const sourceFile = tsquery.ast(fileContent, filePath);
  const ruleFailures = rule.apply(sourceFile);

  const fixes = ruleFailures.filter((error) => error.hasFix()).map((error) => error.getFix()!);

  const fixedContent = Replacement.applyFixes(fileContent, fixes);

  return fixedContent;
}

function generateTslintRule(compilerOptions: ts.CompilerOptions): PreferMappedImportsRule | undefined {
  const remapOptions = parseCompilerOptions(compilerOptions);
  if (!remapOptions) {
    return;
  }

  const tslintRuleArguments = {
    prefix: remapOptions.prefix,
    'prefix-mapped-to': remapOptions.prefixMappedTo,
    'base-url': remapOptions.baseUrl,
  };

  const rule = new PreferMappedImportsRule({
    ruleArguments: [tslintRuleArguments],
    ruleName: 'prefer-mapped-imports',
    ruleSeverity: 'error',
    disabledIntervals: [],
  });

  return rule;
}

function getTsConfigPath(tree: Tree, projectName: string, logger: LoggerApi): string | undefined {
  let tsConfig: string | undefined;
  try {
    tsConfig = getTsConfigFromProject(tree, projectName);
  } catch (e) {
    logger.error(e);
  }

  return tsConfig;
}

function getCompilerOptions(tree: Tree, tsConfigPath: string)
  : ts.CompilerOptions | undefined {

  const tsConfigObject = parseTsConfigFile(tree, tsConfigPath);
  if (!tsConfigObject) {
    return;
  }

  const compilerOptions = tsConfigObject.options;

  return compilerOptions;
}
