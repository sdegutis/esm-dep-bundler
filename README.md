# ESM-Dep-Bundler

*Just write JavaScript and let ESM-Dep-Bundler fully prepare your dependencies.*

### Features

- Scans your files for dependencies via `import` and `export` statements.
- Installs dependencies via NPM for you (uses NPM CLI via `child_process`).
- Uses Rollup to compile your dependencies into a deployable folder ("web_modules").
- Supports version in dependency names (to be cache-friendly).

### Usage / Sample

1. `npm i -P esm-dep-bundler`

2. `npx esm-dep-bundler`

3. Create these files:

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
  --help                    Show help                                  [boolean]
  --version                 Show version number                        [boolean]
  --include-path, -i        A 'glob' to match JS/TS files to search for ESM
                            imports/exports.         [default: "public/**/*.js"]
  --out-dir, -o             The directory to output all your dependencies into.
                                                 [default: "public/web_modules"]
  --web-modules-prefix, -p  The path of your web modules relative to your web
                            server's root public directory.
                                                      [default: "/web_modules/"]
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
