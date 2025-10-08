/*!
 * WikiLambda unit test suite for the useType composable.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const loadComposable = require( '../helpers/loadComposable.js' );
const useType = require( '../../../resources/ext.wikilambda.app/composables/useType.js' );

describe( 'useType', () => {
	let type;

	beforeEach( () => {
		const [ result ] = loadComposable( () => useType() );
		type = result;
	} );

	it( 'exposes getScaffolding method', () => {
		expect( typeof type.getScaffolding ).toBe( 'function' );
	} );

	it( 'exposes getZidOfGlobalKey method', () => {
		expect( typeof type.getZidOfGlobalKey ).toBe( 'function' );
	} );

	it( 'exposes isKeyTypedListType method', () => {
		expect( typeof type.isKeyTypedListType ).toBe( 'function' );
	} );

	it( 'exposes isKeyTypedListItem method', () => {
		expect( typeof type.isKeyTypedListItem ).toBe( 'function' );
	} );

	it( 'exposes isLocalKey method', () => {
		expect( typeof type.isLocalKey ).toBe( 'function' );
	} );

	it( 'exposes isValidZidFormat method', () => {
		expect( typeof type.isValidZidFormat ).toBe( 'function' );
	} );

	it( 'exposes typeToString method', () => {
		expect( typeof type.typeToString ).toBe( 'function' );
	} );

	it( 'isValidZidFormat validates correct ZIDs', () => {
		expect( type.isValidZidFormat( 'Z1' ) ).toBe( true );
		expect( type.isValidZidFormat( 'Z123' ) ).toBe( true );
		expect( type.isValidZidFormat( 'Z99999' ) ).toBe( true );
	} );

	it( 'isValidZidFormat rejects invalid ZIDs', () => {
		expect( type.isValidZidFormat( 'invalid' ) ).toBe( false );
		expect( type.isValidZidFormat( 'Z' ) ).toBe( false );
		expect( type.isValidZidFormat( '123' ) ).toBe( false );
		expect( type.isValidZidFormat( '' ) ).toBe( false );
		expect( type.isValidZidFormat( null ) ).toBe( false );
	} );
} );
