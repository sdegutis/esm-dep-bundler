import { html } from '/web_modules/htm/react.js';
import { add1 } from '/app/util.js';
import * as luxon from '/web_modules/luxon.js';

export function ReadableDate() {
  const t = luxon
    .DateTime
    .local()
    .setZone('America/New_York')
    .minus({ weeks: add1(1) })
    .endOf('day')
    .toISO();

  return html`
    <span class=foo>${t}</span>
  `;
}
