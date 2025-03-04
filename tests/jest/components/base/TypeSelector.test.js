/*!
 * WikiLambda unit test suite for the TypeSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' );
const { shallowMount } = require( '@vue/test-utils' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../helpers/getterHelpers.js' );
const { mockStoredObjects } = require( '../../fixtures/mocks.js' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const TypeSelector = require( '../../../../resources/ext.wikilambda.app/components/base/TypeSelector.vue' );

describe( 'TypeSelector', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getLabelData = createLabelDataMock( {
			Z881K1: 'item type',
			Z882K1: 'first type',
			Z882K2: 'second type'
		} );
		store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
		store.getZFunctionCallArguments = createGettersWithFunctionsMock( [] );
	} );

	describe( 'on initialization', () => {
		it( 'renders blank type field', () => {
			const wrapper = shallowMount( TypeSelector, {
				props: {
					rowId: 1,
					type: Constants.Z_TYPE
				},
				global: { stubs: { CdxField: false } }
			} );

			const lookup = wrapper.getComponent( { name: 'wl-z-object-selector' } );
			expect( lookup.exists() ).toBe( true );
			expect( lookup.props( 'selectedZid' ) ).toBe( '' );
		} );

		it( 'renders terminal type field', () => {
			store.getZReferenceTerminalValue = createGettersWithFunctionsMock( Constants.Z_STRING );

			const wrapper = shallowMount( TypeSelector, {
				props: {
					rowId: 1,
					type: Constants.Z_TYPE
				},
				global: { stubs: { CdxField: false } }
			} );

			const lookup = wrapper.getComponent( { name: 'wl-z-object-selector' } );
			expect( lookup.exists() ).toBe( true );
			expect( lookup.props( 'selectedZid' ) ).toBe( Constants.Z_STRING );
		} );

		it( 'renders non-terminal type and one argument field', () => {
			store.getZObjectTypeByRowId = jest.fn( ( id ) => ( id === 1 ) ? Constants.Z_FUNCTION_CALL : Constants.Z_REFERENCE );
			store.getZFunctionCallFunctionId = createGettersWithFunctionsMock( Constants.Z_TYPED_LIST );
			store.getZFunctionCallArguments = createGettersWithFunctionsMock( [
				{ id: 2, parent: 1, key: Constants.Z_TYPED_LIST_TYPE }
			] );
			store.getExpectedTypeOfKey = jest.fn( ( key ) => `expected type of ${ key }` );

			const wrapper = shallowMount( TypeSelector, {
				props: {
					rowId: 1,
					type: Constants.Z_TYPE
				},
				global: { stubs: { CdxField: false } }
			} );

			const lookup = wrapper.getComponent( { name: 'wl-z-object-selector' } );
			expect( lookup.exists() ).toBe( true );
			expect( lookup.props( 'selectedZid' ) ).toBe( Constants.Z_TYPED_LIST );

			const args = wrapper.findAllComponents( { name: 'wl-type-selector' } );
			expect( args ).toHaveLength( 1 );

			expect( args[ 0 ].props( 'rowId' ) ).toBe( 2 );
			expect( args[ 0 ].props( 'labelData' ).label ).toBe( 'item type' );
			expect( args[ 0 ].props( 'type' ) ).toBe( 'expected type of Z881K1' );
		} );

		it( 'renders non-terminal type and two argument fields', () => {
			store.getZObjectTypeByRowId = jest.fn( ( id ) => ( id === 1 ) ? Constants.Z_FUNCTION_CALL : Constants.Z_REFERENCE );
			store.getZFunctionCallFunctionId = createGettersWithFunctionsMock( Constants.Z_TYPED_PAIR );
			store.getZFunctionCallArguments = createGettersWithFunctionsMock( [
				{ id: 2, parent: 1, key: Constants.Z_TYPED_PAIR_TYPE1 },
				{ id: 3, parent: 1, key: Constants.Z_TYPED_PAIR_TYPE2 }
			] );
			store.getExpectedTypeOfKey = jest.fn( ( key ) => `expected type of ${ key }` );

			const wrapper = shallowMount( TypeSelector, {
				props: {
					rowId: 1,
					type: Constants.Z_TYPE
				},
				global: { stubs: { CdxField: false } }
			} );

			const lookup = wrapper.getComponent( { name: 'wl-z-object-selector' } );
			expect( lookup.exists() ).toBe( true );
			expect( lookup.props( 'selectedZid' ) ).toBe( Constants.Z_TYPED_PAIR );

			const args = wrapper.findAllComponents( { name: 'wl-type-selector' } );
			expect( args ).toHaveLength( 2 );

			// First arg
			expect( args[ 0 ].props( 'rowId' ) ).toBe( 2 );
			expect( args[ 0 ].props( 'labelData' ).label ).toBe( 'first type' );
			expect( args[ 0 ].props( 'type' ) ).toBe( 'expected type of Z882K1' );

			// Second arg
			expect( args[ 1 ].props( 'rowId' ) ).toBe( 3 );
			expect( args[ 1 ].props( 'labelData' ).label ).toBe( 'second type' );
			expect( args[ 1 ].props( 'type' ) ).toBe( 'expected type of Z882K2' );
		} );
	} );

	describe( 'on value change', () => {
		it( 'sets a terminal value', async () => {
			store.getStoredObject = createGettersWithFunctionsMock( mockStoredObjects.Z6.data );

			const wrapper = shallowMount( TypeSelector, {
				props: {
					rowId: 1,
					type: Constants.Z_TYPE
				},
				global: { stubs: { CdxField: false } }
			} );

			const lookup = wrapper.getComponent( { name: 'wl-z-object-selector' } );
			lookup.vm.$emit( 'select-item', Constants.Z_STRING );

			// Set the selected reference
			await waitFor( () => expect( store.changeType ).toHaveBeenCalledTimes( 1 ) );
			expect( store.changeType ).toHaveBeenCalledWith( {
				id: 1,
				type: Constants.Z_REFERENCE,
				value: Constants.Z_STRING
			} );

			// Do not set function call arguments
			await waitFor( () => expect( store.setZFunctionCallArguments ).toHaveBeenCalledTimes( 0 ) );
		} );

		it( 'sets a non-terminal value', async () => {
			store.getStoredObject = createGettersWithFunctionsMock( mockStoredObjects.Z881.data );

			const wrapper = shallowMount( TypeSelector, {
				props: {
					rowId: 1,
					type: Constants.Z_TYPE
				},
				global: { stubs: { CdxField: false } }
			} );

			const lookup = wrapper.getComponent( { name: 'wl-z-object-selector' } );
			lookup.vm.$emit( 'select-item', Constants.Z_TYPED_LIST );

			// Set the selected function call
			await waitFor( () => expect( store.changeType ).toHaveBeenCalledTimes( 1 ) );
			expect( store.changeType ).toHaveBeenCalledWith( {
				id: 1,
				type: Constants.Z_FUNCTION_CALL,
				value: Constants.Z_TYPED_LIST
			} );

			// Set the function call arguments
			await waitFor( () => expect( store.setZFunctionCallArguments ).toHaveBeenCalledTimes( 1 ) );
			expect( store.setZFunctionCallArguments ).toHaveBeenCalledWith( {
				parentId: 1,
				functionZid: Constants.Z_TYPED_LIST
			} );
		} );
	} );
} );
