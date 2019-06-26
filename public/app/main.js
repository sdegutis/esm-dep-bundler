// import { ReadableDate } from './ReadableDate.js';
// import { Counter } from './Counter.js';
// import { RolesPage } from './RolesPage.js';
// import { BrowserRouter, Route } from '/web_modules/react-router-dom.js';
import ReactDOM from '/web_modules/react-dom@16.8.6.js';
import React from '/web_modules/react@16.8.6.js';
import { html } from '/web_modules/htm/react.js';
// import htm from '/web_modules/htm.js';
import styled, { css } from '/web_modules/styled-components.js';
import { Clipboard } from '/web_modules/styled-icons/fa-solid/Clipboard.js';
import { ClipboardCheck } from '/web_modules/styled-icons/fa-solid/ClipboardCheck.js';
import { ClipboardList } from '/web_modules/styled-icons/fa-solid/ClipboardList.js';

console.log(html`<${App}/>`);

import('/web_modules/chart.js.js').then(mod => {
  console.log(mod);
});


const StyledSomeComponent = styled.div`
  color: blue;
  ${props => props.important && css`
    color: hotpink;
  `}
`;

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
          <${SomeComponent} important=${false}/>
          <${SomeComponent} important=${important} onClick=${() => setImportant(imp => !imp)}/>
          <${SomeComponent} important/>
          <div style=${{marginTop:'10em'}}>
            <${Clipboard} size=48/>
            <${ClipboardCheck} size=48/>
            <${ClipboardList} size=48/>
          </div>
  `;
}

ReactDOM.render(
  html`<${App}/>`,
  document.getElementById('root')
);
