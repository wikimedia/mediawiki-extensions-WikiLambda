/*!
 * WikiLambda unit test suite for the schemata mixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

/* eslint-disable no-undef */
var schemata = require( '../../../resources/ext.wikilambda.edit/mixins/schemata.js' ).methods,
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	canonicalize = schemata.canonicalizeZObject,
	normalize = schemata.normalizeZObject,
	extractErrorStructure = schemata.extractErrorStructure,
	extractZIDs = schemata.extractZIDs,
	fs = require( 'fs' ),
	path = require( 'path' );

describe( 'schemata mixin', function () {
	var normalInitialZObject = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/normalInitialZObject.json' ) ) ),
		canonicalInitialZObject = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/canonicalInitialZObject.json' ) ) ),
		normalZFunction = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/normalZFunction.json' ) ) ),
		canonicalZFunction = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/canonicalZFunction.json' ) ) ),
		normalZList = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/normalZList.json' ) ) ),
		canonicalZList = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/canonicalZList.json' ) ) ),
		simpleErrorObjectRelaxedFormat = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/simpleErrorObject_RelaxedFormat.json' ) ) ),
		fairlyComplexErrorObject = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/fairlyComplexErrorObject.json' ) ) ),
		fairlyComplexErrorObjectLocalKeys = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/fairlyComplexErrorObject_LocalKeys.json' ) ) );

	it( 'extracts ZID from normal string', function () {
		expect( extractZIDs( { Z1K1: Constants.Z_STRING, Z6K1: 'Hello, Test!' } ) ).toEqual(
			new Set( [ 'Z6' ] ) );
	} );

	it( 'extracts no ZID from canonical string', function () {
		expect( extractZIDs( 'Hello' ) ).toEqual(
			new Set( [] ) );
	} );

	it( 'extracts ZID from canonical reference', function () {
		expect( extractZIDs( 'Z10023' ) ).toEqual(
			new Set( [ 'Z10023' ] ) );
	} );

	it( 'extracts ZIDs from normal function', function () {
		expect( extractZIDs( normalZFunction ) ).toEqual(
			new Set( [ 'Z10023', 'Z11', 'Z12', 'Z14', 'Z16', 'Z17', 'Z2', 'Z6', 'Z61', 'Z8', 'Z9' ] ) );
	} );

	it( 'extracts ZIDs from canonical function', function () {
		expect( extractZIDs( canonicalZFunction ) ).toEqual(
			new Set( [ 'Z10023', 'Z11', 'Z12', 'Z14', 'Z16', 'Z17', 'Z2', 'Z6', 'Z61', 'Z8' ] ) );
	} );

	it( 'extracts error structure from a simple error object in relaxed format', function () {
		// TODO( ): Remove this test after the relaxed format is no longer produced
		expect( extractErrorStructure( simpleErrorObjectRelaxedFormat ) ).toEqual(
			[ { children: [], errorType: 'Z500', explanation: 'Arbitrary handcrafted message' } ] );
	} );

	it( 'extracts error structure from fairly complex error object', function () {
		expect( extractErrorStructure( fairlyComplexErrorObject ) ).toEqual(
			[ { children: [ { children: [ { children: [], errorType: 'Z532' },
				{ children: [], errorType: 'Z535' },
				{ children: [], errorType: 'Z511' } ], errorType: 'Z509' } ], errorType: 'Z502' } ]
		);
	} );

	it( 'extracts error structure from fairly complex error object with local keys', function () {
		expect( extractErrorStructure( fairlyComplexErrorObjectLocalKeys ) ).toEqual(
			[ { children: [ { children: [ { children: [], errorType: 'Z532' },
				{ children: [], errorType: 'Z535' },
				{ children: [], errorType: 'Z511' } ], errorType: 'Z509' } ], errorType: 'Z502' } ]
		);
	} );

	it( 'canonicalizes strings', function () {
		expect( canonicalize( { Z1K1: Constants.Z_STRING, Z6K1: 'Hello, Test!' } ) ).toEqual( 'Hello, Test!' );
	} );

	it( 'canonicalizes references', function () {
		expect( canonicalize( { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z1000' } ) ).toEqual( 'Z1000' );
	} );

	it( 'canonicalizes real suspicious-lookin\' Z6s', function () {
		expect( canonicalize( { Z1K1: Constants.Z_STRING, Z6K1: 'Z1000' } ) ).toEqual( { Z1K1: Constants.Z_STRING, Z6K1: 'Z1000' } );
	} );

	it( 'canonicalize handles Z0 because the front end uses it', function () {
		expect( canonicalize( { Z1K1: Constants.Z_REFERENCE, Z9K1: Constants.NEW_ZID_PLACEHOLDER } ) ).toEqual( 'Z0' );
	} );

	it( 'normalizes canonical input - initial ZObject', function () {
		expect( normalize( canonicalInitialZObject ) ).toEqual( normalInitialZObject );
	} );

	it( 'canonicalizes normal input - initial ZObject', function () {
		expect( canonicalize( normalInitialZObject ) ).toEqual( canonicalInitialZObject );
	} );

	it( 'canonicalized canonical input is identical - initial ZObject', function () {
		expect( canonicalize( canonicalInitialZObject ) ).toEqual( canonicalInitialZObject );
	} );

	it( 'normalized normal input is identical - initial ZObject', function () {
		expect( normalize( normalInitialZObject ) ).toEqual( normalInitialZObject );
	} );

	it( 'normalizes canonical input - ZFunction example', function () {
		expect( normalize( canonicalZFunction ) ).toEqual( normalZFunction );
	} );

	it( 'normalizes supremely sketch Z6s', function () {
		expect( normalize( { Z1K1: Constants.Z_STRING, Z6K1: 'Z1000' } ) ).toEqual( { Z1K1: Constants.Z_STRING, Z6K1: 'Z1000' } );
	} );

	it( 'normalizes Z9s', function () {
		expect( normalize( 'Z1000' ) ).toEqual( { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z1000' } );
	} );

	it( 'normalizes Z6s', function () {
		expect( normalize( 'not a reference' ) ).toEqual( { Z1K1: Constants.Z_STRING, Z6K1: 'not a reference' } );
	} );

	it( 'canonicalizes normal input - ZFunction example', function () {
		expect( canonicalize( normalZFunction ) ).toEqual( canonicalZFunction );
	} );

	it( 'canonicalized canonical input is identical - ZFunction example', function () {
		expect( canonicalize( canonicalZFunction ) ).toEqual( canonicalZFunction );
	} );

	it( 'normalized normal input is identical - ZFunction example', function () {
		expect( normalize( normalZFunction ) ).toEqual( normalZFunction );
	} );

	it( 'true normalized ZList is correctly canonicalized', function () {
		// This doesn't work the other way, because the UI can't create truly normal ZLists.
		expect( canonicalize( normalZList ) ).toEqual( canonicalZList );
	} );

	it( 'canonicalize an undefined string value as an empty string', function () {
		expect( canonicalize( { Z1K1: Constants.Z_STRING } ) ).toEqual( '' );
	} );

	it( 'canonicalize an undefined reference ID as an empty string', function () {
		expect( canonicalize( { Z1K1: Constants.Z_REFERENCE } ) ).toEqual( '' );
	} );

	it( 'canonicalize an undefined zobject as undefined', function () {
		expect( canonicalize( undefined ) ).toEqual( undefined );
	} );

	it( 'normalize an undefined zobject as undefined', function () {
		expect( normalize( undefined ) ).toEqual( undefined );
	} );
} );
