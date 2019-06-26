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

const entries = fg.sync(path.join(__dirname, 'public', '/**/*.js'));
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

Array.prototype.unique = function() {
  const that = [];
  this.forEach(item => {
    if (!that.includes(item)) that.push(item);
  });
  return that;
};

const webModules = allImportedModules
      .filter(mod => mod.startsWith('/web_modules/'))
      .map(mod => mod.replace(/^\/web_modules\//, ''))
      .sort()
      .unique();

const input = {};

webModules.forEach(mod => {
  mod = mod.replace(/.js$/, '');
  input[mod] = mod;
});

console.log(input);

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

const aliases = {
  'styled-components': 'node_modules/styled-components/dist/styled-components.browser.cjs.js',
};

function replaceProcessEnv() {
  return rollupPluginReplace({
    'process.env.NODE_ENV': '"development"',
  });
}

function renameModuleAliases() {
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
