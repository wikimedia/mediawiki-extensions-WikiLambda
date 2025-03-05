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
	it( 'renders without error in view mode', () => {
		const wrapper = shallowMount( ZTypedListType, {
			props: {
				keyPath,
				objectValue,
				edit: false
			}
		} );

		expect( wrapper.find( 'div' ).exists() ).toBe( true );
	} );

	it( 'renders without error in edit mode', () => {
		const wrapper = shallowMount( ZTypedListType, {
			props: {
				keyPath,
				objectValue,
				edit: true
			}
		} );

		expect( wrapper.find( 'div' ).exists() ).toBe( true );
	} );

	it( 'renders zobject key value component for the benjamin item', () => {
		const wrapper = shallowMount( ZTypedListType, {
			props: {
				keyPath,
				objectValue,
				edit: true
			},
			global: {
				stubs: {
					WlZObjectKeyValue: false
				}
			}
		} );

		const keyValue = wrapper.findComponent( { name: 'wl-z-object-key-value' } );

		expect( keyValue.exists() ).toBeTruthy();
		expect( keyValue.vm.keyPath ).toBe( 'main.Z2K2.0' );
		expect( keyValue.vm.objectValue ).toEqual( wrapper.vm.objectValue );
	} );

	it( 'bubbles up typeChange event when type changes', () => {
		const wrapper = shallowMount( ZTypedListType, {
			props: {
				keyPath,
				objectValue,
				edit: true
			},
			global: {
				stubs: {
					WlZObjectKeyValue: false
				}
			}
		} );

		const mockPayload = { keyPath: [], value: Constants.Z_CHARACTER };

		wrapper.findComponent( { name: 'wl-z-object-key-value' } ).vm.$emit( 'typed-list-type-changed', mockPayload );

		expect( wrapper.emitted() ).toHaveProperty( 'type-changed', [ [ mockPayload ] ] );
	} );
} );
