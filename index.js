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

const http = require('http');
const https = require('https');
const mime = require('mime-types');
const selfsigned = require('selfsigned');


const PKG_CONFIG_KEY = 'ESM-Dep-Bundler';
run();


function run() {
  installPolyfills();

  const {
    includePattern,
    webModulesDir,
    publicDir,
    useHttps,
  } = yargs
        .option('include-pattern', {
          alias: 'i',
          description: "A 'glob' to match JS/TS files to search for ESM imports/exports, relative to <public-dir>.",
          default: '**/*.js',
        })
        .option('use-https', {
          type: 'boolean',
          alias: 's',
          description: "Use HTTPS for the dev-server.",
          default: false,
        })
        .option('public-dir', {
          alias: 'p',
          description: "Your web server's root public directory relative to project root.",
          default: 'public',
        })
        .option('web-modules-dir', {
          alias: 'm',
          description: "The name of the directory under <public-dir> that should contain your web modules.",
          default: 'web_modules',
        })
        .argv;

  const webModulesPrefix = '/' + webModulesDir + '/';
  const outDir = path.join(publicDir, webModulesDir);
  const includePath = path.join(publicDir, includePattern);

  console.log('webModulesPrefix =', webModulesPrefix);
  console.log('outDir =', outDir);
  console.log('includePath =', includePath);
  // process.exit(0);

  const pkg = require(path.join(process.cwd(), './package.json'));

  const alreadyInstalledDeps = pkg.dependencies || {};
  const latestDeps = Object.keys(alreadyInstalledDeps);
  console.log(latestDeps);

  const pkgConfig = pkg[PKG_CONFIG_KEY] || {};
  const fileAliases = pkgConfig.fileAliases || {};
  const npmAliases = pkgConfig.npmAliases || {};

  console.log('fileAliases =', fileAliases);
  console.log('npmAliases =', npmAliases);

  const build = () => {
    bundleViaRollup({ latestDeps, includePath, webModulesPrefix, outDir, npmAliases, fileAliases });
  };

  build();
  listenForPublicFileChanges(includePath, outDir, build);
  startFileServer(publicDir, useHttps);
}

function bundleViaRollup({ latestDeps, includePath, webModulesPrefix, outDir, npmAliases, fileAliases }) {
  const { rollupInput, npmDeps } = getDependenciesFromFiles({ includePath, webModulesPrefix });

  installDeps(latestDeps, npmDeps, npmAliases);

  console.log(rollupInput);
  console.log(npmDeps);

  rollup({
    input: rollupInput,
    plugins: [
      replaceProcessEnv(),
      renameModuleAliases(fileAliases),
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

function installDeps(latestDeps, deps, aliases, version) {
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

function listenForPublicFileChanges(includePath, outDir, build) {
  chokidar.watch(includePath, {
    ignoreInitial: true,
    ignored: [
      /(^|[\/\\])\../, // dot-files
      outDir,
    ],
  }).on('all', (event, path) => {
    console.log(event, path);
    build();
  });
}

function startFileServer(publicDir, useHttps) {
  const indexFile = '/index.html';

  const opts = {};
  if (useHttps) {
    const certPath = path.join(__dirname, 'cert.pem');
    console.log("checking for cert file");
    if (!fs.existsSync(certPath)) {
      console.log("didn't find it; creating now...");
      const pems = selfsigned.generate([
        { name: 'commonName', value: 'localhost' },
      ]);
      const certData = pems.private + pems.cert;
      fs.writeFileSync(certPath, certData, { encoding: 'utf8' });
    }
    const cert = fs.readFileSync(certPath);

    opts.key = opts.cert = cert;
  }

  const { createServer } = useHttps ? https : http;
  const server = createServer(opts, (req, res) => {
    let path = req.url;
    if (path === '/') path = indexFile;
    path = publicDir + path;
    fs.exists(path, exists => {
      if (!exists) {
        path = publicDir + indexFile;
      }
      res.setHeader(
        'Content-Type',
        mime.contentType(mime.lookup(path)) || 'application/octet-stream'
      );
      fs.createReadStream(path).pipe(res);
    });
  });

  const port = 8080;
  server.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });

  /**
   * Dev server features we need:
   *
   * [x] serve files from ./public
   * [x] get mime-types right
   * [x] use https
   * [x] serve 404s as ./public/index.html
   * [x] make http optional via yargs
   * [x] make public file configurable via yargs
   * [ ] make 404-based index file configurable via yargs
   * [ ] proxy /api/** /* to another server
   */
}

function installPolyfills() {
  // meh why not
  Array.prototype.unique = function() {
    const seen = {};
    return this.filter(item => {
      const found = seen[item];
      if (!found) seen[item] = true;
      return !found;
    });
  };
}
