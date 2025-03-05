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
	main: [ {
		type: Constants.ERROR_TYPES.WARNING,
		code: undefined,
		message: 'Some custom warning message'
	}, {
		type: Constants.ERROR_TYPES.ERROR,
		code: undefined,
		message: 'Some custom error message'
	} ],
	// Validation errors
	'main.Z2K2': [ {
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
		describe( 'getErrors', () => {
			it( 'returns an empty array when there are no errors', () => {
				expect( store.getErrors( 'main' ) ).toEqual( [] );
			} );

			it( 'returns errors saved for a given errorId', () => {
				store.errors = mockErrors;
				expect( store.getErrors( 'main' ) ).toEqual( mockErrors.main );
			} );

			it( 'returns errors saved for a given errorId and type', () => {
				store.errors = mockErrors;
				expect( store.getErrors( 'main', Constants.ERROR_TYPES.WARNING ) ).toEqual( [ mockErrors.main[ 0 ] ] );
			} );
		} );

		describe( 'hasErrorByCode', () => {
			beforeEach( () => {
				store.errors = mockErrors;
			} );

			it( 'returns false for a given errorId when an error with the provided code does not exist', () => {
				const hasError = store.hasErrorByCode( 'main', Constants.ERROR_CODES.UNKNOWN_ERROR );
				expect( hasError ).toEqual( false );
			} );

			it( 'returns true for a given errorId when an error with the provided code exists', () => {
				const hasError = store.hasErrorByCode( 'main.Z2K2', Constants.ERROR_CODES.MISSING_FUNCTION_OUTPUT );
				expect( hasError ).toEqual( true );
			} );
		} );

		describe( 'getChildErrorKeys', () => {
			it( 'returns child keys given a keypath', () => {
				store.errors = {
					main: { some: 'error' },
					'main.Z2K2': { some: 'error' },
					'main.Z2K2.Z12K1': { some: 'error' },
					'main.Z2K2.Z12K1.1': { some: 'error' },
					'main.Z2K3.Z12K1': { some: 'error' }
				};
				const children = [
					'main.Z2K2.Z12K1',
					'main.Z2K2.Z12K1.1'
				];
				expect( store.getChildErrorKeys( 'main.Z2K2' ) ).toEqual( children );
			} );

			it( 'returns no child keys with empty errors', () => {
				store.errors = {};
				expect( store.getChildErrorKeys( 'main.Z2K2' ) ).toEqual( [] );
			} );
		} );
	} );

	describe( 'Actions', () => {
		describe( 'setError', () => {
			it( 'sets error in the state under a given errorId', () => {
				store.setError( {
					errorId: 'main.Z2K2',
					errorType: Constants.ERROR_TYPES.ERROR,
					errorCode: Constants.ERROR_CODES.MISSING_FUNCTION_OUTPUT
				} );
				expect( store.errors ).toEqual( { 'main.Z2K2': mockErrors[ 'main.Z2K2' ] } );
			} );

			it( 'sets global error if no errorId is given', () => {
				store.setError( {
					errorType: Constants.ERROR_TYPES.ERROR,
					errorCode: Constants.ERROR_CODES.MISSING_FUNCTION_OUTPUT
				} );
				expect( store.errors ).toEqual( { main: mockErrors[ 'main.Z2K2' ] } );
			} );

			it( 'adds an error if errorId is already present in the state', () => {
				store.errors = {
					main: [ {
						type: Constants.ERROR_TYPES.WARNING,
						code: undefined,
						message: 'Some custom warning message'
					} ]
				};
				store.setError( {
					errorId: 'main',
					errorType: Constants.ERROR_TYPES.ERROR,
					errorMessage: 'Some custom error message'
				} );
				expect( store.errors ).toEqual( { main: mockErrors.main } );
			} );
		} );

		describe( 'clearErrors', () => {
			it( 'does nothing if the errorId has no errors in the state', () => {
				store.errors = mockErrors;
				store.clearErrors( 'main.non.existing.path' );
				expect( store.errors ).toEqual( mockErrors );
			} );

			it( 'clears all errors associated with a given errorId', () => {
				store.errors = mockErrors;
				store.clearErrors( 'main.Z2K2' );
				expect( store.errors ).toEqual( { main: mockErrors.main, 'main.Z2K2': [] } );
			} );
		} );

		describe( 'clearErrorsByCode', () => {
			it( 'does nothing if the errorId has no errors in the state for the provided code', () => {
				store.errors = mockErrors;
				store.clearErrorsByCode( 'main.Z2K2', Constants.ERROR_CODES.UNKNOWN_ERROR );
				expect( store.errors ).toEqual( mockErrors );
			} );

			it( 'clears all errors associated with a given errorId', () => {
				store.errors = mockErrors;
				store.clearErrorsByCode( 'main.Z2K2', Constants.ERROR_CODES.MISSING_FUNCTION_OUTPUT );
				expect( store.errors ).toEqual( { main: mockErrors.main, 'main.Z2K2': [] } );
			} );
		} );

		describe( 'clearValidationErrors', () => {
			it( 'does nothing if the state has no validation errors', () => {
				store.errors = {
					main: mockErrors.main
				};
				store.clearValidationErrors();
				expect( store.errors ).toEqual( { main: mockErrors.main } );
			} );

			it( 'clears all validation errors (not zero)', () => {
				store.errors = mockErrors;
				store.clearValidationErrors( 'main.Z2K2' );
				expect( store.errors ).toEqual( { main: mockErrors.main, 'main.Z2K2': [] } );
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
