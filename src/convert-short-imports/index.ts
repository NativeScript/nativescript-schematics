import { Linter, Rule } from 'eslint';
import { rules } from 'eslint-plugin-nativescript';
import { parse } from '@typescript-eslint/parser';

import { Tree, SchematicContext } from '@angular-devkit/schematics';
import { LoggerApi } from '@angular-devkit/core/src/logger';

import { getFileContents } from '../utils';
import { Schema as ConvertRelativeImportsSchema } from './schema';

const ALLOWED_EXTENSIONS = [
    'ts',
    'js',
];

export default function(options: ConvertRelativeImportsSchema) {
  return (tree: Tree, context: SchematicContext) => {
    const { logger } = context;

    const filesToFix = getFilesToFix(tree, options.srcPath, options.filesToIgnore);
    if (filesToFix.size === 0) {
      logger.debug('Convert Short Imports: No files to fix.');

      return tree;
    }

    return fixImports(tree, filesToFix, logger);
  };
}

function getFilesToFix(tree: Tree, srcPath: string, filesToIgnore: Array<string> = []) {
    const isIgnoredFile = (file: string) =>
        filesToIgnore.some((fileToIgnore) => fileToIgnore === file);

    const hasAllowedExtension = (path: string) =>
        ALLOWED_EXTENSIONS.some((extension) => path.endsWith(extension));

    const srcDirectory = tree.getDir(srcPath);
    const files = new Set<string>();
    srcDirectory.visit((path) => {
        const normalizedPath = path.substr(1);  // Remove the starting '/'.
        if (hasAllowedExtension(normalizedPath) && !isIgnoredFile(normalizedPath)) {
            files.add(path);
        }
    });

    return files;
}

function fixImports(
  tree: Tree,
  filePaths: Set<string>,
  logger: LoggerApi,
): Tree {
  filePaths.forEach((path) => {
    const content = getFileContents(tree, path);
    const fixedContent = applyEsLintRuleFixes(content, path, logger);

    if (content !== fixedContent) {
      tree.overwrite(path, fixedContent);
    }
  });

  return tree;
}

function applyEsLintRuleFixes(fileContent: string, fileName: string, logger: LoggerApi) {
    const SHORT_IMPORTS_RULE_NAME = 'no-short-imports';
    const PARSER_NAME = '@typescript-eslint/parser';

    const linter = new Linter();
    linter.defineRule(
        SHORT_IMPORTS_RULE_NAME,
        rules[SHORT_IMPORTS_RULE_NAME] as Rule.RuleModule,
    );

    linter.defineParser(PARSER_NAME, {
        parse: (<any>parse),
    });

    const messages = linter.verifyAndFix(fileContent, {
        parser: PARSER_NAME,
        parserOptions: {
            sourceType: 'module',
            ecmaVersion: 2015,
        },
        rules: {
            [SHORT_IMPORTS_RULE_NAME]: 'error',
        },
    });

    if (!messages.fixed) {
        logger.debug(`Convert Short Imports: No fixes applied to ${fileName}.`);
    }

    const fixedContent = messages.output;

    return fixedContent;
}
