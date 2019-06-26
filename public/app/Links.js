import { ExternalLinkAlt } from '/web_modules/styled-icons/fa-solid/ExternalLinkAlt.js';
import * as RR from "/web_modules/react-router-dom.js";
import styled from "/web_modules/styled-components.js";
import { html } from '/web_modules/htm/react.js';

export const NavLink = styled(RR.NavLink)`
  text-decoration: none;
  color: var(--link-color);
  &:hover {
    text-decoration: underline;
  }
`;

export const ActivatingNavLink = styled(NavLink)`
  &.active {
    font-weight: bold;
  }
`;

export const Link = styled.a`
  text-decoration: none;
  color: var(--link-color);
  &:hover {
    text-decoration: underline;
  }
`;

const ExternalLinkInner = ({ to, children, icon, ...props }) => (
  html`
    <${Link} ...${props} href=${to} target="_blank" rel="noopener">
      ${children}
      ${icon || html`<${ExternalLinkAlt} size=12 />`}
    <//>
  `
);

export const ExternalLink = styled(ExternalLinkInner)`
  display: inline-grid;
  grid-auto-flow: column;
  align-items: center;
  grid-gap: 0.5rem;
`;
