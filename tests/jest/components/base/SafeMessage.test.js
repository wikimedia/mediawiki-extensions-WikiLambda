/*!
 * WikiLambda unit test suite for the SafeMessage component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mount } = require( '@vue/test-utils' );
const ErrorData = require( '../../../../resources/ext.wikilambda.app/store/classes/ErrorData.js' );
const SafeMessage = require( '../../../../resources/ext.wikilambda.app/components/base/SafeMessage.vue' );

describe( 'SafeMessage', () => {
	const errorSafe = new ErrorData( 'wikilambda-safe-error-message', [], null, 'error' );
	const errorUnsafe = new ErrorData( null, [], '<b>Some unsafe error message</b>', 'error' );

	beforeEach( () => {
		global.mw.message = jest.fn().mockReturnValue( {
			params: jest.fn().mockReturnValue( {
				parse: jest.fn().mockReturnValue( '<b>Some safe error message</b>' )
			} )
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = mount( SafeMessage, {
			props: {
				error: errorSafe
			}
		} );
		expect( wrapper.find( 'span' ).exists() ).toBe( true );
	} );

	it( 'renders safe error message as html', () => {
		const wrapper = mount( SafeMessage, {
			props: {
				error: errorSafe
			}
		} );
		expect( wrapper.find( 'span' ).exists() ).toBe( true );
		expect( wrapper.find( 'span' ).text() ).toBe( 'Some safe error message' );
		expect( wrapper.find( 'b' ).exists() ).toBe( true );
		expect( wrapper.find( 'b' ).text() ).toBe( 'Some safe error message' );
	} );

	it( 'renders unsafe error message as text', () => {
		const wrapper = mount( SafeMessage, {
			props: {
				error: errorUnsafe
			}
		} );
		expect( wrapper.find( 'span' ).exists() ).toBe( true );
		expect( wrapper.find( 'span' ).text() ).toBe( '<b>Some unsafe error message</b>' );
		expect( wrapper.find( 'b' ).exists() ).toBe( false );
	} );
} );
