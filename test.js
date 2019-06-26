var npmi = require('npmi');
var path = require('path');

console.log(npmi.NPM_VERSION); // prints the installed npm version used by npmi


var options = {
    name: 'repeat-string',
    version: '1.6.1',
    path: '.',
    npmLoad: {loglevel: 'silent'},
};

npmi(options, function (err, result) {
    if (err) {
        if 		(err.code === npmi.LOAD_ERR) 	console.log('npm load error');
        else if (err.code === npmi.INSTALL_ERR) console.log('npm install error');
        return console.log(err.message);
    }

    // installed
    console.log(options.name+'@'+options.version+' installed successfully -- in '+path.resolve(options.path));
});
