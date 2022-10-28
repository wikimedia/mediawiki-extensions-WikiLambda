/*!
 * WikiLambda unit test suite for the callZFunction Vuex module
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var errorsModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/errors.js' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	mockErrors = {
		10: {
			state: true,
			message: 'wikilambda-missing-function-output-error-message',
			type: Constants.errorTypes.ERROR
		}
	},
	mockPayload = {
		internalId: 10,
		errorState: true,
		errorMessage: 'wikilambda-missing-function-output-error-message',
		errorType: Constants.errorTypes.ERROR
	},
	context,
	state;

describe( 'Errors Vuex module', function () {
	beforeEach( function () {
		state = JSON.parse( JSON.stringify( errorsModule.state ) );

		context = $.extend( {}, {
			commit: jest.fn( () => {
				return;
			} )
		} );
	} );
	describe( 'Getters', function () {
		it( 'should return an empty object when there are no errors', function () {
			expect( errorsModule.getters.getErrors( state ) ).toEqual( {} );
		} );
		it( 'returns an object of errors', function () {
			state.errors = mockErrors;
			expect( errorsModule.getters.getErrors( state ) ).toEqual( mockErrors );
		} );
	} );

	describe( 'Mutations', () => {
		describe( 'setError', () => {
			it( 'sets error in the state', function () {
				errorsModule.mutations.setError( state, mockPayload );
				expect( state.errors ).toEqual( mockErrors );
			} );
		} );
	} );

	describe( 'Actions', function () {
		describe( 'setError', () => {
			it( 'sets error', () => {
				errorsModule.actions.setError( context, mockPayload );

				expect( context.commit ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'setError', mockPayload );
			} );
		} );
	} );
} );
