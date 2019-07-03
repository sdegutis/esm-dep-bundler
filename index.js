#!/usr/bin/env node
'use strict';

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

const { execSync } = require('child_process');
const chokidar = require('chokidar');

const yargs = require('yargs');

// meh why not
Array.prototype.unique = function() {
  const seen = {};
  return this.filter(item => {
    const found = seen[item];
    if (!found) seen[item] = true;
    return !found;
  });
};

const {
  includePath,
  webModulesPrefix,
  outDir,
} = yargs
      .option('include-path', {
        alias: 'i',
        description: "A 'glob' to match JS/TS files to search for ESM imports/exports.",
        default: 'public/**/*.js',
      })
      .option('out-dir', {
        alias: 'o',
        description: "The directory to output all your dependencies into.",
        default: 'public/web_modules',
      })
      .option('web-modules-prefix', {
        alias: 'p',
        description: "The path of your web modules relative to your web server's root public directory.",
        default: '/web_modules/',
      })
      .argv;


let latestDeps = getInstalledDeps();
console.log(latestDeps);
/* process.exit(1); */

function getInstalledDeps() {
  const alreadyInstalledDeps = require(path.join(process.cwd(), './package.json')).dependencies || {};
  return Object.keys(alreadyInstalledDeps);
}

const aliasesOstensiblyFromPackageJson = {
  'styled-components': 'node_modules/styled-components/dist/styled-components.browser.cjs.js',
};

const npmAliases = {
  'react': 'npm:@reactesm/react',
  'react-dom': 'npm:@reactesm/react-dom',
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

  installDeps(npmDeps, npmAliases);

  console.log(rollupInput);
  console.log(npmDeps);

  rollup({
    input: rollupInput,
    plugins: [
      replaceProcessEnv(),
      renameModuleAliases(aliasesOstensiblyFromPackageJson),
      resolve(),
      commonjs(),
      cleanFilesFirst(outDir),
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



function maybeAlias(name, aliases, version) {
  const alias = aliases[name];
  if (alias) name += '@' + alias;
  if (version && !alias) name += '@' + version;
  return name;
}

function installDeps(deps, aliases, version) {
  const depsToInstall = deps.filter(([name, version]) => !latestDeps.includes(name));

  depsToInstall.forEach(([name, version]) => {
    latestDeps.push(name);
  });

  if (depsToInstall.length > 0) {
    const depStrings = depsToInstall
      .map(([name, version]) => maybeAlias(name, aliases))
      .unique()
      .join(' ');
    console.log('installing: ', JSON.stringify(depStrings));

    execSync(`npm install ${depStrings}`);
  }
  else {
    console.log('deps up to date; skipping npm-install');
  }
}

function getDependenciesFromFiles({ includePath, webModulesPrefix }) {
  const entries = fg.sync(includePath);
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
    npmDeps.push([modWithoutVersion.split('/')[0], version]);
    rollupInput[mod] = modWithoutVersion;
  });

  return { rollupInput, npmDeps };
}

function replaceProcessEnv() {
  return rollupPluginReplace({
    'process.env.NODE_ENV': '"development"',
  });
}

function renameModuleAliases(aliases) {
  return {
    name: 'esmdb:rename-module-aliases',
    resolveId(src, loader) {
      return aliases[src] || null;
    },
  };
}

function cleanFilesFirst(outDir) {
  return {
    name: 'esmdb:clean-files-first',
    buildEnd() {
      rimraf.sync(outDir);
    },
  }
}
