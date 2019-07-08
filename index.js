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
const c = require('ansi-colors');

const http = require('http');
const https = require('https');
const mime = require('mime-types');
const selfsigned = require('selfsigned');

const request = require('request');

const PKG_CONFIG_KEY = 'ESM-Dep-Bundler';
const log = setupLogger();
run();


function run() {
  installPolyfills();

  const {
    includePattern,
    webModulesDir,
    publicDir,
    useHttps,
    indexFile,
    apiPrefix,
    backendServer,
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
        .option('index-file', {
          alias: 'h',
          description: "The path to the file relative to <public-dir> to serve for 404s and /.",
          default: '/index.html',
        })
        .option('api-prefix', {
          alias: 'a',
          description: "When this prefix is matched, requests will be proxied to <backend-server>",
          default: '/api/',
        })
        .option('backend-server', {
          alias: 'b',
          description: "Another server to proxy back-end requests to.",
          default: 'http://localhost:8080/',
        })
        .argv;

  const webModulesPrefix = '/' + webModulesDir + '/';
  const outDir = path.join(publicDir, webModulesDir);
  const includePath = path.join(publicDir, includePattern);

  const pkg = require(path.join(process.cwd(), './package.json'));

  const alreadyInstalledDeps = pkg.dependencies || {};
  const latestDeps = Object.keys(alreadyInstalledDeps);

  log.installer(`Found these deps installed already:`);
  latestDeps.forEach((dep) => {
    log.installer(`  ${c.cyan(dep)}`);
  });

  const pkgConfig = pkg[PKG_CONFIG_KEY] || {};
  const fileAliases = pkgConfig.fileAliases || {};
  const npmAliases = pkgConfig.npmAliases || {};

  if (Object.keys(fileAliases).length > 0) {
    log.builder(`Using 'fileAliases' config:`);
    Object.entries(fileAliases).forEach(([k, v]) => {
      log.builder(`  Mapping ${c.cyan(k)} to ${c.cyan(v)}`);
    });
  }

  if (Object.keys(npmAliases).length > 0) {
    log.builder(`Using 'npmAliases' config:`);
    Object.entries(npmAliases).forEach(([k, v]) => {
      log.builder(`  Mapping ${c.cyan(k)} to ${c.cyan(v)}`);
    });
  }

  const build = () => {
    bundleViaRollup({ latestDeps, includePath, webModulesPrefix, outDir, npmAliases, fileAliases });
  };

  build();
  listenForPublicFileChanges(includePath, outDir, build);
  startFileServer(publicDir, useHttps, indexFile, apiPrefix, backendServer);
}

function bundleViaRollup({ latestDeps, includePath, webModulesPrefix, outDir, npmAliases, fileAliases }) {
  const { rollupInput, npmDeps } = getDependenciesFromFiles({ includePath, webModulesPrefix });

  installDeps(latestDeps, npmDeps, npmAliases);

  log.builder(`Starting to bundle deps:`);
  log.builder(`Outputting web modules to ${c.cyan(outDir)}:`);
  Object.entries(rollupInput).forEach(([k,v]) => {
    log.builder(`  ${c.cyan(k)} (via NPM package ${c.cyan(v)})`);
  });

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
      log.builder('Done.');
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

  log.installer(`Checking for packages to install...`);

  depsToInstall.forEach(([name, version]) => {
    latestDeps.push(name);
  });

  if (depsToInstall.length > 0) {
    const depStrings = depsToInstall
          .map(([name, version]) => maybeAlias(name, aliases))
          .unique()
          .join(' ');
    log.installer(`Installing packages: ${depStrings}`);
    execSync(`npm install ${depStrings}`);
    log.installer(`Done.`);
  }
  else {
    log.installer('NPM Deps up to date; skipping npm-install.');
  }
}

function getDependenciesFromFiles({ includePath, webModulesPrefix }) {
  const entries = fg.sync(includePath);

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
  log.watcher(`Watching files at ${c.cyan(includePath)}`);
  log.watcher(`Listening for changes...`);
  chokidar.watch(includePath, {
    ignoreInitial: true,
    ignored: [
      /(^|[\/\\])\../, // dot-files
      outDir,
    ],
  }).on('all', (event, path) => {
    log.watcher(`File changed at "${path}"; rebuilding...`);
    build();
  });
}

function startFileServer(publicDir, useHttps, indexFile, apiPrefix, backendServer) {
  const defaultFile = path.join(publicDir, indexFile);

  log.server(`Proxying all requests starting with ${c.cyan(apiPrefix)} to ${c.cyan(backendServer)}`);

  if (fs.existsSync(defaultFile)) {
    log.server(`Using default file ${c.cyan(defaultFile)} for 404s and dirs without index.html`);
  }
  else {
    log.server(`Default file ${c.cyan(defaultFile)} doesn't exist; giving up`);
    process.exit(1);
  }

  const opts = {};
  if (useHttps) {
    const certPath = path.join(__dirname, 'cert.pem');
    if (!fs.existsSync(certPath)) {
      const pems = selfsigned.generate([
        { name: 'commonName', value: 'localhost' },
      ]);
      const certData = pems.private + pems.cert;
      fs.writeFileSync(certPath, certData, { encoding: 'utf8' });
    }
    const cert = fs.readFileSync(certPath);

    opts.key = opts.cert = cert;
  }

  function maybeUseDefaultFile(p) {
    if (!fs.existsSync(p)) {
      log.server(`Path ${c.cyan(p)} doesn't exist; serving ${c.cyan(publicDir + indexFile)} instead`);
      return defaultFile;
    }
    return p;
  }

  const logError = (err) => {
    log.server(`Error: ${err}`);
    // res.status(500).json({ error: err.toString() });
  };

  const { createServer } = useHttps ? https : http;
  const server = createServer(opts, (req, res) => {
    let p = path.join(publicDir, req.url);

    // Proxy to the back-end server.
    if (req.url.startsWith(apiPrefix, backendServer)) {
      try {
        let url = req.url;
        if (url.startsWith('/')) url = url.substr(1);

        log.server(`Proxying ${c.cyan(req.url)} to ${c.cyan(backendServer + url)}`);
        req.pipe(request(backendServer + url))
          .on('error', logError)
          .pipe(res);
      }
      catch (e) {
        log.server(`Error: ${e}`);
      }
      return;
    }

    // If it doesn't exist, try the default.
    p = maybeUseDefaultFile(p);

    // If it's a dir, try appending /index.html
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      log.server(`Path ${c.cyan(p)} is a directory; trying again by appending /index.html`);
      p = path.join(p, '/index.html');

      // Check again if it exists...
      p = maybeUseDefaultFile(p);
    }

    // We should be good now.
    res.setHeader(
      'Content-Type',
      mime.contentType(mime.lookup(p)) || 'application/octet-stream'
    );
    fs.createReadStream(p).pipe(res);
  });

  const port = 8080;
  server.listen(port, () => {
    log.server(`Listening on port ${port}.`);
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
   * [x] make 404-based index file configurable via yargs
   * [x] proxy /api/ to another server
   * [ ] optionally use http2
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

function setupLogger() {
  function createFor(actor, padding, colorize) {
    return (str) => {
      console.log(`${colorize(`[${actor}]${padding}  `)}${str}`);
    };
  }

  return {
    server:    createFor('server', '   ', c.dim.yellow),
    builder:   createFor('builder', '  ', c.dim.blue),
    watcher:   createFor('watcher', '  ', c.dim.magenta),
    installer: createFor('installer', '', c.dim.green),
  };
}
