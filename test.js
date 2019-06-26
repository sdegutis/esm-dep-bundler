const npm = require('global-npm');

const deps = [
  { name: 'pad-left', version: '2.1.0' },
  { name: 'repeat-string', version: null }, // '1.6.1'
];

const depStrings = deps.map(({name,version}) => `${name}@${version||'latest'}`);

console.log(depStrings);

npm.load({loglevel:'silent'}, (err) => {
  npm.commands.install('.', depStrings, (err) => {
    console.log('loaded', err);
  });
  console.log('installed', err);
});
