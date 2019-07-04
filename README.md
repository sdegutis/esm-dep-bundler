# ESM-Dep-Bundler

*Just write JavaScript and let ESM-Dep-Bundler fully prepare your dependencies.*

### Features

- Scans your files for dependencies via `import` and `export` statements.
- Installs NPM dependencies for you (via NPM via CLI via `child_process`).
- Uses Rollup to compile your dependencies into a deployable folder ("web_modules").
- Supports version in dependency names (to be cache-friendly).

### Usage / Sample

1. `npm i -P esm-dep-bundler`

2. Add this to `package.json`:

    ```json
    "ESM-Dep-Bundler": {
      "fileAliases": {
        "styled-components": "node_modules/styled-components/dist/styled-components.browser.cjs.js"
      },
      "npmAliases": {
        "react": "npm:@reactesm/react",
        "react-dom": "npm:@reactesm/react-dom"
      }
    },
    ```

    The `fileAliases` key is for when a package has a non-browser
    entry point. In this case, styled-components's package.json has
    `main` and `module` keys that point to JS files that assume a
    Node.js environment. ESM-Dep-Bundler (via Rollup) can't work with
    that, since it requires Node.js modules. Instead of doing what
    webpack does and providing polyfills, ESM-Dep-Bundler allows you
    to just specify a browser-compatible file.

    The `npmAliases` key allows you to specify where an NPM package
    should be installed from. It uses the same syntax as the NPM CLI,
    which it literally shells out to. In this example, it installs
    Rollup-compatible versions of 'react' and 'react-dom' from NPM, so
    that any time your code or any of your dependencies import React,
    it'll see this version instead.


3. `npx esm-dep-bundler`

4. Create these files:

    * public/index.js

        ``` html
        <!DOCTYPE html>
        <html>

          <head>
            <title>Test</title>
            <script defer type="module" src="/app/main.js"></script>
          </head>

          <body>
            <div id="root"></div>
          </body>

        </html>
        ```

    * public/app/main.js

        ``` javascript
        import { ReactDOM } from '/app/deps.js';
        import { React } from '/app/deps.js';
        import { html } from '/web_modules/htm/react.js';
        import styled from '/web_modules/styled-components.js';
        import useCount from './util.js';

        function Greeting(props) {
          return html`
            <div>Hello <b>${props.name}</b>!</div>
          `;
        }

        function Counter(props) {
          const [count, increase] = useCount();
          return html`
            <div>
              Count: <b>${count}</b> <button onClick=${increase}>+1</button>
            </div>
          `;
        }

        function App(props) {
          const [name, setName] = React.useState('world');
          const changeName = (e) => {
            setName(e.target.value);
          };
          return html`
            <${Counter}/>
            <div>Greet: <input autoFocus value=${name} onChange=${changeName} /></div>
            <${Greeting} name=${name}/>
          `;
        }

        ReactDOM.render(
          html`<${App} bar='you kid'/>`,
          document.getElementById('root')
        );
        ```

    * public/app/util.js

        ``` javascript
        import { React } from '/app/deps.js';

        export default function useCount() {
          const [count, setCount] = React.useState(0);
          const increase = () => setCount(oldCount => oldCount + 1);
          return [count, increase];
        }
        ```

    * public/app/deps.js

        ``` javascript
        export {default as ReactDOM} from '/web_modules/react-dom@16.8.6.js';
        export {default as React} from '/web_modules/react@16.8.6.js';
        ```

### CLI

``` bash
$ npx esm-dep-bundler --help
Options:
  --help                 Show help                                     [boolean]
  --version              Show version number                           [boolean]
  --include-pattern, -i  A 'glob' to match JS/TS files to search for ESM
                         imports/exports, relative to <public-dir>.
                                                            [default: "**/*.js"]
  --use-https, -s        Use HTTPS for the dev-server.[boolean] [default: false]
  --public-dir, -p       Your web server's root public directory relative to
                         project root.                       [default: "public"]
  --web-modules-dir, -m  The name of the directory under <public-dir> that
                         should contain your web modules.
                                                        [default: "web_modules"]
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
