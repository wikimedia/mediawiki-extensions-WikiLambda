/*!
 * WikiLambda unit test suite for the schemata util
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );
const schemata = require( '../../../resources/ext.wikilambda.app/utils/schemata.js' );

const canonicalToHybrid = schemata.canonicalToHybrid;
const extractErrorStructure = schemata.extractErrorStructure;
const extractZIDs = schemata.extractZIDs;
const hybridToCanonical = schemata.hybridToCanonical;

describe( 'schemata', () => {
	const hybridInitialZObject = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/hybridInitialZObject.json' ) ) ),
		canonicalInitialZObject = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/canonicalInitialZObject.json' ) ) ),
		canonicalResultWithLargeZQuote = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/canonicalResultWithLargeZQuote.json' ) ) ),
		hybridResultWithLargeZQuote = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/hybridResultWithLargeZQuote.json' ) ) ),
		hybridZFunction = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/hybridZFunction.json' ) ) ),
		canonicalZFunction = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/canonicalZFunction.json' ) ) ),
		hybridZList = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/hybridZList.json' ) ) ),
		canonicalZList = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/canonicalZList.json' ) ) ),
		normalZList = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/normalZList.json' ) ) ),
		normalFunctionCall = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/normalFunctionCall.json' ) ) ),
		canonicalFunctionCall = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/canonicalFunctionCall.json' ) ) ),
		simpleErrorObjectRelaxedFormat = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/simpleErrorObject_RelaxedFormat.json' ) ) ),
		fairlyComplexErrorObject = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/fairlyComplexErrorObject.json' ) ) ),
		fairlyComplexErrorObjectLocalKeys = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/fairlyComplexErrorObject_LocalKeys.json' ) ) );

	it( 'extracts ZID from normal string', () => {
		expect( extractZIDs( { Z1K1: Constants.Z_STRING, Z6K1: 'Hello, Test!' } ) ).toEqual(
			[ 'Z1', 'Z6' ]
		);
	} );

	it( 'extracts no ZID from canonical string', () => {
		expect( extractZIDs( 'Hello' ) ).toEqual(
			[]
		);
	} );

	it( 'extracts ZID from canonical reference', () => {
		expect( extractZIDs( 'Z10023' ) ).toEqual(
			[ 'Z10023' ]
		);
	} );

	it( 'extracts ZIDs from hybrid function', () => {
		expect( extractZIDs( hybridZFunction ) ).toEqual(
			[ 'Z1', 'Z9', 'Z2', 'Z6', 'Z10023', 'Z8', 'Z17', 'Z12', 'Z11', 'Z14', 'Z16', 'Z600' ]
		);
	} );

	it( 'extracts ZIDs from canonical function', () => {
		expect( extractZIDs( canonicalZFunction ) ).toEqual(
			[ 'Z1', 'Z2', 'Z6', 'Z10023', 'Z8', 'Z17', 'Z12', 'Z11', 'Z14', 'Z16', 'Z600' ]
		);
	} );

	it( 'extracts error structure from a simple error object in relaxed format', () => {
		// TODO: Remove this test after the relaxed format is no longer produced
		expect( extractErrorStructure( simpleErrorObjectRelaxedFormat ) ).toEqual(
			[ { children: [], errorType: 'Z500', explanation: 'Arbitrary handcrafted message' } ] );
	} );

	it( 'extracts error structure from fairly complex error object', () => {
		expect( extractErrorStructure( fairlyComplexErrorObject ) ).toEqual(
			[ { children: [ { children: [ { children: [], errorType: 'Z532' },
				{ children: [], errorType: 'Z535' },
				{ children: [], errorType: 'Z511' } ], errorType: 'Z509' } ], errorType: 'Z502' } ]
		);
	} );

	it( 'extracts error structure from fairly complex error object with local keys', () => {
		expect( extractErrorStructure( fairlyComplexErrorObjectLocalKeys ) ).toEqual(
			[ { children: [ { children: [ { children: [], errorType: 'Z532' },
				{ children: [], errorType: 'Z535' },
				{ children: [], errorType: 'Z511' } ], errorType: 'Z509' } ], errorType: 'Z502' } ]
		);
	} );

	it( 'canonicalizes strings', () => {
		expect( hybridToCanonical( { Z1K1: Constants.Z_STRING, Z6K1: 'Hello, Test!' } ) ).toEqual( 'Hello, Test!' );
	} );

	it( 'canonicalizes references', () => {
		expect( hybridToCanonical( { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z400' } ) ).toEqual( 'Z400' );
	} );

	it( 'canonicalizes real suspicious-lookin\' Z6s', () => {
		expect( hybridToCanonical( { Z1K1: Constants.Z_STRING, Z6K1: 'Z400' } ) ).toEqual( { Z1K1: Constants.Z_STRING, Z6K1: 'Z400' } );
	} );

	it( 'hybridToCanonical handles Z0 because the front end uses it', () => {
		expect( hybridToCanonical( { Z1K1: Constants.Z_REFERENCE, Z9K1: Constants.NEW_ZID_PLACEHOLDER } ) ).toEqual( 'Z0' );
	} );

	it( 'hybridizes canonical input - initial ZObject', () => {
		expect( canonicalToHybrid( canonicalInitialZObject ) ).toEqual( hybridInitialZObject );
	} );

	it( 'canonicalizes hybrid input - initial ZObject', () => {
		expect( hybridToCanonical( hybridInitialZObject ) ).toEqual( canonicalInitialZObject );
	} );

	it( 'canonicalized canonical input is identical - initial ZObject', () => {
		expect( hybridToCanonical( canonicalInitialZObject ) ).toEqual( canonicalInitialZObject );
	} );

	it( 'hybridized hybrid input is identical - initial ZObject', () => {
		expect( canonicalToHybrid( hybridInitialZObject ) ).toEqual( hybridInitialZObject );
	} );

	it( 'hybridizes canonical input - Large ZQuote example', () => {
		expect( canonicalToHybrid( canonicalResultWithLargeZQuote ) ).toEqual( hybridResultWithLargeZQuote );
	} );

	it( 'canonicalizes hybrid input - Large ZQuote example', () => {
		expect( hybridToCanonical( hybridResultWithLargeZQuote ) ).toEqual( canonicalResultWithLargeZQuote );
	} );

	it( 'hybridized hybrid input is identical - Large ZQuote example', () => {
		expect( canonicalToHybrid( hybridResultWithLargeZQuote ) ).toEqual( hybridResultWithLargeZQuote );
	} );

	it( 'canonicalized canonical input is identical - Large ZQuote example', () => {
		expect( hybridToCanonical( canonicalResultWithLargeZQuote ) ).toEqual( canonicalResultWithLargeZQuote );
	} );

	it( 'hybridizes canonical input - ZFunction example', () => {
		expect( canonicalToHybrid( canonicalZFunction ) ).toEqual( hybridZFunction );
	} );

	it( 'hybridizes supremely sketch Z6s', () => {
		expect( canonicalToHybrid( { Z1K1: Constants.Z_STRING, Z6K1: 'Z400' } ) ).toEqual( { Z1K1: Constants.Z_STRING, Z6K1: 'Z400' } );
	} );

	it( 'hybridizes Z9s', () => {
		expect( canonicalToHybrid( 'Z400' ) ).toEqual( { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z400' } );
	} );

	it( 'hybridizes Z6s', () => {
		expect( canonicalToHybrid( 'not a reference' ) ).toEqual( { Z1K1: Constants.Z_STRING, Z6K1: 'not a reference' } );
	} );

	it( 'canonicalizes hybrid input - ZFunction example', () => {
		expect( hybridToCanonical( hybridZFunction ) ).toEqual( canonicalZFunction );
	} );

	it( 'canonicalized canonical input is identical - ZFunction example', () => {
		expect( hybridToCanonical( canonicalZFunction ) ).toEqual( canonicalZFunction );
	} );

	it( 'hybridized hybrid input is identical - ZFunction example', () => {
		expect( canonicalToHybrid( hybridZFunction ) ).toEqual( hybridZFunction );
	} );

	it( 'hybrid ZList is correctly canonicalized', () => {
		expect( hybridToCanonical( hybridZList ) ).toEqual( canonicalZList );
	} );

	it( 'normal ZList is correctly canonicalized', () => {
		expect( hybridToCanonical( normalZList ) ).toEqual( canonicalZList );
	} );

	it( 'normal function call is correctly canonicalized', () => {
		expect( hybridToCanonical( normalFunctionCall ) ).toEqual( canonicalFunctionCall );
	} );

	it( 'canonical ZList is correctly hybridized', () => {
		expect( canonicalToHybrid( canonicalZList ) ).toEqual( hybridZList );
	} );

	it( 'canonicalize an undefined string value as an empty string', () => {
		expect( hybridToCanonical( { Z1K1: Constants.Z_STRING } ) ).toEqual( '' );
	} );

	it( 'canonicalize an undefined reference ID as an empty string', () => {
		expect( hybridToCanonical( { Z1K1: Constants.Z_REFERENCE } ) ).toEqual( '' );
	} );

	it( 'canonicalize an undefined zobject as undefined', () => {
		expect( hybridToCanonical( undefined ) ).toEqual( undefined );
	} );

	it( 'hybridize an undefined zobject as undefined', () => {
		expect( canonicalToHybrid( undefined ) ).toEqual( undefined );
	} );
} );
