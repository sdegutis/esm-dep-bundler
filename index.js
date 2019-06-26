const rollup = require('rollup').rollup;
const commonjs = require('rollup-plugin-commonjs');
const resolve = require('rollup-plugin-node-resolve');
const rollupPluginReplace = require('rollup-plugin-replace');

const acorn = require('acorn');
const acornWalk = require('acorn-walk');
const inject = require('acorn-dynamic-import/lib/walk').default;
const dynamicImport = require('acorn-dynamic-import').default;

const rimraf = require('rimraf');
const path = require('path');
const fg = require('fast-glob');
const fs = require('fs');

const chokidar = require('chokidar');

require('./polyfills.js');

const includePath = 'public/**/*.js';
const webModulesPrefix = '/web_modules/';
const outDir = 'public/web_modules';

const aliasesOstensiblyFromPackageJson = {
  'styled-components': 'node_modules/styled-components/dist/styled-components.browser.cjs.js',
};

chokidar.watch(includePath, {
  ignoreInitial: true,
  ignored: [
    /(^|[\/\\])\../, // dot-files
    outDir,
  ],
}).on('all', (event, path) => {
  console.log(event, path);
  run();
});

run();

function run() {
  const { rollupInput, npmDeps } = getDependenciesFromFiles({ includePath, webModulesPrefix });

  console.log(rollupInput);
  console.log(npmDeps);

  rimraf.sync(outDir);

  rollup({
    input: rollupInput,
    plugins: [
      replaceProcessEnv(),
      renameModuleAliases(aliasesOstensiblyFromPackageJson),
      resolve(),
      commonjs(),
    ],
  }).then(bundle => {
    bundle.write({
      dir: outDir,
      format: 'esm',
      sourcemap: false,
      exports: 'named',
      chunkFileNames: 'common/[name]-[hash].js',
    }).then(() => {
      console.log('done.');
    });
  });
}





function getDependenciesFromFiles({includePath, webModulesPrefix}) {
  const entries = fg.sync(path.join(__dirname, includePath));
  // console.log(entries);

  const walk = inject(acornWalk);
  const allImportedModules = [];
  entries.forEach(entry => {
    const src = fs.readFileSync(entry, 'utf-8');
    const ast = acorn.Parser.extend(dynamicImport).parse(src, { sourceType: 'module' });
    const result = walk.ancestor(ast, {
      ImportDeclaration(node) {
        const mod = node.source.value;
        allImportedModules.push(mod);
      },
      ExportNamedDeclaration(node) {
        if (node.source && node.source.type === 'Literal') {
          allImportedModules.push(node.source.value);
        }
      },
      Import(node, ancestors) {
        const expr = ancestors[ancestors.length - 2].arguments[0];
        if (expr.type === 'Literal') {
          const mod = expr.value;
          allImportedModules.push(mod);
        }
      },
    }, { ...walk.base });
    // console.log(result);
  });

  const webModules = allImportedModules
        .filter(mod => mod.startsWith(webModulesPrefix))
        .map(mod => mod.substr(webModulesPrefix.length))
        .sort()
        .unique();

  const rollupInput = {};
  const vMatch = /@\d+(\.\d+)*/;

  const npmDeps = [];

  webModules.forEach(mod => {
    mod = mod.replace(/.js$/, '');
    let version = mod.match(vMatch);
    if (version) version = version[0].substr(1);
    const modWithoutVersion = mod.replace(vMatch, '');
    npmDeps.push([modWithoutVersion, version]);
    rollupInput[mod] = modWithoutVersion;
  });

  return {rollupInput, npmDeps};
}

function replaceProcessEnv() {
  return rollupPluginReplace({
    'process.env.NODE_ENV': '"development"',
  });
}

function renameModuleAliases(aliases) {
  return {
    name: 'pika:rename-module-aliases',
    resolveId(src, loader) {
      return aliases[src] || null;
    },
  };
}
