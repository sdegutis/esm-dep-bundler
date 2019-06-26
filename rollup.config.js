import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import rollupPluginReplace from 'rollup-plugin-replace';

import * as acorn from 'acorn';
import * as acornWalk from 'acorn-walk';
import inject from 'acorn-dynamic-import/lib/walk';
import dynamicImport from 'acorn-dynamic-import';

import path from 'path';
import fg from 'fast-glob';
import fs from 'fs';

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


export default {
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
