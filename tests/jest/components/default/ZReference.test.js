/*!
 * WikiLambda unit test suite for the default ZReference component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock;
const createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock;
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const ZReference = require( '../../../../resources/ext.wikilambda.app/components/default-view-types/ZReference.vue' );

describe( 'ZReference', () => {
	let store;
	beforeEach( () => {
		store = useMainStore();
		store.getLabelData = createLabelDataMock( {
			Z6: 'String'
		} );
		store.getParentRowId = createGettersWithFunctionsMock( 2 );
		store.getZReferenceTerminalValue = createGettersWithFunctionsMock( 'Z6' );
		store.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z1K1' );
		store.getUserLangCode = 'en';
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
			store.getLabelData = createLabelDataMock();
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
			store.getZReferenceTerminalValue = createGettersWithFunctionsMock( 'Z6' );
			store.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z9K1' );

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
			store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_FUNCTION_CALL_FUNCTION );

			const wrapper = shallowMount( ZReference, {
				props: {
					edit: true,
					expectedType: Constants.Z_FUNCTION,
					parentExpectedType: Constants.Z_STRING
				}
			} );

			expect( wrapper.vm.returnType ).toBe( Constants.Z_STRING );
			expect( wrapper.vm.type ).toBe( Constants.Z_FUNCTION );
		} );

		it( 'returns empty returnType when the key is a function call but parent expected type is unbound', async () => {
			store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_FUNCTION_CALL_FUNCTION );

			const wrapper = shallowMount( ZReference, {
				props: {
					edit: true,
					expectedType: Constants.Z_FUNCTION,
					parentExpectedType: Constants.Z_OBJECT
				}
			} );

			expect( wrapper.vm.returnType ).toBe( undefined );
			expect( wrapper.vm.type ).toBe( Constants.Z_FUNCTION );
		} );

		it( 'returns empty returnType when the key is a function call but parent expected type is a resolver', async () => {
			store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_FUNCTION_CALL_FUNCTION );

			const wrapper = shallowMount( ZReference, {
				props: {
					edit: true,
					expectedType: Constants.Z_FUNCTION,
					parentExpectedType: Constants.Z_FUNCTION_CALL
				}
			} );

			expect( wrapper.vm.returnType ).toBe( undefined );
			expect( wrapper.vm.type ).toBe( Constants.Z_FUNCTION );
		} );

		it( 'sets excluded zids from root persistent content', () => {
			store.getParentRowId = createGettersWithFunctionsMock( 2 );
			store.getZObjectKeyByRowId = jest.fn( ( rowId ) => ( rowId === 1 ) ? 'Z1K1' : 'Z2K2' );

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
