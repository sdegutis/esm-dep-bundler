const rollup = require('rollup');
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

// meh why not
Array.prototype.unique = function() {
  const that = [];
  this.forEach(item => {
    if (!that.includes(item)) that.push(item);
  });
  return that;
};


const {input, deps} = getDependenciesFromFiles({
  includePath: 'public/**/*.js',
  webModulesPrefix: '/web_modules/',
});

// TODO: install dependencies for the user via some kind of NPM library

console.log(input);
console.log(deps);



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
        .map(mod => mod.replace(new RegExp('^' + webModulesPrefix), ''))
        .sort()
        .unique();

  const input = {};
  const vMatch = /@\d+(\.\d+)*/;

  const deps = [];

  webModules.forEach(mod => {
    mod = mod.replace(/.js$/, '');
    let version = mod.match(vMatch);
    if (version) version = version[0].substr(1);
    const modWithoutVersion = mod.replace(vMatch, '');
    deps.push([modWithoutVersion, version]);
    input[mod] = modWithoutVersion;
  });

  return {input, deps};
}

// require('process').exit(1);

// input = {
//   'styled-components': 'styled-components',
//   'styled-icons/fa-solid/Clipboard': 'styled-icons/fa-solid/Clipboard',
//   'Chart.js': 'Chart.js',
//   'react': 'react',
//   'react-dom': 'react-dom',
// }


const config = {
  input,
  output: {
    dir: 'public/web_modules',
    format: 'esm',
    sourcemap: false,
    exports: 'named',
    chunkFileNames: 'common/[name]-[hash].js',
  },
  plugins: [
    replaceProcessEnv(),
    renameModuleAliases(),
    resolve(),
    commonjs(),
  ],
  watch: {
    exclude: 'public/web_modules/**',
    include: 'public/**',
  },
};


function replaceProcessEnv() {
  return rollupPluginReplace({
    'process.env.NODE_ENV': '"development"',
  });
}

function renameModuleAliases() {
  const aliases = {
    'styled-components': 'node_modules/styled-components/dist/styled-components.browser.cjs.js',
  };
  return {
    name: 'pika:rename-module-aliases',
    resolveId(src, loader) {
      return aliases[src] || null;
    },
  };
}

rimraf.sync('public/web_modules');

const watcher = rollup.watch(config);

watcher.on('event', event => console.log(event.code));
