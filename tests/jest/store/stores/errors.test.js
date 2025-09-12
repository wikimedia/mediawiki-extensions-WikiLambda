/*!
 * WikiLambda unit test suite for the errors Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' );
const { createPinia, setActivePinia } = require( 'pinia' );
const { createLabelDataMock } = require( '../../helpers/getterHelpers.js' );
const { metadataBasic, convertSetToMap } = require( '../../fixtures/metadata.js' );

const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const ErrorData = require( '../../../../resources/ext.wikilambda.app/store/classes/ErrorData.js' );

const mockErrors = {
	// Global errors
	main: [
		new ErrorData( null, [], 'Some custom warning message', Constants.ERROR_TYPES.WARNING ),
		new ErrorData( null, [], 'Some custom error message', Constants.ERROR_TYPES.ERROR )
	],
	// Validation errors
	'main.Z2K2': [
		new ErrorData( 'wikilambda-missing-function-output-error-message', [], null, Constants.ERROR_TYPES.ERROR )
	]
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

		describe( 'hasErrorByKey', () => {
			beforeEach( () => {
				store.errors = mockErrors;
			} );

			it( 'returns false for a given errorId when an error with the provided code does not exist', () => {
				const hasError = store.hasErrorByKey( 'main', 'wikilambda-unknown-error-message' );
				expect( hasError ).toEqual( false );
			} );

			it( 'returns true for a given errorId when an error with the provided code exists', () => {
				const hasError = store.hasErrorByKey( 'main.Z2K2', 'wikilambda-missing-function-output-error-message' );
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
					errorMessageKey: 'wikilambda-missing-function-output-error-message'
				} );
				expect( store.errors ).toEqual( { 'main.Z2K2': mockErrors[ 'main.Z2K2' ] } );
			} );

			it( 'sets global error if no errorId is given', () => {
				store.setError( {
					errorType: Constants.ERROR_TYPES.ERROR,
					errorMessageKey: 'wikilambda-missing-function-output-error-message'
				} );
				expect( store.errors ).toEqual( { main: mockErrors[ 'main.Z2K2' ] } );
			} );

			it( 'adds an error if errorId is already present in the state', () => {
				store.errors = {
					main: [ new ErrorData( null, [], 'Some custom warning message', Constants.ERROR_TYPES.WARNING ) ]
				};
				store.setError( {
					errorId: 'main',
					errorType: Constants.ERROR_TYPES.ERROR,
					errorMessage: 'Some custom error message'
				} );
				expect( store.errors ).toEqual( { main: mockErrors.main } );
			} );
		} );

		describe( 'handleMetadataError', () => {
			beforeEach( () => {
				// Mock actions
				store.fetchZids = jest.fn().mockResolvedValue();
				// Mock getters
				Object.defineProperty( store, 'getStoredObject', {
					value: () => undefined
				} );
				Object.defineProperty( store, 'getLabelData', {
					value: createLabelDataMock( {
						Z500: 'Generic error',
						Z1500: 'Custom error'
					} )
				} );
			} );

			it( 'calls errorHandler with fallback message if there is no metadata', () => {
				const fallbackErrorData = { errorMessageKey: 'fallback-error-message' };
				const errorHandler = jest.fn();

				store.handleMetadataError( { metadata: null, fallbackErrorData, errorHandler } );
				expect( errorHandler ).toHaveBeenCalledWith( fallbackErrorData );
			} );

			it( 'calls errorHandler with fallback message if metadata has no errors', () => {
				const fallbackErrorData = { errorMessageKey: 'fallback-error-message' };
				const errorHandler = jest.fn();

				store.handleMetadataError( { metadata: metadataBasic, fallbackErrorData, errorHandler } );
				expect( errorHandler ).toHaveBeenCalledWith( fallbackErrorData );
			} );

			it( 'calls errorHandler with generic error message (global keys)', () => {
				const errorHandler = jest.fn();
				const fallbackErrorData = { errorMessageKey: 'fallback-error-message' };
				const metadata = convertSetToMap( { errors: {
					Z1K1: 'Z5',
					Z5K1: 'Z500',
					Z5K2: {
						Z1K1: {
							Z1K1: 'Z7',
							Z7K1: 'Z885',
							Z885K1: 'Z500'
						},
						Z500K1: 'some generic error message'
					}
				} } );

				store.handleMetadataError( { metadata, fallbackErrorData, errorHandler } );
				expect( errorHandler ).toHaveBeenCalledWith( { errorMessage: 'some generic error message' } );
			} );

			it( 'calls errorHandler with generic error message (local keys)', () => {
				const errorHandler = jest.fn();
				const fallbackErrorData = { errorMessageKey: 'fallback-error-message' };
				const metadata = convertSetToMap( { errors: {
					Z1K1: 'Z5',
					Z5K1: 'Z500',
					Z5K2: {
						Z1K1: {
							Z1K1: 'Z7',
							Z7K1: 'Z885',
							Z885K1: 'Z500'
						},
						K1: 'some generic error message'
					}
				} } );

				store.handleMetadataError( { metadata, fallbackErrorData, errorHandler } );
				expect( errorHandler ).toHaveBeenCalledWith( { errorMessage: 'some generic error message' } );
			} );

			it( 'calls errorHandler with fallback error message when generic error has non-string key', async () => {
				const errorHandler = jest.fn();
				const fallbackErrorData = { errorMessageKey: 'fallback-error-message' };
				const metadata = convertSetToMap( { errors: {
					Z1K1: 'Z5',
					Z5K1: 'Z500',
					Z5K2: {
						Z1K1: {
							Z1K1: 'Z7',
							Z7K1: 'Z885',
							Z885K1: 'Z500'
						},
						Z500K1: {
							Z1K1: 'Z99',
							Z99K1: 1
						}
					}
				} } );

				store.handleMetadataError( { metadata, fallbackErrorData, errorHandler } );
				await waitFor( () => expect( errorHandler ).toHaveBeenCalledWith( fallbackErrorData ) );
			} );

			it( 'calls errorHandler with custom error zid was successfully fetched', async () => {
				Object.defineProperty( store, 'getStoredObject', {
					value: () => ( {
						Z1K1: 'Z2',
						Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1500' },
						Z2K2: { Z1K1: 'Z50' }
					} )
				} );

				const errorHandler = jest.fn();
				const fallbackErrorData = { errorMessageKey: 'fallback-error-message' };
				const metadata = convertSetToMap( { errors: {
					Z1K1: 'Z5',
					Z5K1: 'Z1500',
					Z5K2: {
						Z1K1: {
							Z1K1: 'Z7',
							Z7K1: 'Z885',
							Z885K1: 'Z1500'
						},
						Z1500K1: 'one arg',
						Z1500K2: 'another arg'
					}
				} } );

				store.handleMetadataError( { metadata, fallbackErrorData, errorHandler } );
				await waitFor( () => expect( errorHandler ).toHaveBeenCalledWith( { errorMessage: 'Custom error' } ) );
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

		describe( 'clearErrorsByKey', () => {
			it( 'does nothing if the errorId has no errors in the state for the provided code', () => {
				store.errors = mockErrors;
				store.clearErrorsByKey( { errorId: 'main.Z2K2', errorMessageKey: 'wikilambda-unknown-error-message' } );
				expect( store.errors ).toEqual( mockErrors );
			} );

			it( 'clears all errors associated with a given errorId', () => {
				store.errors = mockErrors;
				store.clearErrorsByKey( { errorId: 'main.Z2K2', errorMessageKey: 'wikilambda-missing-function-output-error-message' } );
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
