/* eslint-disable no-undef */
var schemata = require( '../../../resources/ext.wikilambda.edit/mixins/schemata.js' ).methods,
	canonicalize = schemata.canonicalizeZObject,
	normalize = schemata.normalizeZObject,
	fs = require( 'fs' ),
	path = require( 'path' );

describe( 'schemata mixin', function () {
	var normalInitialZObject = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/normalInitialZObject.json' ) ) ),
		canonicalInitialZObject = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/canonicalInitialZObject.json' ) ) ),
		normalZFunction = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/normalZFunction.json' ) ) ),
		canonicalZFunction = JSON.parse( fs.readFileSync( path.join( __dirname, './schemata/canonicalZFunction.json' ) ) );

	it( 'canonicalizes strings', function () {
		expect( canonicalize( { Z1K1: 'Z6', Z6K1: 'Hello, Test!' } ) ).toEqual( 'Hello, Test!' );
	} );

	it( 'canonicalizes references', function () {
		expect( canonicalize( { Z1K1: 'Z9', Z9K1: 'Z1000' } ) ).toEqual( 'Z1000' );
	} );

	it( 'canonicalizes real suspicious-lookin\' Z6s', function () {
		expect( canonicalize( { Z1K1: 'Z6', Z6K1: 'Z1000' } ) ).toEqual( { Z1K1: 'Z6', Z6K1: 'Z1000' } );
	} );

	it( 'canonicalize handles Z0 because the front end uses it', function () {
		expect( canonicalize( { Z1K1: 'Z9', Z9K1: 'Z0' } ) ).toEqual( 'Z0' );
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
		expect( normalize( { Z1K1: 'Z6', Z6K1: 'Z1000' } ) ).toEqual( { Z1K1: 'Z6', Z6K1: 'Z1000' } );
	} );

	it( 'normalizes Z9s', function () {
		expect( normalize( 'Z1000' ) ).toEqual( { Z1K1: 'Z9', Z9K1: 'Z1000' } );
	} );

	it( 'normalizes Z6s', function () {
		expect( normalize( 'not a reference' ) ).toEqual( { Z1K1: 'Z6', Z6K1: 'not a reference' } );
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
} );
