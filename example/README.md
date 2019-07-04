# Sample ESM-Dep-Bundler project

## Usage

``` bash
$ npm init -y
$ npm install ..
$ ## add this to package.json

  "ESM-Dep-Bundler": {
    "fileAliases": {
      "styled-components": "node_modules/styled-components/dist/styled-components.browser.cjs.js"
    },
    "npmAliases": {
      "react": "npm:@reactesm/react",
      "react-dom": "npm:@reactesm/react-dom"
    }
  },

$ npx esm-dep-bundler
$ open http://localhost:8080
```
