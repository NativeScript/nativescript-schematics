import * as ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { IRule, Replacement } from 'tslint';
import { tsquery } from '@phenomnomnominal/tsquery';
import { Tree, SchematicContext, isContentAction } from '@angular-devkit/schematics';
import { LoggerApi } from '@angular-devkit/core/src/logger';

import { getCompilerOptions } from '../ts-utils';
import { getFileContents } from '../utils';
import { getTsConfigFromProject } from '../angular-project-parser';
import { getMappedImportsRule } from '../mapped-imports-rule-utils';

import { Schema as ConvertRelativeImportsSchema } from './schema';

const conversionFailureMessage = `Failed to generate remapped imports! Please see: ` +
  `https://docs.nativescript.org/angular/code-sharing/intro#remapped-imports`;

export default function(options: ConvertRelativeImportsSchema) {
  return (tree: Tree, context: SchematicContext) => {
    const { logger } = context;

    const filesToFix = getFilesToFix(tree, options.filesToIgnore);
    if (filesToFix.size === 0) {
      logger.debug('Convert Relative Imports: No files to fix.');

      return tree;
    }

    const tsConfigPath = getTsConfigFromProject(tree, options.project) || 'tsconfig.json';
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
  const rule = getMappedImportsRule(compilerOptions);
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
