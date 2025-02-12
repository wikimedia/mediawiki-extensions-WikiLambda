/*!
 * WikiLambda unit test suite for the TypeSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mount } = require( '@vue/test-utils' );
const { createLabelDataMock } = require( '../../helpers/getterHelpers.js' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const TypeToString = require( '../../../../resources/ext.wikilambda.app/components/base/TypeToString.vue' );

describe( 'TypeToString', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getUserLangCode = 'en';
		store.getLabelData = createLabelDataMock( {
			Z6: 'String',
			Z881: 'Typed list'
		} );
	} );

	describe( 'for simple type', () => {
		it( 'renders type link', () => {
			const wrapper = mount( TypeToString, {
				props: {
					type: Constants.Z_STRING
				}
			} );

			const link = wrapper.find( 'a' );
			expect( link.text() ).toBe( 'String' );
			expect( link.attributes() ).toHaveProperty( 'href' );
			expect( link.attributes().href ).toContain( 'Z6' );
		} );
	} );

	describe( 'for generic type', () => {
		it( 'renders type link', () => {
			const wrapper = mount( TypeToString, {
				props: {
					type: {
						Z1K1: Constants.Z_FUNCTION_CALL,
						Z7K1: Constants.Z_TYPED_LIST,
						Z881K1: Constants.Z_STRING
					}
				}
			} );

			const link = wrapper.find( 'a' );
			expect( link.text() ).toBe( 'Typed list' );
			expect( link.attributes() ).toHaveProperty( 'href' );
			expect( link.attributes().href ).toContain( 'Z881' );
		} );

		it( 'renders argument', () => {
			const wrapper = mount( TypeToString, {
				props: {
					type: {
						Z1K1: Constants.Z_FUNCTION_CALL,
						Z7K1: Constants.Z_TYPED_LIST,
						Z881K1: Constants.Z_STRING
					}
				}
			} );

			const args = wrapper.findAllComponents( { name: 'wl-type-to-string' } );
			expect( args.length ).toBe( 1 );

			const link = args[ 0 ].find( 'a' );
			expect( link.text() ).toBe( 'String' );
			expect( link.attributes() ).toHaveProperty( 'href' );
			expect( link.attributes().href ).toContain( 'Z6' );
		} );
	} );
} );
