import { ReactDOM } from '/app/deps.js';
import { React } from '/app/deps.js';
import { html } from '/web_modules/htm/react.js';
import styled from '/web_modules/styled-components.js';
import useCount from './util.js';

const Title = styled.span`
  color: crimson;
  font-weight: bold;
`;

function Greeting(props) {
  return html`
    <div><${Title}>Hello<//> <b>${props.name}</b>!</div>
  `;
}

function Counter(props) {
  const [count, increase] = useCount();
  const sendReq = () => {
    fetch('/api/foo').then(res => res.text()).then((text) => {
      console.log(text);
    });
  };
  return html`
    <div>
      <button onClick=${sendReq}>test<//>
      <${Title}>Count:<//> <b>${count}</b> <button onClick=${increase}>+1</button>
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
    <div><${Title}>Greet:<//> <input autoFocus value=${name} onChange=${changeName} /></div>
    <${Greeting} name=${name}/>
  `;
}

ReactDOM.render(
  html`<${App} bar='you kid'/>`,
  document.getElementById('root')
);
