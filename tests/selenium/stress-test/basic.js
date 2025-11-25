/**
 * Stress-test framework for the WikiLambda browser test suite
 *
 * Copy the following:
 * npm run browser-stress-test -- --target-file="<spec_file>"
 * --execution-number="<number>"
 *
 * Example command:
 * npm run browser-stress-test -- --target-file="basic.js"
 * --execution-number="6"
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

/**
 * @file contains the code to run an individual spec file multiple times
 * This will helpful in checking the flakiness of the test
 *
 * target-file is the spec file
 * execution-number is the number of times spec file needs to be run
 *
 * WebdriverIO version 8 already introduces a option for this
 * However this can not be used as blocked by T324766
 */

const { config } = require( '../wdio.conf' );

const specs = [];
const specsRootDir = 'tests/selenium/specs';

try {
	const args = process.argv;
	const targetFileIndex = args.findIndex( ( arg ) => arg.startsWith( '--target-file=' ) );
	const executionNumberIndex = args.findIndex( ( arg ) => arg.startsWith( '--execution-number=' ) );

	const targetFile = args[ targetFileIndex ].split( '=' )[ 1 ];
	const executionNumber = parseInt( args[ executionNumberIndex ].split( '=' )[ 1 ] );

	for ( let i = 0; i < executionNumber; i++ ) {
		specs.push( `${ specsRootDir }/${ targetFile }` );
	}

	console.log( `Executing ${ targetFile } ${ executionNumber } times` );
} catch ( error ) {
	console.log( 'Error occured' );
}

exports.config = {
	...config,
	specs: specs,
	specFileRetries: 0
};
