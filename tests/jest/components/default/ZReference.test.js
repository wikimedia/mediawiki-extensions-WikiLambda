/*!
 * WikiLambda unit test suite for the default ZReference component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock,
	createGetterMock = require( '../../helpers/getterHelpers.js' ).createGetterMock,
	Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' ),
	ZReference = require( '../../../../resources/ext.wikilambda.app/components/default-view-types/ZReference.vue' );

describe( 'ZReference', () => {
	let getters;
	beforeEach( () => {
		getters = {
			getLabelData: createLabelDataMock( {
				Z6: 'String'
			} ),
			getParentRowId: createGettersWithFunctionsMock( 2 ),
			getZReferenceTerminalValue: createGettersWithFunctionsMock( 'Z6' ),
			getZObjectKeyByRowId: createGettersWithFunctionsMock( 'Z1K1' ),
			getUserLangCode: createGetterMock( 'en' )
		};
		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZReference, {
				props: {
					edit: false,
					expectedType: Constants.Z_STRING
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays the reference link with its label if there is one', () => {
			const wrapper = shallowMount( ZReference, {
				props: {
					edit: false,
					expectedType: Constants.Z_STRING
				}
			} );

			const referenceLink = wrapper.get( 'a' );
			expect( referenceLink.attributes().href ).toBe( '/view/en/Z6' );
			expect( referenceLink.text() ).toBe( 'String' );
		} );

		it( 'displays the reference link with its value if there is no label', () => {
			getters.getLabelData = createLabelDataMock();
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZReference, {
				props: {
					edit: false,
					expectedType: Constants.Z_STRING
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
					edit: true,
					expectedType: Constants.Z_STRING
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays a selector and emits the value with a Z_REFERENCE_ID (Z9K1) keyPath if its key is not a Z_REFERENCE_ID', async () => {
			const wrapper = shallowMount( ZReference, {
				props: {
					edit: true,
					expectedType: Constants.Z_STRING
				}
			} );

			expect( wrapper.getComponent( { name: 'wl-z-object-selector' } ).exists() ).toBeTruthy();

			await wrapper.getComponent( { name: 'wl-z-object-selector' } ).vm.$emit( 'select-item', 'String' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [ 'Z9K1' ], value: 'String' } ] ] );
		} );

		it( 'displays a selector and emits the value with an empty keyPath if its key is a Z_REFERENCE_ID (Z9K1)', async () => {
			getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( 'Z6' );
			getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z9K1' );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZReference, {
				props: {
					edit: true,
					expectedType: Constants.Z_STRING
				}
			} );

			expect( wrapper.getComponent( { name: 'wl-z-object-selector' } ).exists() ).toBeTruthy();

			await wrapper.getComponent( { name: 'wl-z-object-selector' } ).vm.$emit( 'select-item', 'String' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [], value: 'String' } ] ] );
		} );

		it( 'binds the returnType to the selector when key is a function call function', async () => {
			getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_FUNCTION_CALL_FUNCTION );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZReference, {
				props: {
					edit: true,
					expectedType: Constants.Z_FUNCTION,
					parentExpectedType: Constants.Z_STRING
				}
			} );

			expect( wrapper.vm.returnType ).toBe( Constants.Z_STRING );
			expect( wrapper.vm.type ).toBe( '' );
		} );

		it( 'returns empty returnType when the key is a function call but parent expected type is unbound', async () => {
			getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_FUNCTION_CALL_FUNCTION );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZReference, {
				props: {
					edit: true,
					expectedType: Constants.Z_FUNCTION,
					parentExpectedType: Constants.Z_OBJECT
				}
			} );

			expect( wrapper.vm.returnType ).toBe( '' );
			expect( wrapper.vm.type ).toBe( Constants.Z_FUNCTION );
		} );

		it( 'returns empty returnType when the key is a function call but parent expected type is a resolver', async () => {
			getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_FUNCTION_CALL_FUNCTION );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZReference, {
				props: {
					edit: true,
					expectedType: Constants.Z_FUNCTION,
					parentExpectedType: Constants.Z_FUNCTION_CALL
				}
			} );

			expect( wrapper.vm.returnType ).toBe( '' );
			expect( wrapper.vm.type ).toBe( Constants.Z_FUNCTION );
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
