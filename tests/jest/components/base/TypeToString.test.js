/*!
 * WikiLambda unit test suite for the TypeSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGetterMock = require( '../../helpers/getterHelpers.js' ).createGetterMock,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	TypeToString = require( '../../../../resources/ext.wikilambda.edit/components/base/TypeToString.vue' );

describe( 'TypeToString', () => {

	let getters, actions;

	beforeEach( () => {
		getters = {
			getUserLangCode: createGetterMock( 'en' ),
			getLabel: jest.fn( () => ( zid ) => {
				const labels = {
					Z6: 'String',
					Z881: 'Typed list'
				};
				return labels[ zid ] ? labels[ zid ] : zid;
			} )
		};
		actions = {
			fetchZids: jest.fn()
		};
		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );

	describe( 'for simple type', () => {
		it( 'renders type link', () => {
			const wrapper = shallowMount( TypeToString, {
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
			const wrapper = shallowMount( TypeToString, {
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
			const wrapper = shallowMount( TypeToString, {
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
