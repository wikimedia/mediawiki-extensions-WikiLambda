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
	createGetterMock = require( '../../helpers/getterHelpers.js' ).createGetterMock,
	ZTester = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZTester.vue' );

describe( 'ZTester', () => {
	let getters, actions;
	beforeEach( () => {
		getters = {
			getLabel: createGettersWithFunctionsMock( 'label' ),
			getStoredObject: createGettersWithFunctionsMock(),
			getZReferenceTerminalValue: createGettersWithFunctionsMock(),
			getZTesterFunctionRowId: createGettersWithFunctionsMock( 1 ),
			getZTesterCallRowId: createGettersWithFunctionsMock( 2 ),
			getZTesterValidationRowId: createGettersWithFunctionsMock( 3 ),
			createZObjectByType: createGettersWithFunctionsMock(),
			isCreateNewPage: createGetterMock( false )
		};
		actions = {
			fetchZids: jest.fn( () => {
				return {
					then: ( callback ) => callback()
				};
			} ),
			setZFunctionCallArguments: jest.fn()
		};
		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					edit: false
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-tester' ).exists() ).toBe( true );
		} );

		it( 'renders function block', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					edit: false
				}
			} );
			const functionBlock = wrapper.find( '.ext-wikilambda-tester-function' );
			expect( functionBlock.exists() ).toBe( true );
			expect( functionBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'renders tester call block', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					edit: false
				}
			} );
			const callBlock = wrapper.find( 'div[role=ext-wikilambda-tester-call]' );
			expect( callBlock.exists() ).toBe( true );
			expect( callBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'renders tester validation block', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					edit: false
				}
			} );
			const callBlock = wrapper.find( 'div[role=ext-wikilambda-tester-validation]' );
			expect( callBlock.exists() ).toBe( true );
			expect( callBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					edit: true
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-tester' ).exists() ).toBe( true );
		} );

		it( 'renders function block', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					edit: true
				}
			} );
			const functionBlock = wrapper.find( '.ext-wikilambda-tester-function' );
			expect( functionBlock.exists() ).toBe( true );
			expect( functionBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'renders tester call block', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					edit: true
				}
			} );
			const callBlock = wrapper.find( 'div[role=ext-wikilambda-tester-call]' );
			expect( callBlock.exists() ).toBe( true );
			expect( callBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'renders tester validation block', () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					edit: true
				}
			} );
			const callBlock = wrapper.find( 'div[role=ext-wikilambda-tester-validation]' );
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
			getters.isCreateNewPage = createGetterMock( true );
			getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( functionZid );
			getters.createObjectByType = createGettersWithFunctionsMock( blankFunctionCall );
			getters.getStoredObject = () => ( zid ) => {
				if ( zid === functionZid ) {
					return functionObject;
				} else if ( zid === typeZid ) {
					return typeObject;
				}
				return undefined;
			};
			actions.setZFunctionCallArguments = jest.fn();
			global.store.hotUpdate( {
				getters: getters,
				actions: actions
			} );
		} );

		it( 'sets test call and validation on initialize', async () => {
			const wrapper = shallowMount( ZTester, {
				props: {
					edit: true
				}
			} );

			await waitFor( () => {
				// 1. Set value for test call
				expect( wrapper.emitted( 'set-value' )[ 0 ] ).toEqual( [ setCallPayload ] );
				// 2. Set arguments for test call
				expect( actions.setZFunctionCallArguments ).toHaveBeenCalledWith( expect.anything(),
					setCallArguments );
				// 3. Set value for validator call
				expect( wrapper.emitted( 'set-value' )[ 1 ] ).toEqual( [ setValidatorPayload ] );
				// 4. Set arguments for validator call
				expect( actions.setZFunctionCallArguments ).toHaveBeenCalledWith( expect.anything(),
					setValidatorArguments );
			} );
		} );

		it( 'sets test call and validation on new function zid', async () => {
			getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( undefined );
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( ZTester, {
				props: {
					edit: true
				}
			} );

			// Expect no initialization
			expect( wrapper.emitted( 'set-value' ) ).toBeFalsy();

			// Function Zid is updated
			getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( functionZid );
			global.store.hotUpdate( { getters: getters } );

			await waitFor( () => {
				// 1. Set value for test call
				expect( wrapper.emitted( 'set-value' )[ 0 ] ).toEqual( [ setCallPayload ] );
				// 2. Set arguments for test call
				expect( actions.setZFunctionCallArguments ).toHaveBeenCalledWith( expect.anything(),
					setCallArguments );
				// 3. Set value for validator call
				expect( wrapper.emitted( 'set-value' )[ 1 ] ).toEqual( [ setValidatorPayload ] );
				// 4. Set arguments for validator call
				expect( actions.setZFunctionCallArguments ).toHaveBeenCalledWith( expect.anything(),
					setValidatorArguments );
			} );
		} );

		it( 'sets test call and clears validation when type has no equality function', async () => {
			jest.clearAllMocks();
			const typeWithoutEquality = { Z2K2: { Z1K1: 'Z4' } };
			getters.getStoredObject = () => ( zid ) => {
				if ( zid === functionZid ) {
					return functionObject;
				} else if ( zid === typeZid ) {
					return typeWithoutEquality;
				}
				return undefined;
			};
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( ZTester, {
				props: {
					edit: true
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
				expect( actions.setZFunctionCallArguments ).toHaveBeenCalledWith( expect.anything(),
					setCallArguments );
				// 3. Set blank value for validator call
				expect( wrapper.emitted( 'set-value' )[ 1 ] ).toEqual( [ clearValidatorPayload ] );
				// 4. Make sure that setZFunctionCallArguments has only been called once
				expect( actions.setZFunctionCallArguments ).toHaveBeenCalledTimes( 1 );
			} );
		} );
	} );
} );
