'use strict';
const fs = require( 'fs' );
const path = require( 'path' );

module.exports = () => {
	return JSON.parse( fs.readFileSync( path.join( __dirname, '../../../i18n/en.json' ) ) );
};
