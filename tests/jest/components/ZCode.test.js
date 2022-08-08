/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' );

var VueTestUtils = require( '@vue/test-utils' ),
	ZCode = require( '../../../resources/ext.wikilambda.edit/components/types/ZCode.vue' );

const zobjectId = 123;
const codeItemId = 456;
const initialCodeValue = 'initial';

describe( 'ZCode', () => {
	beforeEach( () => {
		global.store.hotUpdate( {
			mutations: {
				setCodeValue( state, value ) {
					state.codeValue = value;
				}
			},
			getters: {
				getZObjectChildrenById: ( state ) =>
					( id ) => {
						if ( id === zobjectId ) {
							return [ { key: Constants.Z_CODE_CODE, id: codeItemId } ];
						} else if ( id === codeItemId ) {
							return [ { key: Constants.Z_STRING_VALUE, value: state.codeValue } ];
						}
						return [];
					},
				getAllProgrammingLangs: jest.fn( () => {
					return {};
				} )
			}
		} );
		global.store.commit( 'setCodeValue', initialCodeValue );
	} );

	it( 'renders without errors', () => {
		var wrapper = VueTestUtils.shallowMount( ZCode );

		expect( wrapper.find( '.ext-wikilambda-zcode' ).exists() ).toBe( true );
	} );

	it( 'sets code value in editor on first load', () => {
		var wrapper = VueTestUtils.shallowMount( ZCode, { props: { zobjectId: zobjectId } } );

		expect( wrapper.findComponent( { name: 'code-editor' } ).props( 'value' ) ).toEqual( initialCodeValue );
	} );

	it( 'set code value in editor when it is updated in store following a language change', ( done ) => {
		var wrapper = VueTestUtils.shallowMount( ZCode, { props: { zobjectId: zobjectId } } );

		wrapper.findComponent( { name: 'cdx-select' } ).vm.$emit( 'update:selected' );
		global.store.commit( 'setCodeValue', 'new' );

		wrapper.vm.$nextTick( () => {
			expect( wrapper.findComponent( { name: 'code-editor' } ).props( 'value' ) ).toEqual( 'new' );
			done();
		} );
	} );

	it( 'does not set code value in editor when it is updated in store, if that update does not follow a language change', ( done ) => {
		var wrapper = VueTestUtils.shallowMount( ZCode, { props: { zobjectId: zobjectId } } );

		global.store.commit( 'setCodeValue', 'new' );

		wrapper.vm.$nextTick( () => {
			expect( wrapper.findComponent( { name: 'code-editor' } ).props( 'value' ) ).toEqual( initialCodeValue );
			done();
		} );
	} );
} );
