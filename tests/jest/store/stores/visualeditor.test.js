/*!
 * WikiLambda unit test suite for the Visual Editor Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { setActivePinia, createPinia } = require( 'pinia' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );

describe( 'Visual Editor Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.veFunctionId = null;
		store.veFunctionParams = [];
		store.suggestedFunctions = [];
	} );

	describe( 'Getters', () => {
		it( 'getVEFunctionId returns the current function ID', () => {
			store.veFunctionId = 'Z801';
			expect( store.getVEFunctionId ).toBe( 'Z801' );
		} );

		it( 'getVEFunctionParams returns the current function parameters', () => {
			store.veFunctionParams = [ 'param1', 'param2' ];
			expect( store.getVEFunctionParams ).toEqual( [ 'param1', 'param2' ] );
		} );

		it( 'getSuggestedFunctions returns the suggested functions', () => {
			store.suggestedFunctions = [ 'Z802', 'Z803' ];
			expect( store.getSuggestedFunctions ).toEqual( [ 'Z802', 'Z803' ] );
		} );

		it( 'validateVEFunctionId returns false if function ID is invalid', () => {
			store.veFunctionId = 'InvalidID';
			expect( store.validateVEFunctionId ).toBe( false );
		} );

		it( 'validateVEFunctionId returns true if function ID is valid and is a function', () => {
			store.veFunctionId = 'Z801';

			Object.defineProperty( store, 'getFetchedObject', {
				value: () => ( {
					success: true,
					data: {
						[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION
						}
					}
				} )
			} );
			expect( store.validateVEFunctionId ).toBe( true );
		} );

		it( 'validateVEFunctionId returns false if fetched object is not a function', () => {
			store.veFunctionId = 'Z801';

			Object.defineProperty( store, 'getFetchedObject', {
				value: () => ( {
					success: true,
					data: {
						[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_BOOLEAN
						}
					}
				} )
			} );
			expect( store.validateVEFunctionId ).toBe( false );
		} );
	} );

	describe( 'Actions', () => {
		it( 'setVEFunctionId sets the function ID', () => {
			store.setVEFunctionId( 'Z123' );
			expect( store.veFunctionId ).toBe( 'Z123' );
		} );

		it( 'setVEFunctionParams sets the function parameters', () => {
			store.setVEFunctionParams( [ 'param1', 'param2' ] );
			expect( store.veFunctionParams ).toEqual( [ 'param1', 'param2' ] );
		} );

		it( 'setVEFunctionParam sets a specific function parameter', () => {
			store.veFunctionParams = [ 'param1', 'param2' ];
			store.setVEFunctionParam( 1, 'newParam' );
			expect( store.veFunctionParams ).toEqual( [ 'param1', 'newParam' ] );
		} );

		it( 'setSuggestedFunctions sets the suggested functions and fetches them', () => {
			store.fetchZids = jest.fn().mockResolvedValue();
			store.setSuggestedFunctions( [ 'Z456', 'Z789' ] );
			expect( store.suggestedFunctions ).toEqual( [ 'Z456', 'Z789' ] );
			expect( store.fetchZids ).toHaveBeenCalledWith( { zids: [ 'Z456', 'Z789' ] } );
		} );

		it( 'initializeVEFunctionCallEditor initializes the store with given payload', () => {
			store.fetchZids = jest.fn().mockResolvedValue();
			store.initializeVEFunctionCallEditor( {
				functionId: 'Z801',
				functionParams: [ 'param1', 'param2' ],
				suggestedFunctions: [ 'Z802', 'Z803' ]
			} );
			expect( store.veFunctionId ).toBe( 'Z801' );
			expect( store.veFunctionParams ).toEqual( [ 'param1', 'param2' ] );
			expect( store.suggestedFunctions ).toEqual( [ 'Z802', 'Z803' ] );
			expect( store.fetchZids ).toHaveBeenCalledWith( { zids: [ 'Z802', 'Z803' ] } );
		} );
	} );
} );
