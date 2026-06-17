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

		it( 'getVESelectedText returns the text selected before opening the dialog', () => {
			store.veSelectedText = 'selected text from editor';
			expect( store.getVESelectedText ).toBe( 'selected text from editor' );
		} );

		it( 'getSearchTerm returns the current search term', () => {
			store.searchTerm = 'add';
			expect( store.getSearchTerm ).toBe( 'add' );
		} );

		it( 'getLookupResults returns the current lookup results', () => {
			store.lookupResults = [ 'Z801', 'Z802' ];
			expect( store.getLookupResults ).toEqual( [ 'Z801', 'Z802' ] );
		} );

		describe( 'defaultValueCallbacks', () => {
			it( 'exposes a callback per argument type with a default value', () => {
				expect( store.defaultValueCallbacks ).toEqual( expect.objectContaining( {
					[ Constants.Z_GREGORIAN_CALENDAR_DATE ]: expect.any( Function ),
					[ Constants.Z_NATURAL_LANGUAGE ]: expect.any( Function ),
					[ Constants.Z_WIKIDATA_ITEM ]: expect.any( Function ),
					[ Constants.Z_WIKIDATA_REFERENCE_ITEM ]: expect.any( Function )
				} ) );
			} );
		} );

		describe( 'hasDefaultValueForType', () => {
			it( 'returns true for a type that has a default value callback', () => {
				expect( store.hasDefaultValueForType( Constants.Z_WIKIDATA_ITEM ) ).toBe( true );
			} );

			it( 'returns false for a type that has no default value callback', () => {
				expect( store.hasDefaultValueForType( Constants.Z_STRING ) ).toBe( false );
			} );
		} );

		describe( 'getDefaultValueForType', () => {
			it( 'returns the callback result for a type that has a default value', () => {
				mw.config.get = jest.fn().mockReturnValue( 'Q42' );
				expect( store.getDefaultValueForType( Constants.Z_WIKIDATA_ITEM ) ).toBe( 'Q42' );
			} );

			it( 'returns undefined for a type that has no default value callback', () => {
				expect( store.getDefaultValueForType( Constants.Z_STRING ) ).toBeUndefined();
			} );
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
