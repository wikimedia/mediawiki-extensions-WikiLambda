/*!
 * WikiLambda unit test suite for the TypeSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' ),
	shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	mockApiZids = require( '../../fixtures/mocks.js' ).mockApiZids,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	TypeSelector = require( '../../../../resources/ext.wikilambda.edit/components/base/TypeSelector.vue' );

describe( 'TypeSelector', () => {

	let getters, actions;
	const state = {
		zobject: [],
		objects: {},
		labels: {}
	};

	beforeEach( () => {
		getters = {
			getExpectedTypeOfKey: createGettersWithFunctionsMock(),
			getLabel: createGettersWithFunctionsMock(),
			getStoredObject: createGettersWithFunctionsMock(),
			getZObjectTypeByRowId: createGettersWithFunctionsMock( Constants.Z_REFERENCE ),
			getZFunctionCallFunctionId: createGettersWithFunctionsMock(),
			getZFunctionCallArguments: createGettersWithFunctionsMock( [] ),
			getZReferenceTerminalValue: createGettersWithFunctionsMock()
		};
		actions = {
			changeType: jest.fn(),
			setZFunctionCallArguments: jest.fn()
		};
		global.store.hotUpdate( {
			state: state,
			getters: getters,
			actions: actions
		} );
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
			getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( Constants.Z_STRING );
			global.store.hotUpdate( { getters: getters } );

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
			getters.getZObjectTypeByRowId = () => ( id ) => {
				return ( id === 1 ) ? Constants.Z_FUNCTION_CALL : Constants.Z_REFERENCE;
			};
			getters.getZFunctionCallFunctionId = createGettersWithFunctionsMock( Constants.Z_TYPED_LIST );
			getters.getZFunctionCallArguments = createGettersWithFunctionsMock( [
				{ id: 2, parent: 1, key: Constants.Z_TYPED_LIST_TYPE }
			] );
			getters.getLabel = () => ( key ) => `label of ${key}`;
			getters.getExpectedTypeOfKey = () => ( key ) => `expected type of ${key}`;
			global.store.hotUpdate( { getters: getters } );

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
			expect( args[ 0 ].props( 'label' ) ).toBe( 'label of Z881K1' );
			expect( args[ 0 ].props( 'type' ) ).toBe( 'expected type of Z881K1' );
		} );

		it( 'renders non-terminal type and two argument fields', () => {
			getters.getZObjectTypeByRowId = () => ( id ) => {
				return ( id === 1 ) ? Constants.Z_FUNCTION_CALL : Constants.Z_REFERENCE;
			};
			getters.getZFunctionCallFunctionId = createGettersWithFunctionsMock( Constants.Z_TYPED_PAIR );
			getters.getZFunctionCallArguments = createGettersWithFunctionsMock( [
				{ id: 2, parent: 1, key: Constants.Z_TYPED_PAIR_TYPE1 },
				{ id: 3, parent: 1, key: Constants.Z_TYPED_PAIR_TYPE2 }
			] );
			getters.getLabel = () => ( key ) => `label of ${key}`;
			getters.getExpectedTypeOfKey = () => ( key ) => `expected type of ${key}`;
			global.store.hotUpdate( { getters: getters } );

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
			expect( args[ 0 ].props( 'label' ) ).toBe( 'label of Z882K1' );
			expect( args[ 0 ].props( 'type' ) ).toBe( 'expected type of Z882K1' );

			// Second arg
			expect( args[ 1 ].props( 'rowId' ) ).toBe( 3 );
			expect( args[ 1 ].props( 'label' ) ).toBe( 'label of Z882K2' );
			expect( args[ 1 ].props( 'type' ) ).toBe( 'expected type of Z882K2' );
		} );
	} );

	describe( 'on value change', () => {
		it( 'sets a terminal value', async () => {
			getters.getStoredObject = createGettersWithFunctionsMock( mockApiZids.Z6 );
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( TypeSelector, {
				props: {
					rowId: 1,
					type: Constants.Z_TYPE
				},
				global: { stubs: { CdxField: false } }
			} );

			const lookup = wrapper.getComponent( { name: 'wl-z-object-selector' } );
			lookup.vm.$emit( 'input', Constants.Z_STRING );

			// Set the selected reference
			await waitFor( () => expect( actions.changeType ).toHaveBeenCalledTimes( 1 ) );
			expect( actions.changeType ).toHaveBeenCalledWith( expect.anything(), {
				id: 1,
				type: Constants.Z_REFERENCE,
				value: Constants.Z_STRING
			} );

			// Do not set function call arguments
			await waitFor( () => expect( actions.setZFunctionCallArguments ).toHaveBeenCalledTimes( 0 ) );
		} );

		it( 'sets a non-terminal value', async () => {
			getters.getStoredObject = createGettersWithFunctionsMock( mockApiZids.Z881 );
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( TypeSelector, {
				props: {
					rowId: 1,
					type: Constants.Z_TYPE
				},
				global: { stubs: { CdxField: false } }
			} );

			const lookup = wrapper.getComponent( { name: 'wl-z-object-selector' } );
			lookup.vm.$emit( 'input', Constants.Z_TYPED_LIST );

			// Set the selected function call
			await waitFor( () => expect( actions.changeType ).toHaveBeenCalledTimes( 1 ) );
			expect( actions.changeType ).toHaveBeenCalledWith( expect.anything(), {
				id: 1,
				type: Constants.Z_FUNCTION_CALL,
				value: Constants.Z_TYPED_LIST
			} );

			// Set the function call arguments
			await waitFor( () => expect( actions.setZFunctionCallArguments ).toHaveBeenCalledTimes( 1 ) );
			expect( actions.setZFunctionCallArguments ).toHaveBeenCalledWith( expect.anything(), {
				parentId: 1,
				functionZid: Constants.Z_TYPED_LIST
			} );
		} );
	} );
} );
