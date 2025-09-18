/*!
 * WikiLambda unit test suite for the TypeSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../helpers/getterHelpers.js' );
const { mockStoredObjects } = require( '../../fixtures/mocks.js' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const TypeSelector = require( '../../../../resources/ext.wikilambda.app/components/base/TypeSelector.vue' );

describe( 'TypeSelector', () => {
	let store,
		keyPath,
		objectValue;

	beforeEach( () => {
		store = useMainStore();
		store.getExpectedTypeOfKey = createGettersWithFunctionsMock();
		store.getStoredObject = createGettersWithFunctionsMock();
		store.getLabelData = createLabelDataMock( {
			Z881K1: 'item type',
			Z882K1: 'first type',
			Z882K2: 'second type'
		} );
	} );

	describe( 'on initialization', () => {
		it( 'renders blank type field', () => {
			keyPath = 'main.Z2K2.Z8K2';
			objectValue = { Z1K1: 'Z9', Z9K1: '' };

			const wrapper = shallowMount( TypeSelector, {
				props: {
					keyPath,
					objectValue,
					type: Constants.Z_TYPE
				},
				global: { stubs: { CdxField: false } }
			} );

			const lookup = wrapper.getComponent( { name: 'wl-z-object-selector' } );
			expect( lookup.exists() ).toBe( true );
			expect( lookup.props( 'selectedZid' ) ).toBe( '' );
		} );

		it( 'renders terminal type field', () => {
			keyPath = 'main.Z2K2.Z8K2';
			objectValue = { Z1K1: 'Z9', Z9K1: 'Z6' };

			const wrapper = shallowMount( TypeSelector, {
				props: {
					keyPath,
					objectValue,
					type: Constants.Z_TYPE
				},
				global: { stubs: { CdxField: false } }
			} );

			const lookup = wrapper.getComponent( { name: 'wl-z-object-selector' } );
			expect( lookup.exists() ).toBe( true );
			expect( lookup.props( 'selectedZid' ) ).toBe( Constants.Z_STRING );
		} );

		it( 'renders non-terminal type and one argument field', () => {
			keyPath = 'main.Z2K2.Z8K2';
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
				Z7K1: { Z1K1: 'Z9', Z9K1: 'Z881' },
				Z881K1: { Z1K1: 'Z9', Z9K1: '' }
			};
			store.getExpectedTypeOfKey = createGettersWithFunctionsMock( 'Z4' );

			const wrapper = shallowMount( TypeSelector, {
				props: {
					keyPath,
					objectValue,
					type: Constants.Z_TYPE
				},
				global: { stubs: { CdxField: false } }
			} );

			const lookup = wrapper.getComponent( { name: 'wl-z-object-selector' } );
			expect( lookup.exists() ).toBe( true );
			expect( lookup.props( 'selectedZid' ) ).toBe( Constants.Z_TYPED_LIST );

			const args = wrapper.findAllComponents( { name: 'wl-type-selector' } );
			expect( args ).toHaveLength( 1 );

			expect( args[ 0 ].props( 'keyPath' ) ).toBe( 'main.Z2K2.Z8K2.Z881K1' );
			expect( args[ 0 ].props( 'objectValue' ) ).toEqual( { Z1K1: 'Z9', Z9K1: '' } );
			expect( args[ 0 ].props( 'labelData' ).label ).toBe( 'item type' );
			expect( args[ 0 ].props( 'type' ) ).toBe( 'Z4' );
		} );

		it( 'renders non-terminal type and two argument fields', () => {
			keyPath = 'main.Z2K2.Z8K2';
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
				Z7K1: { Z1K1: 'Z9', Z9K1: 'Z882' },
				Z882K1: { Z1K1: 'Z9', Z9K1: '' },
				Z882K2: { Z1K1: 'Z9', Z9K1: '' }
			};
			store.getExpectedTypeOfKey = createGettersWithFunctionsMock( 'Z4' );

			const wrapper = shallowMount( TypeSelector, {
				props: {
					keyPath,
					objectValue,
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
			expect( args[ 0 ].props( 'keyPath' ) ).toBe( 'main.Z2K2.Z8K2.Z882K1' );
			expect( args[ 0 ].props( 'objectValue' ) ).toEqual( { Z1K1: 'Z9', Z9K1: '' } );
			expect( args[ 0 ].props( 'labelData' ).label ).toBe( 'first type' );
			expect( args[ 0 ].props( 'type' ) ).toBe( 'Z4' );

			// Second arg
			expect( args[ 1 ].props( 'keyPath' ) ).toBe( 'main.Z2K2.Z8K2.Z882K2' );
			expect( args[ 1 ].props( 'objectValue' ) ).toEqual( { Z1K1: 'Z9', Z9K1: '' } );
			expect( args[ 1 ].props( 'labelData' ).label ).toBe( 'second type' );
			expect( args[ 1 ].props( 'type' ) ).toBe( 'Z4' );
		} );
	} );

	describe( 'on value change', () => {
		it( 'sets a terminal value', async () => {
			keyPath = 'main.Z2K2.Z8K2';
			objectValue = { Z1K1: 'Z9', Z9K1: '' };

			store.getStoredObject = jest.fn().mockReturnValue( mockStoredObjects.Z6.data );
			store.createObjectByType = jest.fn().mockReturnValue( { Z1K1: 'Z9', Z9K1: 'Z6' } );

			const wrapper = shallowMount( TypeSelector, {
				props: {
					keyPath,
					objectValue,
					type: Constants.Z_TYPE
				},
				global: { stubs: { CdxField: false } }
			} );

			const lookup = wrapper.getComponent( { name: 'wl-z-object-selector' } );
			lookup.vm.$emit( 'select-item', Constants.Z_STRING );

			// Set the selected reference
			expect( store.setValueByKeyPath ).toHaveBeenCalledTimes( 1 );
			expect( store.setValueByKeyPath ).toHaveBeenCalledWith( {
				keyPath: [ 'main', 'Z2K2', 'Z8K2' ],
				value: { Z1K1: 'Z9', Z9K1: 'Z6' }
			} );
			// Do not set function call arguments
			expect( store.setFunctionCallArguments ).toHaveBeenCalledTimes( 0 );
		} );

		it( 'sets a non-terminal value', async () => {
			keyPath = 'main.Z2K2.Z8K2';
			objectValue = { Z1K1: 'Z9', Z9K1: '' };

			const blankFunctionCall = { Z1K1: 'Z7', Z7K1: 'Z881', Z881K1: { Z1K1: 'Z9', Z9K1: '' } };
			store.createObjectByType = jest.fn().mockReturnValue( blankFunctionCall );
			store.getStoredObject = createGettersWithFunctionsMock( mockStoredObjects.Z881.data );

			const wrapper = shallowMount( TypeSelector, {
				props: {
					keyPath,
					objectValue,
					type: Constants.Z_TYPE
				},
				global: { stubs: { CdxField: false } }
			} );

			const lookup = wrapper.getComponent( { name: 'wl-z-object-selector' } );
			lookup.vm.$emit( 'select-item', Constants.Z_TYPED_LIST );

			// Set the selected function call
			expect( store.setValueByKeyPath ).toHaveBeenCalledTimes( 1 );
			expect( store.setValueByKeyPath ).toHaveBeenCalledWith( {
				keyPath: [ 'main', 'Z2K2', 'Z8K2' ],
				value: blankFunctionCall
			} );
			// Set the function call arguments
			expect( store.setFunctionCallArguments ).toHaveBeenCalledTimes( 1 );
			expect( store.setFunctionCallArguments ).toHaveBeenCalledWith( {
				keyPath: [ 'main', 'Z2K2', 'Z8K2' ],
				functionZid: 'Z881'
			} );
		} );
	} );
} );
