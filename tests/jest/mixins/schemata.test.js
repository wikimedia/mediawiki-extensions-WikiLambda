/*!
 * WikiLambda unit test suite for the schemata mixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

var schemata = require( '../../../resources/ext.wikilambda.edit/mixins/schemata.js' ).methods,
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	hybridToCanonical = schemata.hybridToCanonical,
	canonicalToHybrid = schemata.canonicalToHybrid,
	extractErrorStructure = schemata.extractErrorStructure,
	extractZIDs = schemata.extractZIDs,
	fs = require( 'fs' ),
	path = require( 'path' );

describe( 'schemata mixin', function () {
	var hybridInitialZObject = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/hybridInitialZObject.json' ) ) ),
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

	it( 'extracts ZID from normal string', function () {
		expect( extractZIDs( { Z1K1: Constants.Z_STRING, Z6K1: 'Hello, Test!' } ) ).toEqual(
			[ 'Z1', 'Z6' ]
		);
	} );

	it( 'extracts no ZID from canonical string', function () {
		expect( extractZIDs( 'Hello' ) ).toEqual(
			[]
		);
	} );

	it( 'extracts ZID from canonical reference', function () {
		expect( extractZIDs( 'Z10023' ) ).toEqual(
			[ 'Z10023' ]
		);
	} );

	it( 'extracts ZIDs from hybrid function', function () {
		expect( extractZIDs( hybridZFunction ) ).toEqual(
			[ 'Z1', 'Z9', 'Z2', 'Z6', 'Z10023', 'Z8', 'Z17', 'Z12', 'Z11', 'Z14', 'Z16', 'Z61' ]
		);
	} );

	it( 'extracts ZIDs from canonical function', function () {
		expect( extractZIDs( canonicalZFunction ) ).toEqual(
			[ 'Z1', 'Z2', 'Z6', 'Z10023', 'Z8', 'Z17', 'Z12', 'Z11', 'Z14', 'Z16', 'Z61' ]
		);
	} );

	it( 'extracts error structure from a simple error object in relaxed format', function () {
		// TODO: Remove this test after the relaxed format is no longer produced
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
		expect( hybridToCanonical( { Z1K1: Constants.Z_STRING, Z6K1: 'Hello, Test!' } ) ).toEqual( 'Hello, Test!' );
	} );

	it( 'canonicalizes references', function () {
		expect( hybridToCanonical( { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z1000' } ) ).toEqual( 'Z1000' );
	} );

	it( 'canonicalizes real suspicious-lookin\' Z6s', function () {
		expect( hybridToCanonical( { Z1K1: Constants.Z_STRING, Z6K1: 'Z1000' } ) ).toEqual( { Z1K1: Constants.Z_STRING, Z6K1: 'Z1000' } );
	} );

	it( 'hybridToCanonical handles Z0 because the front end uses it', function () {
		expect( hybridToCanonical( { Z1K1: Constants.Z_REFERENCE, Z9K1: Constants.NEW_ZID_PLACEHOLDER } ) ).toEqual( 'Z0' );
	} );

	it( 'hybridizes canonical input - initial ZObject', function () {
		expect( canonicalToHybrid( canonicalInitialZObject ) ).toEqual( hybridInitialZObject );
	} );

	it( 'canonicalizes hybrid input - initial ZObject', function () {
		expect( hybridToCanonical( hybridInitialZObject ) ).toEqual( canonicalInitialZObject );
	} );

	it( 'canonicalized canonical input is identical - initial ZObject', function () {
		expect( hybridToCanonical( canonicalInitialZObject ) ).toEqual( canonicalInitialZObject );
	} );

	it( 'hybridized hybrid input is identical - initial ZObject', function () {
		expect( canonicalToHybrid( hybridInitialZObject ) ).toEqual( hybridInitialZObject );
	} );

	it( 'hybridizes canonical input - Large ZQuote example', function () {
		expect( canonicalToHybrid( canonicalResultWithLargeZQuote ) ).toEqual( hybridResultWithLargeZQuote );
	} );

	it( 'canonicalizes hybrid input - Large ZQuote example', function () {
		expect( hybridToCanonical( hybridResultWithLargeZQuote ) ).toEqual( canonicalResultWithLargeZQuote );
	} );

	it( 'hybridized hybrid input is identical - Large ZQuote example', function () {
		expect( canonicalToHybrid( hybridResultWithLargeZQuote ) ).toEqual( hybridResultWithLargeZQuote );
	} );

	it( 'canonicalized canonical input is identical - Large ZQuote example', function () {
		expect( hybridToCanonical( canonicalResultWithLargeZQuote ) ).toEqual( canonicalResultWithLargeZQuote );
	} );

	it( 'hybridizes canonical input - ZFunction example', function () {
		expect( canonicalToHybrid( canonicalZFunction ) ).toEqual( hybridZFunction );
	} );

	it( 'hybridizes supremely sketch Z6s', function () {
		expect( canonicalToHybrid( { Z1K1: Constants.Z_STRING, Z6K1: 'Z1000' } ) ).toEqual( { Z1K1: Constants.Z_STRING, Z6K1: 'Z1000' } );
	} );

	it( 'hybridizes Z9s', function () {
		expect( canonicalToHybrid( 'Z1000' ) ).toEqual( { Z1K1: Constants.Z_REFERENCE, Z9K1: 'Z1000' } );
	} );

	it( 'hybridizes Z6s', function () {
		expect( canonicalToHybrid( 'not a reference' ) ).toEqual( { Z1K1: Constants.Z_STRING, Z6K1: 'not a reference' } );
	} );

	it( 'canonicalizes hybrid input - ZFunction example', function () {
		expect( hybridToCanonical( hybridZFunction ) ).toEqual( canonicalZFunction );
	} );

	it( 'canonicalized canonical input is identical - ZFunction example', function () {
		expect( hybridToCanonical( canonicalZFunction ) ).toEqual( canonicalZFunction );
	} );

	it( 'hybridized hybrid input is identical - ZFunction example', function () {
		expect( canonicalToHybrid( hybridZFunction ) ).toEqual( hybridZFunction );
	} );

	it( 'hybrid ZList is correctly canonicalized', function () {
		expect( hybridToCanonical( hybridZList ) ).toEqual( canonicalZList );
	} );

	it( 'normal ZList is correctly canonicalized', function () {
		expect( hybridToCanonical( normalZList ) ).toEqual( canonicalZList );
	} );

	it( 'normal function call is correctly canonicalized', function () {
		expect( hybridToCanonical( normalFunctionCall ) ).toEqual( canonicalFunctionCall );
	} );

	it( 'canonical ZList is correctly hybridized', function () {
		expect( canonicalToHybrid( canonicalZList ) ).toEqual( hybridZList );
	} );

	it( 'canonicalize an undefined string value as an empty string', function () {
		expect( hybridToCanonical( { Z1K1: Constants.Z_STRING } ) ).toEqual( '' );
	} );

	it( 'canonicalize an undefined reference ID as an empty string', function () {
		expect( hybridToCanonical( { Z1K1: Constants.Z_REFERENCE } ) ).toEqual( '' );
	} );

	it( 'canonicalize an undefined zobject as undefined', function () {
		expect( hybridToCanonical( undefined ) ).toEqual( undefined );
	} );

	it( 'hybridize an undefined zobject as undefined', function () {
		expect( canonicalToHybrid( undefined ) ).toEqual( undefined );
	} );
} );
