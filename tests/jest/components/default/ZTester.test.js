/*!
 * WikiLambda unit test suite for the default ZTester component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' );
const { shallowMount } = require( '@vue/test-utils' );
const createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock;
const createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock;
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const ZTester = require( '../../../../resources/ext.wikilambda.app/components/types/ZTester.vue' );

// General use
const keyPath = 'main.Z2K2';
const objectValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z20' },
	Z20K1: { Z1K1: 'Z9', Z9K1: 'Z10000' },
	Z20K2: {
		Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
		Z7K1: { Z1K1: 'Z9', Z9K1: '' }
	},
	Z20K3: {
		Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
		Z7K1: { Z1K1: 'Z9', Z9K1: '' }
	}
};

const emptyObjectValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z20' },
	Z20K1: { Z1K1: 'Z9', Z9K1: '' },
	Z20K2: {
		Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
		Z7K1: { Z1K1: 'Z9', Z9K1: '' }
	},
	Z20K3: {
		Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
		Z7K1: { Z1K1: 'Z9', Z9K1: '' }
	}
};

const globalStubs = {
	stubs: {
		WlKeyValueBlock: false,
		WlKeyBlock: false
	}
};

describe( 'ZTester', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getLabelData = createLabelDataMock();
		store.getStoredObject = createGettersWithFunctionsMock();
		store.isCreateNewPage = false;
		store.fetchZids = jest.fn().mockResolvedValue();
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: globalStubs
			} );
			expect( wrapper.find( '.ext-wikilambda-app-tester' ).exists() ).toBe( true );
		} );

		it( 'renders function block', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: globalStubs
			} );
			const functionBlock = wrapper.find( '.ext-wikilambda-app-tester__function' );
			expect( functionBlock.exists() ).toBe( true );
			expect( functionBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'renders tester call block', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: globalStubs
			} );
			const callBlock = wrapper.find( 'div[data-testid=tester-call]' );
			expect( callBlock.exists() ).toBe( true );
			expect( callBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'renders tester validation block', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: globalStubs
			} );
			const callBlock = wrapper.find( 'div[data-testid=tester-validation]' );
			expect( callBlock.exists() ).toBe( true );
			expect( callBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );
			expect( wrapper.find( '.ext-wikilambda-app-tester' ).exists() ).toBe( true );
		} );

		it( 'renders function block', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );
			const functionBlock = wrapper.find( '.ext-wikilambda-app-tester__function' );
			expect( functionBlock.exists() ).toBe( true );
			expect( functionBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'renders tester call block', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );
			const callBlock = wrapper.find( 'div[data-testid=tester-call]' );
			expect( callBlock.exists() ).toBe( true );
			expect( callBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'renders tester validation block', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );
			const callBlock = wrapper.find( 'div[data-testid=tester-validation]' );
			expect( callBlock.exists() ).toBe( true );
			expect( callBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );
	} );

	describe( 'in create mode', () => {
		const functionZid = 'Z10000';
		const typeZid = 'Z10001';
		const equalityZid = 'Z10002';
		const storedObjects = {
			Z10000: { Z2K2: { Z1K1: 'Z8', Z8K2: typeZid } },
			Z10001: { Z2K2: { Z1K1: 'Z4', Z4K4: equalityZid } }
		};

		// Expected payloads
		const setCallPayload = {
			keyPath: [ 'Z20K2', 'Z7K1', 'Z9K1' ],
			value: functionZid
		};
		const setCallArguments = {
			keyPath: [ 'main', 'Z2K2', 'Z20K2' ],
			functionZid: functionZid
		};
		const setValidatorPayload = {
			keyPath: [ 'Z20K3', 'Z7K1', 'Z9K1' ],
			value: equalityZid
		};
		const setValidatorArguments = {
			keyPath: [ 'main', 'Z2K2', 'Z20K3' ],
			functionZid: equalityZid
		};

		beforeEach( () => {
			store.isCreateNewPage = true;
			store.getStoredObject = jest.fn().mockImplementation( ( zid ) => storedObjects[ zid ] || undefined );
		} );

		it( 'sets test call and validation on initialize', async () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );

			await waitFor( () => {
				// 1. Set value for test call
				expect( wrapper.emitted( 'set-value' )[ 0 ] ).toEqual( [ setCallPayload ] );
				// 2. Set arguments for test call
				expect( store.setFunctionCallArguments ).toHaveBeenCalledWith( setCallArguments );
				// 3. Set value for validator call
				expect( wrapper.emitted( 'set-value' )[ 1 ] ).toEqual( [ setValidatorPayload ] );
				// 4. Set arguments for validator call
				expect( store.setFunctionCallArguments ).toHaveBeenCalledWith( setValidatorArguments );
			} );
		} );

		it( 'sets test call and validation on new function zid', async () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					keyPath,
					objectValue: emptyObjectValue,
					edit: true
				},
				global: globalStubs
			} );

			// Expect no initialization
			expect( wrapper.emitted( 'set-value' ) ).toBeFalsy();

			// Function Zid is updated
			wrapper.setProps( { objectValue } );

			await waitFor( () => {
				// 1. Set value for test call
				expect( wrapper.emitted( 'set-value' )[ 0 ] ).toEqual( [ setCallPayload ] );
				// 2. Set arguments for test call
				expect( store.setFunctionCallArguments ).toHaveBeenCalledWith( setCallArguments );
				// 3. Set value for validator call
				expect( wrapper.emitted( 'set-value' )[ 1 ] ).toEqual( [ setValidatorPayload ] );
				// 4. Set arguments for validator call
				expect( store.setFunctionCallArguments ).toHaveBeenCalledWith( setValidatorArguments );
			} );
		} );

		it( 'sets test call and clears validation when type has no equality function', async () => {
			const storedNoEquality = {
				Z10000: { Z2K2: { Z1K1: 'Z8', Z8K2: typeZid } },
				Z10001: { Z2K2: { Z1K1: 'Z4' } }
			};
			store.getStoredObject = jest.fn().mockImplementation( ( zid ) => storedNoEquality[ zid ] || undefined );

			const wrapper = shallowMount( ZTester, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );

			const setEmptyFunction = {
				keyPath: [ 'Z20K3', 'Z7K1', 'Z9K1' ],
				value: ''
			};

			const setEmptyArguments = {
				keyPath: [ 'main', 'Z2K2', 'Z20K3' ]
			};

			await waitFor( () => {
				// 1. Set value for test call
				expect( wrapper.emitted( 'set-value' )[ 0 ] ).toEqual( [ setCallPayload ] );
				// 2. Set arguments for test call
				expect( store.setFunctionCallArguments ).toHaveBeenCalledWith( setCallArguments );
				// 3. Set blank value for validator call
				expect( wrapper.emitted( 'set-value' )[ 1 ] ).toEqual( [ setEmptyFunction ] );
				// 4. Remove old arguments from validator call
				expect( store.setFunctionCallArguments ).toHaveBeenCalledWith( setEmptyArguments );
			} );
		} );
	} );
} );
