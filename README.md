# ESM-Dep-Bundler

### Usage

1. Create a new empty NPM project.

2. Run `npm i -P esm-dep-bundler`

3. (TODO)

``` bash
$ mkdir tmp
$ cd tmp
$ npm init -y
$
$ npx esm-dep-bundler
```

### CLI

``` bash
$ npx esm-dep-bundler --help
Options:
  --help                    Show help                                  [boolean]
  --version                 Show version number                        [boolean]
  --include-path, -i                                 [default: "public/**/*.js"]
  --out-dir, -o                                  [default: "public/web_modules"]
  --web-modules-prefix, -p                            [default: "/web_modules/"]
```

### Credits

Ideas formed in:

- https://github.com/pikapkg/web/issues/68
- https://github.com/pikapkg/web/issues/62
- https://github.com/pikapkg/web/issues/69

People who helped brainstorm it:

- https://github.com/FredKSchott
- https://github.com/backspaces
- https://github.com/jeremycook

### License

MIT
