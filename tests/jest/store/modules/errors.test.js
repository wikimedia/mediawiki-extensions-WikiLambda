/*!
 * WikiLambda unit test suite for the errors Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var errorsModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/errors.js' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	mockErrors = {
		// Global errors
		0: [ {
			type: Constants.errorTypes.WARNING,
			code: undefined,
			message: 'Some custom warning message'
		}, {
			type: Constants.errorTypes.ERROR,
			code: undefined,
			message: 'Some custom error message'
		} ],
		// Validation errors
		10: [ {
			type: Constants.errorTypes.ERROR,
			code: Constants.errorCodes.MISSING_FUNCTION_OUTPUT,
			message: undefined
		} ]
	},
	context,
	state;

describe( 'Errors Vuex module', () => {
	beforeEach( () => {
		state = JSON.parse( JSON.stringify( errorsModule.state ) );

		context = $.extend( {}, {
			commit: jest.fn( () => {
				return;
			} )
		} );
	} );

	describe( 'Getters', () => {
		describe( 'getAllErrors', () => {
			it( 'returns an empty array when there are no errors', () => {
				expect( errorsModule.getters.getAllErrors( state ) ).toEqual( [] );
			} );

			it( 'returns all errors', () => {
				state.errors = mockErrors;
				let expectErrors = [];
				expectErrors = expectErrors.concat( mockErrors[ 0 ], mockErrors[ 10 ] );
				expect( errorsModule.getters.getAllErrors( state ) ).toEqual( expectErrors );
			} );
		} );

		describe( 'getErrors', () => {
			it( 'returns an empty array when there are no errors', () => {
				expect( errorsModule.getters.getErrors( state )( 0 ) ).toEqual( [] );
			} );

			it( 'returns errors saved for a given rowId', () => {
				state.errors = mockErrors;
				expect( errorsModule.getters.getErrors( state )( 0 ) ).toEqual( mockErrors[ 0 ] );
			} );

			it( 'returns errors saved for a given rowId and type', () => {
				state.errors = mockErrors;
				expect( errorsModule.getters.getErrors( state )( 0, Constants.errorTypes.WARNING ) ).toEqual( [ mockErrors[ 0 ][ 0 ] ] );
			} );
		} );
	} );

	describe( 'Mutations', () => {
		describe( 'setError', () => {
			it( 'sets error in the state under a given rowId', () => {
				errorsModule.mutations.setError( state, {
					rowId: 10,
					errorType: Constants.errorTypes.ERROR,
					errorCode: Constants.errorCodes.MISSING_FUNCTION_OUTPUT
				} );
				expect( state.errors ).toEqual( { 10: mockErrors[ 10 ] } );
			} );

			it( 'sets global error if no rowId is given', () => {
				errorsModule.mutations.setError( state, {
					errorType: Constants.errorTypes.ERROR,
					errorCode: Constants.errorCodes.MISSING_FUNCTION_OUTPUT
				} );
				expect( state.errors ).toEqual( { 0: mockErrors[ 10 ] } );
			} );

			it( 'adds an error if rowId is already present in the state', () => {
				state.errors = {
					0: [ {
						type: Constants.errorTypes.WARNING,
						code: undefined,
						message: 'Some custom warning message'
					} ]
				};
				errorsModule.mutations.setError( state, {
					rowId: 0,
					errorType: Constants.errorTypes.ERROR,
					errorMessage: 'Some custom error message'
				} );
				expect( state.errors ).toEqual( { 0: mockErrors[ 0 ] } );
			} );
		} );

		describe( 'clearErrorsForId', () => {
			it( 'does nothing if the rowId has no errors in the state', () => {
				state.errors = mockErrors;
				errorsModule.mutations.clearErrorsForId( state, 20 );
				expect( state.errors ).toEqual( mockErrors );
			} );

			it( 'clears all errors associated with a given rowId', () => {
				state.errors = mockErrors;
				errorsModule.mutations.clearErrorsForId( state, 10 );
				expect( state.errors ).toEqual( { 0: mockErrors[ 0 ], 10: [] } );
			} );
		} );

		describe( 'clearValidationErrors', () => {
			it( 'does nothing if the state has no validation errors', () => {
				state.errors = {
					0: mockErrors[ 0 ]
				};
				errorsModule.mutations.clearValidationErrors( state );
				expect( state.errors ).toEqual( { 0: mockErrors[ 0 ] } );
			} );

			it( 'clears all validation errors (not zero)', () => {
				state.errors = mockErrors;
				errorsModule.mutations.clearValidationErrors( state, 10 );
				expect( state.errors ).toEqual( { 0: mockErrors[ 0 ], 10: [] } );
			} );
		} );
	} );

	describe( 'Actions', () => {
		describe( 'setError', () => {
			it( 'sets error', () => {
				const payload = {
					rowId: 10,
					errorType: Constants.errorTypes.ERROR,
					errorCode: Constants.errorCodes.MISSING_FUNCTION_OUTPUT
				};
				errorsModule.actions.setError( context, payload );
				expect( context.commit ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'setError', payload );
			} );
		} );

		describe( 'clearErrors', () => {
			it( 'calls clearErrorsForId mutation with given rowId', () => {
				errorsModule.actions.clearErrors( context, 10 );
				expect( context.commit ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'clearErrorsForId', 10 );
			} );

			it( 'calls clearErrorsForId mutation with default rowId 0', () => {
				errorsModule.actions.clearErrors( context );
				expect( context.commit ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'clearErrorsForId', 0 );
			} );
		} );

		describe( 'clearValidationErrors', () => {
			it( 'calls clearValidationErrors mutation', () => {
				errorsModule.actions.clearValidationErrors( context );
				expect( context.commit ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'clearValidationErrors' );
			} );
		} );

		describe( 'clearAllErrors', () => {
			it( 'clears both validation and page errors', () => {
				errorsModule.actions.clearAllErrors( context );
				expect( context.commit ).toHaveBeenCalledTimes( 2 );
				expect( context.commit ).toHaveBeenCalledWith( 'clearValidationErrors' );
				expect( context.commit ).toHaveBeenCalledWith( 'clearErrorsForId', 0 );
			} );
		} );
	} );
} );
