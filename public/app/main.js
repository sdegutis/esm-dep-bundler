import { ReadableDate } from './ReadableDate.js';
import { Counter } from './Counter.js';
import { RolesPage } from './RolesPage.js';
import { BrowserRouter, Route } from '/web_modules/react-router-dom.js';
import ReactDOM from '/web_modules/react-dom.js';
import React from '/web_modules/react.js';
import { html } from '/web_modules/htm/react.js';
// import chronoNode from '/web_modules/chrono-node.js';
import { startCase, zipWith } from '/web_modules/lodash-es.js';
import styled, { css } from '/web_modules/styled-components.js';
import { Clipboard } from '/web_modules/styled-icons/fa-solid/Clipboard.js';
import { ClipboardCheck } from '/web_modules/styled-icons/fa-solid/ClipboardCheck.js';
import { ClipboardList } from '/web_modules/styled-icons/fa-solid/ClipboardList.js';

// console.log(chronoNode);

const StyledSomeComponent = styled.div`
  color: blue;
  ${props => props.important && css`
    color: hotpink;
  `}
`;

import('/web_modules/shoo2.js').then(mod => {
  console.log(mod);
});

const SomeComponent = ({ important, ...props }) => (
  html`
    <${StyledSomeComponent} ...${props} important=${important}>
      testing
    <//>
  `
);

function App() {
  const [important, setImportant] = React.useState(false);
  const [word, setWord] = React.useState('');
  return html`
    <${BrowserRouter}>
      <${Route} children=${(props) => {
        console.log(props);
        let root = props.location.pathname;
        if (root === '/') root = '';
        return html`
          <button onClick="${() => {console.log('tes'); props.history.push(root + '/foo/bar')}}">hey</button>
          <${SomeComponent} important=${false}/>
          <${SomeComponent} important=${important} onClick=${() => setImportant(imp => !imp)}/>
          <${SomeComponent} important/>
          <div><${ReadableDate}/></div>
          <div><${Counter}/></div>
          <input onChange=${(e) => setWord(e.target.value)}/>
          <div>${word}</div>
          <${RolesPage}/>
          <div style=${{marginTop:'10em'}}>
            <${Clipboard} size=48/>
            <${ClipboardCheck} size=48/>
            <${ClipboardList} size=48/>
          </div>
        `
      }}/>
    <//>
  `;
}

ReactDOM.render(
  html`<${App}/>`,
  document.getElementById('root')
);
