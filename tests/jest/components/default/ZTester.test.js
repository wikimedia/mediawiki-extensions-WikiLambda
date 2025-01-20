/*!
 * WikiLambda unit test suite for the default ZTester component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' ),
	shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock,
	ZTester = require( '../../../../resources/ext.wikilambda.app/components/default-view-types/ZTester.vue' ),
	useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'ZTester', () => {
	let store;
	beforeEach( () => {
		store = useMainStore();
		store.getLabelData = createLabelDataMock();
		store.getStoredObject = createGettersWithFunctionsMock();
		store.getZReferenceTerminalValue = createGettersWithFunctionsMock();
		store.getZTesterFunctionRowId = createGettersWithFunctionsMock( 1 );
		store.getZTesterCallRowId = createGettersWithFunctionsMock( 2 );
		store.getZTesterValidationRowId = createGettersWithFunctionsMock( 3 );
		store.createZObjectByType = createGettersWithFunctionsMock();
		store.isCreateNewPage = false;
		store.fetchZids.mockResolvedValue();
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					edit: false
				},
				global: {
					stubs: { WlKeyValueBlock: false }
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-app-tester' ).exists() ).toBe( true );
		} );

		it( 'renders function block', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					edit: false
				},
				global: {
					stubs: { WlKeyValueBlock: false }
				}
			} );
			const functionBlock = wrapper.find( '.ext-wikilambda-app-tester__function' );
			expect( functionBlock.exists() ).toBe( true );
			expect( functionBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'renders tester call block', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					edit: false
				},
				global: {
					stubs: { WlKeyValueBlock: false }
				}
			} );
			const callBlock = wrapper.find( 'div[data-testid=tester-call]' );
			expect( callBlock.exists() ).toBe( true );
			expect( callBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'renders tester validation block', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					edit: false
				},
				global: {
					stubs: { WlKeyValueBlock: false }
				}
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
					edit: true
				},
				global: {
					stubs: { WlKeyValueBlock: false }
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-app-tester' ).exists() ).toBe( true );
		} );

		it( 'renders function block', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					edit: true
				},
				global: {
					stubs: { WlKeyValueBlock: false }
				}
			} );
			const functionBlock = wrapper.find( '.ext-wikilambda-app-tester__function' );
			expect( functionBlock.exists() ).toBe( true );
			expect( functionBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'renders tester call block', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					edit: true
				},
				global: {
					stubs: { WlKeyValueBlock: false }
				}
			} );
			const callBlock = wrapper.find( 'div[data-testid=tester-call]' );
			expect( callBlock.exists() ).toBe( true );
			expect( callBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'renders tester validation block', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					edit: true
				},
				global: {
					stubs: { WlKeyValueBlock: false }
				}
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
		const functionObject = {
			Z2K2: {
				Z1K1: 'Z8',
				Z8K2: typeZid
			}
		};
		const typeObject = {
			Z2K2: {
				Z1K1: 'Z4',
				Z4K4: equalityZid
			}
		};
		const blankFunctionCall = {
			Z1K1: 'Z7',
			Z7K1: {
				Z1K1: 'Z9',
				Z9K1: ''
			}
		};
		// Expected payloads
		const setCallPayload = {
			keyPath: [ 'Z20K2', 'Z7K1', 'Z9K1' ],
			value: functionZid
		};
		const setCallArguments = {
			parentId: 2,
			functionZid: functionZid
		};
		const setValidatorPayload = {
			keyPath: [ 'Z20K3', 'Z7K1', 'Z9K1' ],
			value: equalityZid
		};
		const setValidatorArguments = {
			parentId: 3,
			functionZid: equalityZid
		};

		beforeEach( () => {
			store.isCreateNewPage = true;
			store.getZReferenceTerminalValue = createGettersWithFunctionsMock( functionZid );
			store.createObjectByType = createGettersWithFunctionsMock( blankFunctionCall );
			store.getStoredObject = ( zid ) => {
				if ( zid === functionZid ) {
					return functionObject;
				} else if ( zid === typeZid ) {
					return typeObject;
				}
				return undefined;
			};
		} );

		it( 'sets test call and validation on initialize', async () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					edit: true
				},
				global: {
					stubs: { WlKeyValueBlock: false }
				}
			} );

			await waitFor( () => {
				// 1. Set value for test call
				expect( wrapper.emitted( 'set-value' )[ 0 ] ).toEqual( [ setCallPayload ] );
				// 2. Set arguments for test call
				expect( store.setZFunctionCallArguments ).toHaveBeenCalledWith(
					setCallArguments );
				// 3. Set value for validator call
				expect( wrapper.emitted( 'set-value' )[ 1 ] ).toEqual( [ setValidatorPayload ] );
				// 4. Set arguments for validator call
				expect( store.setZFunctionCallArguments ).toHaveBeenCalledWith(
					setValidatorArguments );
			} );
		} );

		it( 'sets test call and validation on new function zid', async () => {
			store.getZReferenceTerminalValue = createGettersWithFunctionsMock( undefined );

			const wrapper = shallowMount( ZTester, {
				props: {
					edit: true
				},
				global: {
					stubs: { WlKeyValueBlock: false }
				}
			} );

			// Expect no initialization
			expect( wrapper.emitted( 'set-value' ) ).toBeFalsy();

			// Function Zid is updated
			store.getZReferenceTerminalValue = createGettersWithFunctionsMock( functionZid );

			await waitFor( () => {
				// 1. Set value for test call
				expect( wrapper.emitted( 'set-value' )[ 0 ] ).toEqual( [ setCallPayload ] );
				// 2. Set arguments for test call
				expect( store.setZFunctionCallArguments ).toHaveBeenCalledWith(
					setCallArguments );
				// 3. Set value for validator call
				expect( wrapper.emitted( 'set-value' )[ 1 ] ).toEqual( [ setValidatorPayload ] );
				// 4. Set arguments for validator call
				expect( store.setZFunctionCallArguments ).toHaveBeenCalledWith(
					setValidatorArguments );
			} );
		} );

		it( 'sets test call and clears validation when type has no equality function', async () => {
			jest.clearAllMocks();
			const typeWithoutEquality = { Z2K2: { Z1K1: 'Z4' } };
			store.getStoredObject = ( zid ) => {
				if ( zid === functionZid ) {
					return functionObject;
				} else if ( zid === typeZid ) {
					return typeWithoutEquality;
				}
				return undefined;
			};

			const wrapper = shallowMount( ZTester, {
				props: {
					edit: true
				},
				global: {
					stubs: { WlKeyValueBlock: false }
				}
			} );

			const clearValidatorPayload = {
				keyPath: [ 'Z20K3' ],
				value: blankFunctionCall
			};

			await waitFor( () => {
				// 1. Set value for test call
				expect( wrapper.emitted( 'set-value' )[ 0 ] ).toEqual( [ setCallPayload ] );
				// 2. Set arguments for test call
				expect( store.setZFunctionCallArguments ).toHaveBeenCalledWith(
					setCallArguments );
				// 3. Set blank value for validator call
				expect( wrapper.emitted( 'set-value' )[ 1 ] ).toEqual( [ clearValidatorPayload ] );
				// 4. Make sure that setZFunctionCallArguments has only been called once
				expect( store.setZFunctionCallArguments ).toHaveBeenCalledTimes( 1 );
			} );
		} );
	} );
} );
