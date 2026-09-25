/*!
 * WikiLambda unit test suite for the PlainTextEditor component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mount } = require( '@vue/test-utils' );
const PlainTextEditor = require( '../../../../resources/ext.wikilambda.app/components/base/PlainTextEditor.vue' );

describe( 'PlainTextEditor', () => {
	it( 'shows the value', () => {
		const wrapper = mount( PlainTextEditor, { props: { value: 'pepsi cola' } } );

		expect( wrapper.find( 'textarea' ).element.value ).toBe( 'pepsi cola' );
	} );

	it( 'emits change when the user types', async () => {
		const wrapper = mount( PlainTextEditor, { props: { value: '' } } );

		await wrapper.find( 'textarea' ).setValue( 'fanta' );

		expect( wrapper.emitted( 'change' ) ).toEqual( [ [ 'fanta' ] ] );
	} );

	it( 'is read-only when readOnly is set', () => {
		const wrapper = mount( PlainTextEditor, { props: { readOnly: true } } );

		expect( wrapper.find( 'textarea' ).attributes( 'readonly' ) ).toBeDefined();
		expect( wrapper.find( 'textarea' ).attributes( 'disabled' ) ).toBeUndefined();
	} );

	it( 'is read-only and disabled when disabled is set', () => {
		const wrapper = mount( PlainTextEditor, { props: { disabled: true } } );

		expect( wrapper.find( 'textarea' ).attributes( 'readonly' ) ).toBeDefined();
		expect( wrapper.find( 'textarea' ).attributes( 'disabled' ) ).toBeDefined();
	} );
} );
