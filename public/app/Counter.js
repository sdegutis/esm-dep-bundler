import { html } from '/web_modules/htm/react.js';
import React from '/web_modules/react.js';
import { add1 } from '/app/util.js';
import { ExternalLink } from "./Links.js";

export function Counter() {
  const [count, setCount] = React.useState(0);
  return html`
    <div>${add1(count)}</div>
    <${ExternalLink} to='https://google.com'>this is good<//>
    <div><button onClick=${() => setCount(old => old + 1)}>Ok!</button></div>
  `;
}
