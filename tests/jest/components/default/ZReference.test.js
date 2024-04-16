/*!
 * WikiLambda unit test suite for the default ZReference component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	ZReference = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZReference.vue' );

describe( 'ZReference', () => {
	let getters;
	beforeEach( () => {
		getters = {
			getLabel: createGettersWithFunctionsMock( 'String' ),
			getParentRowId: createGettersWithFunctionsMock( 2 ),
			getZReferenceTerminalValue: createGettersWithFunctionsMock( 'Z6' ),
			getZObjectKeyByRowId: createGettersWithFunctionsMock( 'Z1K1' )
		};
		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZReference, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays the reference link with its label if there is one', () => {
			const wrapper = shallowMount( ZReference, {
				props: {
					edit: false
				}
			} );

			const referenceLink = wrapper.get( 'a' );
			expect( referenceLink.attributes().href ).toBe( '/view/en/Z6' );
			expect( referenceLink.text() ).toBe( 'String' );
		} );

		it( 'displays the reference link with its value if there is no label', () => {
			// If there's no label data stored, getLabel returns input key
			getters.getLabel = createGettersWithFunctionsMock( 'Z6' );

			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZReference, {
				props: {
					edit: false
				}
			} );

			const referenceLink = wrapper.get( 'a' );
			expect( referenceLink.attributes().href ).toBe( '/view/en/Z6' );
			expect( referenceLink.text() ).toBe( 'Z6' );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZReference, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays a selector and emits the value with a Z_REFERENCE_ID (Z9K1) keyPath if its key is not a Z_REFERENCE_ID', async () => {
			const wrapper = shallowMount( ZReference, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.getComponent( { name: 'wl-z-object-selector' } ).exists() ).toBeTruthy();

			await wrapper.getComponent( { name: 'wl-z-object-selector' } ).vm.$emit( 'input', 'String' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [ 'Z9K1' ], value: 'String' } ] ] );
		} );

		it( 'displays a selector and emits the value with an empty keyPath if its key is a Z_REFERENCE_ID (Z9K1)', async () => {
			getters = {
				getLabel: createGettersWithFunctionsMock( 'String' ),
				getZReferenceTerminalValue: createGettersWithFunctionsMock( 'Z6' ),
				getZObjectKeyByRowId: createGettersWithFunctionsMock( 'Z9K1' )
			};
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZReference, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.getComponent( { name: 'wl-z-object-selector' } ).exists() ).toBeTruthy();

			await wrapper.getComponent( { name: 'wl-z-object-selector' } ).vm.$emit( 'input', 'String' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [], value: 'String' } ] ] );
		} );

		it( 'binds the input type to the selector', async () => {
			const wrapper = shallowMount( ZReference, {
				props: {
					edit: true,
					expectedType: Constants.Z_ARGUMENT_KEY
				}
			} );

			expect( wrapper.vm.selectType ).toBe( Constants.Z_ARGUMENT_KEY );
		} );

		it( 'sets excluded zids from root persistent content', () => {
			getters.getParentRowId = createGettersWithFunctionsMock( 2 );
			getters.getZObjectKeyByRowId = () => ( rowId ) => ( rowId === 1 ) ? 'Z1K1' : 'Z2K2';
			global.store.hotUpdate( {
				getters: getters
			} );
			const wrapper = shallowMount( ZReference, {
				props: {
					rowId: 1,
					edit: true,
					expectedType: 'Z4'
				}
			} );

			const selector = wrapper.getComponent( { name: 'wl-z-object-selector' } );
			expect( selector.vm.excludeZids ).toEqual( Constants.EXCLUDE_FROM_PERSISTENT_CONTENT );
		} );
	} );
} );
