// import * as AWS from 'aws-sdk';
import React from "/web_modules/react.js";
// import { Roles } from '.';
// import { Copyable as C } from "../../ui/Copyable";
// import { MasterDetailRoutes } from '../../ui/MasterDetail';
// import { PropertyDetailsTable, PropertyListingTable, PropertyTableField, selectFields } from "../../ui/PropertyTables";
// import { wrapService } from '../../util/proxyViaServer';
// import { useStyledDataLoader } from '../../util/StyledDataLoader';
// import Time from '../../util/Time';
// import { useCreds } from '../Account';
// import { ResourceContext, ResourceLink } from '../Resource';

import { html } from '/web_modules/htm/react.js';
import styled from '/web_modules/styled-components.js';

// const propertyTableFields = {

//   id: { title: "Role Id", value: (role) => <C>{role.RoleId}</C> },
//   arn: { title: "Arn", value: (role) => <C>{role.Arn}</C> },
//   roleName: { title: "Role Name", value: (role) => <C><ResourceLink resource={Roles} to={role.RoleName} /></C> },
//   description: { title: "Description", value: (role) => <C>{role.Description}</C> },
//   createDate: { title: "Creation Date", value: (role) => <C><Time.Date value={role.CreateDate} /></C> },
//   trustPolicy: { title: "Trust Policy", value: (role) => role.AssumeRolePolicyDocument && <C><pre>{JSON.stringify(JSON.parse(decodeURIComponent(role.AssumeRolePolicyDocument)), null, 2)}</pre></C> },

// };

// const listingFields = selectFields(propertyTableFields, [
//   'roleName',
//   'description',
// ]);

// const detailsFields = selectFields(propertyTableFields, [
//   'roleName',
//   'arn',
//   'description',
//   'createDate',
//   'trustPolicy',
// ]);

// const MasterPage = () => {
//   const getCreds = useCreds();
//   const loader = useStyledDataLoader(async () => {
//     const creds = await getCreds();
//     const iam = wrapService(new AWS.IAM(creds));
//     return (await iam.listRoles().promise()).Roles;
//   }, []);

//   return loader.view || (
//     <PropertyListingTable
//       fields={listingFields}
//       values={loader.data} />
//   );
// };

// const DetailPage = ({ itemId }) => {
//   const getCreds = useCreds();
//   const loader = useStyledDataLoader(async () => {
//     const creds = await getCreds();
//     const iam = wrapService(new AWS.IAM(creds));
//     return (await iam.getRole({ RoleName: itemId }).promise()).Role;
//   }, [itemId]);

//   return loader.view || (
//     <PropertyDetailsTable
//       fields={detailsFields}
//       value={loader.data}
//     />
//   )
// };

const Foo = styled.span`
  color: red;
  border: 1px solid currentColor;
`;

export const RolesPage = () => {
  return html`
    <div>
      testing <${Foo}>Roles<//> page!
    </div>
  `;
  // const { url, resourceTitle } = React.useContext(ResourceContext);
  // return <MasterDetailRoutes
  //   url={url}
  //   title={resourceTitle}
  //   MasterPage={MasterPage}
  //   DetailPage={DetailPage}
  // />
};
