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

	it( 'normalizes canonical input - initial ZObject', function () {
		expect( normalize( canonicalInitialZObject ) ).toEqual( normalInitialZObject );
	} );

	it( 'canonicalizes normal input - initial ZObject', function () {
		expect( canonicalize( normalInitialZObject ) ).toEqual( canonicalInitialZObject );
	} );

	it( 'normalizes canonical input - ZFunction example', function () {
		expect( normalize( canonicalZFunction ) ).toEqual( normalZFunction );
	} );

	it( 'canonicalizes normal input - ZFunction example', function () {
		expect( canonicalize( normalZFunction ) ).toEqual( canonicalZFunction );
	} );
} );
