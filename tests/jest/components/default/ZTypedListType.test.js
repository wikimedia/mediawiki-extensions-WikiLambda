/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const ZTypedListType = require( '../../../../resources/ext.wikilambda.app/components/types/ZTypedListType.vue' );

// General use
const keyPath = 'main.Z2K2';
const objectValue = { Z1K1: 'Z9', Z9K1: 'Z6' };

describe( 'ZTypedListType', () => {
	/**
	 * Helper function to render ZTypedListType component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderZTypedListType( props = {}, options = {} ) {
		const defaultProps = {
			keyPath,
			objectValue,
			edit: false
		};
		const defaultOptions = {
			global: {
				stubs: {
					WlZObjectKeyValue: false,
					...options?.stubs
				}
			}
		};
		return shallowMount( ZTypedListType, {
			props: { ...defaultProps, ...props },
			...defaultOptions
		} );
	}

	it( 'renders without error in view mode', () => {
		const wrapper = renderZTypedListType();

		expect( wrapper.find( 'div' ).exists() ).toBe( true );
	} );

	it( 'renders without error in edit mode', () => {
		const wrapper = renderZTypedListType( { edit: true } );

		expect( wrapper.find( 'div' ).exists() ).toBe( true );
	} );

	it( 'renders zobject key value component for the benjamin item', () => {
		const wrapper = renderZTypedListType( { edit: true } );

		const keyValue = wrapper.findComponent( { name: 'wl-z-object-key-value' } );

		expect( keyValue.exists() ).toBe( true );
		expect( keyValue.props( 'keyPath' ) ).toBe( 'main.Z2K2.0' );
		expect( keyValue.props( 'objectValue' ) ).toEqual( objectValue );
	} );

	it( 'bubbles up typeChange event when type changes', () => {
		const wrapper = renderZTypedListType( { edit: true } );

		const mockPayload = { keyPath: [], value: Constants.Z_CHARACTER };

		wrapper.findComponent( { name: 'wl-z-object-key-value' } ).vm.$emit( 'typed-list-type-changed', mockPayload );

		expect( wrapper.emitted() ).toHaveProperty( 'type-changed', [ [ mockPayload ] ] );
	} );
} );
