/**
 * Copy the following command:
 * npm run selenium-stress-test:all
 * or
 * npm run selenium-stress-test:all -- --execution-number="<number>"
 */

/**
 * @file contains the code to execute each spec file multiple times
 */

'use strict';
const { execSync } = require( 'child_process' );

const specFiles = [ 'basic.js', 'connect.js', 'function.js', 'implementation.js', 'tester.js', 'type.js' ];

try {

	const args = process.argv;
	const executionNumberIndex = args.findIndex( ( arg ) => arg.startsWith( '--execution-number=' ) );
	let executionNumber = 10;
	if ( executionNumberIndex !== -1 ) {
		executionNumber = parseInt( args[ executionNumberIndex ].split( '=' )[ 1 ] );
	}

	specFiles.forEach( ( file ) => {
		console.log( `Running the command for ${file}` );
		try {
			execSync( `npm run selenium-stress-test -- --target-file=${file} --execution-number="${executionNumber}"`, { stdio: 'inherit' } );
		} catch ( error ) {
			console.log( `e2e test failed for ${file}` );
		}
	} );

} catch ( error ) {
	console.log( 'Error Occured' );
}