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
		store.veFunctionParamsValid = false;
		store.veFunctionParamsDirty = false;
		store.newParameterSetup = false;
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

		describe( 'validateVEFunctionId', () => {
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

		it( 'validateVEFunctionParams returns the function params valid flag', () => {
			store.veFunctionParamsValid = true;
			expect( store.validateVEFunctionParams ).toBe( true );
		} );

		it( 'isNewParameterSetup returns the new function parameter setup flag', () => {
			store.newParameterSetup = true;
			expect( store.isNewParameterSetup ).toBe( true );
		} );

		it( 'isParameterSetupDirty returns the function parameter setup dirty flag', () => {
			store.veFunctionParamsDirty = true;
			expect( store.isParameterSetupDirty ).toBe( true );
		} );
	} );

	describe( 'Actions', () => {
		it( 'setVEFunctionId sets the function ID', () => {
			store.setVEFunctionId( 'Z123' );
			expect( store.veFunctionId ).toBe( 'Z123' );
		} );

		describe( 'setVEFunctionParams', () => {
			it( 'sets to initial function parameters and initializes flags', () => {
				store.veFunctionParamsDirty = true;
				store.veFunctionParamsValid = true;

				store.setVEFunctionParams( [ 'param1', 'param2' ] );

				expect( store.veFunctionParams ).toEqual( [ 'param1', 'param2' ] );
				expect( store.veFunctionParamsDirty ).toBe( false );
				expect( store.veFunctionParamsValid ).toBe( false );
				expect( store.newParameterSetup ).toBe( false );
			} );

			it( 'sets to blank function parameters and initializes flags', () => {
				store.veFunctionParamsDirty = true;
				store.veFunctionParamsValid = true;

				store.setVEFunctionParams();

				expect( store.veFunctionParams ).toEqual( [] );
				expect( store.veFunctionParamsDirty ).toBe( false );
				expect( store.veFunctionParamsValid ).toBe( false );
				expect( store.newParameterSetup ).toBe( true );
			} );
		} );

		it( 'setVEFunctionParam sets a specific function parameter', () => {
			store.veFunctionParams = [ 'param1', 'param2' ];
			store.setVEFunctionParam( 1, 'newParam' );
			expect( store.veFunctionParams ).toEqual( [ 'param1', 'newParam' ] );
		} );

		it( 'setVEFunctionParamsValid sets the function parameters validity flag', () => {
			store.setVEFunctionParamsValid( true );
			expect( store.veFunctionParamsValid ).toBe( true );

			store.setVEFunctionParamsValid( false );
			expect( store.veFunctionParamsValid ).toBe( false );
		} );

		it( 'setVEFunctionParamsDirty sets the function parameters to dirty', () => {
			store.veFunctionParamsDirty = false;
			store.setVEFunctionParamsDirty();
			expect( store.veFunctionParamsDirty ).toBe( true );
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
