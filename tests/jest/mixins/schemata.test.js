/* eslint-disable no-undef */
var schemata = require( '../../../resources/ext.wikilambda.edit/mixins/schemata.js' ).methods,
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	canonicalize = schemata.canonicalizeZObject,
	normalize = schemata.normalizeZObject,
	fs = require( 'fs' ),
	path = require( 'path' );

describe( 'schemata mixin', function () {
	var normalInitialZObject = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/normalInitialZObject.json' ) ) ),
		canonicalInitialZObject = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/canonicalInitialZObject.json' ) ) ),
		normalZFunction = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/normalZFunction.json' ) ) ),
		canonicalZFunction = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/canonicalZFunction.json' ) ) ),
		normalZList = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/normalZList.json' ) ) ),
		canonicalZList = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/canonicalZList.json' ) ) );

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
