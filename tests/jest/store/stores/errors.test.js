/*!
 * WikiLambda unit test suite for the errors Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { createPinia, setActivePinia } = require( 'pinia' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );

const mockErrors = {
	// Global errors
	0: [ {
		type: Constants.ERROR_TYPES.WARNING,
		code: undefined,
		message: 'Some custom warning message'
	}, {
		type: Constants.ERROR_TYPES.ERROR,
		code: undefined,
		message: 'Some custom error message'
	} ],
	// Validation errors
	10: [ {
		type: Constants.ERROR_TYPES.ERROR,
		code: Constants.ERROR_CODES.MISSING_FUNCTION_OUTPUT,
		message: undefined
	} ]
};

describe( 'Errors Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.errors = {};
	} );

	describe( 'Getters', () => {
		describe( 'getAllErrors', () => {
			it( 'returns an empty array when there are no errors', () => {
				expect( store.getAllErrors ).toEqual( [] );
			} );

			it( 'returns all errors', () => {
				store.errors = mockErrors;
				let expectErrors = [];
				expectErrors = expectErrors.concat( mockErrors[ 0 ], mockErrors[ 10 ] );
				expect( store.getAllErrors ).toEqual( expectErrors );
			} );
		} );

		describe( 'getErrors', () => {
			it( 'returns an empty array when there are no errors', () => {
				expect( store.getErrors( 0 ) ).toEqual( [] );
			} );

			it( 'returns errors saved for a given rowId', () => {
				store.errors = mockErrors;
				expect( store.getErrors( 0 ) ).toEqual( mockErrors[ 0 ] );
			} );

			it( 'returns errors saved for a given rowId and type', () => {
				store.errors = mockErrors;
				expect( store.getErrors( 0, Constants.ERROR_TYPES.WARNING ) ).toEqual( [ mockErrors[ 0 ][ 0 ] ] );
			} );
		} );

		describe( 'hasErrorByCode', () => {
			beforeEach( () => {
				store.errors = mockErrors;
			} );

			it( 'returns false for a given rowId when an error with the provided code does not exist', () => {
				expect( store.hasErrorByCode( 0, Constants.ERROR_CODES.UNKNOWN_ERROR ) ).toEqual( false );
			} );

			it( 'returns true for a given rowId when an error with the provided code exists', () => {
				expect( store.hasErrorByCode( 10, Constants.ERROR_CODES.MISSING_FUNCTION_OUTPUT ) ).toEqual( true );
			} );
		} );
	} );

	describe( 'Actions', () => {
		describe( 'setError', () => {
			it( 'sets error in the state under a given rowId', () => {
				store.setError( {
					rowId: 10,
					errorType: Constants.ERROR_TYPES.ERROR,
					errorCode: Constants.ERROR_CODES.MISSING_FUNCTION_OUTPUT
				} );
				expect( store.errors ).toEqual( { 10: mockErrors[ 10 ] } );
			} );

			it( 'sets global error if no rowId is given', () => {
				store.setError( {
					errorType: Constants.ERROR_TYPES.ERROR,
					errorCode: Constants.ERROR_CODES.MISSING_FUNCTION_OUTPUT
				} );
				expect( store.errors ).toEqual( { 0: mockErrors[ 10 ] } );
			} );

			it( 'adds an error if rowId is already present in the state', () => {
				store.errors = {
					0: [ {
						type: Constants.ERROR_TYPES.WARNING,
						code: undefined,
						message: 'Some custom warning message'
					} ]
				};
				store.setError( {
					rowId: 0,
					errorType: Constants.ERROR_TYPES.ERROR,
					errorMessage: 'Some custom error message'
				} );
				expect( store.errors ).toEqual( { 0: mockErrors[ 0 ] } );
			} );
		} );

		describe( 'clearErrors', () => {
			it( 'does nothing if the rowId has no errors in the state', () => {
				store.errors = mockErrors;
				store.clearErrors( 20 );
				expect( store.errors ).toEqual( mockErrors );
			} );

			it( 'clears all errors associated with a given rowId', () => {
				store.errors = mockErrors;
				store.clearErrors( 10 );
				expect( store.errors ).toEqual( { 0: mockErrors[ 0 ], 10: [] } );
			} );
		} );

		describe( 'clearErrorsByCode', () => {
			it( 'does nothing if the rowId has no errors in the state for the provided code', () => {
				store.errors = mockErrors;
				store.clearErrorsByCode( 10, Constants.ERROR_CODES.UNKNOWN_ERROR );
				expect( store.errors ).toEqual( mockErrors );
			} );

			it( 'clears all errors associated with a given rowId', () => {
				store.errors = mockErrors;
				store.clearErrorsByCode( 10, Constants.ERROR_CODES.MISSING_FUNCTION_OUTPUT );
				expect( store.errors ).toEqual( { 0: mockErrors[ 0 ], 10: [] } );
			} );
		} );

		describe( 'clearValidationErrors', () => {
			it( 'does nothing if the state has no validation errors', () => {
				store.errors = {
					0: mockErrors[ 0 ]
				};
				store.clearValidationErrors();
				expect( store.errors ).toEqual( { 0: mockErrors[ 0 ] } );
			} );

			it( 'clears all validation errors (not zero)', () => {
				store.errors = mockErrors;
				store.clearValidationErrors( 10 );
				expect( store.errors ).toEqual( { 0: mockErrors[ 0 ], 10: [] } );
			} );
		} );

		describe( 'clearAllErrors', () => {
			it( 'clears both validation and page errors', () => {
				store.clearAllErrors();
				expect( store.errors ).toEqual( {} );
			} );
		} );
	} );
} );
