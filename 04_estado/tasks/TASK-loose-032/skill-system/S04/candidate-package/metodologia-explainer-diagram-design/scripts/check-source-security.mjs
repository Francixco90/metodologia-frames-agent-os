import ts from 'typescript';
import {
  CheckError,
  compiler,
  executionSchema,
  fail,
  localSourcePins,
  readRegularContained,
  repoRoot,
  sha,
  validator,
} from './check-core.mjs';
import {
  allowedImportBindings,
  allowedImports,
  allowedProcessProperties,
  forbiddenIdentifiers,
  forbiddenModules,
  forbiddenPropertyNames,
  fsWriters,
} from './check-source-policy.mjs';

// prettier-ignore
export const sourceAttackCases = ['hidden-fs-writer-alias', 'https-import-alias', 'require-alias', 'process-get-builtin-dot', 'process-get-builtin-computed', 'function-dynamic-import', 'dynamic-constructor-source-drift', 'font-px-schema-source-drift'];

const moduleName = (node) =>
  node?.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
    ? node.moduleSpecifier.text
    : undefined;
const accessedProperty = (node) => {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (!ts.isElementAccessExpression(node)) return undefined;
  const staticString = (expression) => {
    if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression))
      return expression.text;
    if (
      ts.isBinaryExpression(expression) &&
      expression.operatorToken.kind === ts.SyntaxKind.PlusToken
    ) {
      const left = staticString(expression.left);
      const right = staticString(expression.right);
      return left === undefined || right === undefined ? undefined : `${left}${right}`;
    }
    return undefined;
  };
  return staticString(node.argumentExpression);
};

export const auditSource = (source, file, allowlist = allowedImports.get(file) ?? new Set()) => {
  const ast = ts.createSourceFile(
    'runtime.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const visit = (node) => {
    if (ts.isImportEqualsDeclaration(node)) fail('CHECK_REQUIRE_NOT_ALLOWED');
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const specifier = moduleName(node);
      if (ts.isExportDeclaration(node) && !specifier) {
        ts.forEachChild(node, visit);
        return;
      }
      if (!specifier || forbiddenModules.has(specifier) || !allowlist.has(specifier))
        fail('CHECK_IMPORT_NOT_ALLOWED');
      const clause = ts.isImportDeclaration(node) ? node.importClause : undefined;
      const bindings = allowedImportBindings.get(file)?.get(specifier);
      if (clause?.name || (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)))
        fail('CHECK_IMPORT_BINDING_NOT_ALLOWED');
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const item of clause.namedBindings.elements) {
          const importedName = (item.propertyName ?? item.name).text;
          if (
            (specifier === 'node:fs' || specifier === 'node:fs/promises') &&
            fsWriters.has(importedName)
          )
            fail('CHECK_PROHIBITED_FS_WRITE');
          if (!bindings?.has(importedName)) fail('CHECK_IMPORT_BINDING_NOT_ALLOWED');
        }
      }
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)
      fail('CHECK_DYNAMIC_IMPORT');
    if (ts.isIdentifier(node) && node.text === 'require') fail('CHECK_REQUIRE_NOT_ALLOWED');
    if (ts.isIdentifier(node) && node.text === 'process') {
      const parent = node.parent;
      const property =
        (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) &&
        parent.expression === node
          ? accessedProperty(parent)
          : undefined;
      if (!property || !allowedProcessProperties.has(property))
        fail('CHECK_PROHIBITED_RUNTIME_API');
    }
    if (ts.isIdentifier(node) && forbiddenIdentifiers.has(node.text))
      fail('CHECK_PROHIBITED_RUNTIME_API');
    if (ts.isStringLiteral(node) && forbiddenPropertyNames.has(node.text))
      fail('CHECK_PROHIBITED_RUNTIME_API');
    if (
      (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
      forbiddenPropertyNames.has(accessedProperty(node) ?? '')
    )
      fail('CHECK_PROHIBITED_RUNTIME_API');
    if (
      ts.isPropertyAccessExpression(node) &&
      ((ts.isIdentifier(node.expression) &&
        node.expression.text === 'Math' &&
        node.name.text === 'random') ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'Date' &&
          node.name.text === 'now') ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'performance' &&
          node.name.text === 'now'))
    )
      fail('CHECK_PROHIBITED_RUNTIME_API');
    ts.forEachChild(node, visit);
  };
  visit(ast);
};

const assertPinnedLocalSource = (file, source) => {
  if (sha(source) !== localSourcePins.get(file)) fail('CHECK_RUNTIME_SOURCE_HASH_MISMATCH');
};
const assertPinnedRuntimeSource = (file, source) => {
  assertPinnedLocalSource(file, source);
  auditSource(source, file);
};
export const assertRuntimeSources = () => {
  for (const file of localSourcePins.keys())
    assertPinnedLocalSource(file, readRegularContained(repoRoot, file).toString('utf8'));
  for (const file of [validator, compiler])
    auditSource(readRegularContained(repoRoot, file).toString('utf8'), file);
};

export const assertAdversarialAudits = () => {
  const rejects = (source, code) => {
    try {
      auditSource(source, validator, allowedImports.get(validator));
    } catch (error) {
      if (error instanceof CheckError && error.code === code) return;
      throw error;
    }
    fail('CHECK_ADVERSARIAL_CASE_ACCEPTED');
  };
  rejects(
    "import {writeFile as hiddenWrite} from 'node:fs'; hiddenWrite('x','y');",
    'CHECK_PROHIBITED_FS_WRITE',
  );
  rejects("import {request as alias} from 'node:https'; alias('x');", 'CHECK_IMPORT_NOT_ALLOWED');
  rejects("const loader = require; loader('node:https');", 'CHECK_REQUIRE_NOT_ALLOWED');
  rejects("process.getBuiltinModule('node:https');", 'CHECK_PROHIBITED_RUNTIME_API');
  rejects("process['getBuiltinModule']('node:https');", 'CHECK_PROHIBITED_RUNTIME_API');
  rejects('Function("return import(\'node:https\')")();', 'CHECK_PROHIBITED_RUNTIME_API');
  const validatorSource = readRegularContained(repoRoot, validator).toString('utf8');
  const escape = `${validatorSource}\nconst key = 'con' + 'structor'; ([]['filter'][key])("return import('node:https')")();`;
  try {
    assertPinnedRuntimeSource(validator, escape);
    fail('CHECK_DYNAMIC_CONSTRUCTOR_ACCEPTED');
  } catch (error) {
    if (!(error instanceof CheckError) || error.code !== 'CHECK_RUNTIME_SOURCE_HASH_MISMATCH')
      throw error;
  }
  const schemaSource = readRegularContained(repoRoot, executionSchema).toString('utf8');
  const fontBudgetDrift = schemaSource.replace(
    'font_px: z.number().int().min(24)',
    'font_px: z.number().int().min(12)',
  );
  if (fontBudgetDrift === schemaSource) fail('CHECK_FONT_DRIFT_ASSUMPTION');
  try {
    assertPinnedLocalSource(executionSchema, fontBudgetDrift);
    fail('CHECK_FONT_SCHEMA_DRIFT_ACCEPTED');
  } catch (error) {
    if (!(error instanceof CheckError) || error.code !== 'CHECK_RUNTIME_SOURCE_HASH_MISMATCH')
      throw error;
  }
};
