/**
 * Stress-test framework for the WikiLambda browser test suite
 *
 * Copy the following command:
 * npm run browser-stress-test:all
 * or
 * npm run browser-stress-test:all -- --execution-number="<number>"
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

/**
 * @file contains the code to execute each spec file multiple times
 */
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
		console.log( `Running the command for ${ file }` );
		try {
			execSync( `npm run browser-stress-test -- --target-file=${ file } --execution-number="${ executionNumber }"`, { stdio: 'inherit' } );
		} catch ( error ) {
			console.log( `e2e test failed for ${ file }` );
		}
	} );

} catch ( error ) {
	console.log( 'Error Occured' );
}
