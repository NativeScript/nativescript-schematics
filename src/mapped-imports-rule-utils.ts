import * as ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import {
    PreferMappedImportsRule,
    RuleArgs,
    parseCompilerOptions,
} from '@nativescript/tslint-rules';

const RULE_NAME = 'prefer-mapped-imports';

export function getMappedImportsRule(compilerOptions: ts.CompilerOptions):
    PreferMappedImportsRule | undefined {

    const tslintRuleArguments = getMappedImportsArguments(compilerOptions);
    if (!tslintRuleArguments) {
        return;
    }

    const rule = new PreferMappedImportsRule({
        ruleArguments: [tslintRuleArguments],
        ruleName: RULE_NAME,
        ruleSeverity: 'error',
        disabledIntervals: [],
    });

    return rule;
}

export interface RuleConfig {
    name: string;
    options: object;
}

export function getMappedImportsRuleConfig(compilerOptions: ts.CompilerOptions): RuleConfig | undefined {
    const tslintRuleArguments = getMappedImportsArguments(compilerOptions);
    if (!tslintRuleArguments) {
        return;
    }

    const ruleOptions = [
        true,
        tslintRuleArguments,
    ];

    return {
        name: RULE_NAME,
        options: ruleOptions,
    };
}

function getMappedImportsArguments(compilerOptions: ts.CompilerOptions)
    : RuleArgs | undefined {

    const remapOptions = parseCompilerOptions(compilerOptions);
    if (!remapOptions) {
        return;
    }

    const { prefix, prefixMappedTo, baseUrl } = remapOptions;
    const tslintRuleArguments = {
        prefix,
        'prefix-mapped-to': prefixMappedTo,
        'base-url': baseUrl,
    };

    return tslintRuleArguments;
}
