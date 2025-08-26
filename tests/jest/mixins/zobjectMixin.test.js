/*!
 * WikiLambda unit test suite for the zobjectMixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { shallowMount } = require( '@vue/test-utils' );

const zobjectMixin = require( '../../../resources/ext.wikilambda.app/mixins/zobjectMixin.js' );

describe( 'zobjectMixin mixin', () => {
	let wrapper;

	const createTestComponent = ( keyPath ) => {
		const TestComponent = {
			template: '<div></div>',
			mixins: [ zobjectMixin ],
			data() {
				return {
					keyPath
				};
			}
		};
		return shallowMount( TestComponent );
	};

	describe( 'computed properties', () => {
		describe( 'key', () => {
			it( 'returns undefined and does not fail if keyPath is not available', () => {
				wrapper = createTestComponent( undefined );
				expect( wrapper.vm.key ).toBe( undefined );
			} );

			it( 'returns undefined and does not fail if keyPath is not a string', () => {
				wrapper = createTestComponent( [ 'Z2K2' ] );
				expect( wrapper.vm.key ).toBe( undefined );
			} );

			it( 'returns the only key in the keyPath', () => {
				wrapper = createTestComponent( 'main' );
				expect( wrapper.vm.key ).toBe( 'main' );
			} );

			it( 'returns the last key in the keyPath', () => {
				wrapper = createTestComponent( 'main.Z2K2.Z7K1' );
				expect( wrapper.vm.key ).toBe( 'Z7K1' );
			} );
		} );

		describe( 'parentKey', () => {
			it( 'returns undefined and does not fail if keyPath is not available', () => {
				wrapper = createTestComponent( undefined );
				expect( wrapper.vm.parentKey ).toBe( undefined );
			} );

			it( 'returns undefined and does not fail if keyPath is not a string', () => {
				wrapper = createTestComponent( [ 'Z2K2' ] );
				expect( wrapper.vm.parentKey ).toBe( undefined );
			} );

			it( 'returns undefined and does not fail if keyPath only has one key', () => {
				wrapper = createTestComponent( 'main' );
				expect( wrapper.vm.parentKey ).toBe( undefined );
			} );

			it( 'returns the previous to last key in the keyPath', () => {
				wrapper = createTestComponent( 'main.Z2K2.Z7K1' );
				expect( wrapper.vm.parentKey ).toBe( 'Z2K2' );
			} );
		} );

		describe( 'depth', () => {
			it( 'returns 0 and does not fail if keyPath is not available', () => {
				wrapper = createTestComponent( undefined );
				expect( wrapper.vm.depth ).toBe( 0 );
			} );

			it( 'returns 0 and does not fail if keyPath is not a string', () => {
				wrapper = createTestComponent( [ 'Z2K2' ] );
				expect( wrapper.vm.depth ).toBe( 0 );
			} );

			it( 'returns depth 1 for one key in the keyPath', () => {
				wrapper = createTestComponent( 'main' );
				expect( wrapper.vm.depth ).toBe( 1 );
			} );

			it( 'returns depth 3 for three keys in the keyPath', () => {
				wrapper = createTestComponent( 'main.Z2K2.Z1K1' );
				expect( wrapper.vm.depth ).toBe( 3 );
			} );

			it( 'returns depth 6 for six keys in the keyPath', () => {
				const keyPath = 'main.Z2K2.Z14K2.Z13846K3.Z13578K1.Z18K1';
				wrapper = createTestComponent( keyPath );
				expect( wrapper.vm.depth ).toBe( 6 );
			} );

			it( 'returns depth 1 again for eight keys in the keyPath', () => {
				const keyPath = 'main.Z2K2.Z14K2.Z13846K3.Z13578K1.Z18K1.Z6K1';
				wrapper = createTestComponent( keyPath );
				expect( wrapper.vm.depth ).toBe( 1 );
			} );
		} );
	} );
} );
