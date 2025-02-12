/*!
 * WikiLambda unit test suite for the ApiError class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const ApiError = require( '../../../../resources/ext.wikilambda.app/store/classes/ApiError.js' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );

describe( 'ApiError class', () => {

	describe( 'ApiError constructor', () => {
		it( 'returns an ApiError object with code and response', () => {
			const code = 'error';
			const response = { error: { message: 'some error message' } };
			const apiError = new ApiError( code, response );
			expect( apiError.code ).toBe( code );
			expect( apiError.response ).toEqual( response );
		} );
	} );

	describe( 'fromMwApiRejection', () => {
		it( 'transforms an AJAX thrown failure into ApiError', () => {
			const code = 'http';
			const arg2 = {
				xhr: {
					readyState: 4,
					responseText: 'stringified from responseJSON',
					responseJSON: {
						error: {
							code: 'error-code',
							info: 'Some error happened'
						},
						servedby: '1312'
					},
					status: 400,
					statusText: 'Some error'
				},
				textStatus: 'error',
				exception: 'Some error'
			};
			const arg3 = undefined;
			const arg4 = undefined;

			try {
				ApiError.fromMwApiRejection( code, arg2, arg3, arg4 );
			} catch ( e ) {
				expect( e instanceof ApiError ).toBe( true );
				expect( e.message ).toBe( 'Some error happened' );
			}
		} );

		it( 'transforms an API PHP exception into ApiError', () => {
			const code = 'internal_api_error_Error';
			const arg2 = {
				error: {
					code: 'internal_api_error_Error',
					info: 'Exception caught',
					errorclass: 'Error'
				},
				servedby: '1312'
			};
			const arg3 = arg2;
			const arg4 = {
				readyState: 4,
				responseText: 'stringified from responseJSON',
				responseJSON: {
					error: {
						code: 'internal_api_error_Error',
						info: 'Exception caught',
						errorclass: 'Error'
					},
					servedby: '1312'
				},
				status: 200,
				statusText: 'OK'
			};

			try {
				ApiError.fromMwApiRejection( code, arg2, arg3, arg4 );
			} catch ( e ) {
				expect( e instanceof ApiError ).toBe( true );
				expect( e.message ).toBe( 'Exception caught' );
			}
		} );
	} );

	describe( 'ApiError.message getter', () => {
		it( 'returns undefined if response has unexpected properties', () => {
			const code = 'http';
			const response = { foo: { bar: 'Some unexpected structure' } };
			const apiError = new ApiError( code, response );
			expect( apiError.message ).toBeUndefined();
		} );

		it( 'returns undefined if response has unexpected type', () => {
			const code = 'http';
			const response = 'Some unexpected type';
			const apiError = new ApiError( code, response );
			expect( apiError.message ).toBeUndefined();
		} );

		it( 'returns error.message if available', () => {
			const code = 'http';
			const response = { error: { message: 'Some error message', info: 'Some error info' } };
			const apiError = new ApiError( code, response );
			expect( apiError.message ).toBe( 'Some error message' );
		} );

		it( 'returns error.info if error.message is not available', () => {
			const code = 'http';
			const response = { error: { info: 'Some error info' } };
			const apiError = new ApiError( code, response );
			expect( apiError.message ).toBe( 'Some error info' );
		} );

		it( 'returns zerror message key if error.zerror is available', () => {
			const code = 'http';
			const response = {
				error: {
					code: 'wikilambda-zerror',
					info: 'Error of type Z500',
					title: 'Unknown error',
					message: 'Some unknown error happened',
					zerror: {
						Z1K1: 'Z5',
						Z5K1: 'Z500',
						Z5K2: {
							Z1K1: {
								Z1K1: 'Z7',
								Z7K1: 'Z885',
								Z885K1: 'Z500'
							},
							K1: 'Some unknown error happened and here is some info'
						}
					},
					labelled: {}
				},
				servedby: '1312'
			};
			const apiError = new ApiError( code, response );
			expect( apiError.message ).toBe( 'Some unknown error happened and here is some info' );
		} );

		it( 'falls back into error.message if error.zerror has no message key', () => {
			const code = 'http';
			const response = {
				error: {
					code: 'wikilambda-zerror',
					info: 'Error of type Z500',
					title: 'Unknown error',
					message: 'Some unknown error happened',
					zerror: {
						Z1K1: 'Z5',
						Z5K1: 'Z500',
						Z5K2: {
							Z1K1: {
								Z1K1: 'Z7',
								Z7K1: 'Z885',
								Z885K1: 'Z500'
							},
							K1: 'Some unknown error happened and here is some info'
						}
					},
					labelled: {}
				},
				servedby: '1312'
			};
			const apiError = new ApiError( code, response );
			expect( apiError.message ).toBe( 'Some unknown error happened and here is some info' );
		} );

		it( 'falls back into error.message if error.zerror is not valid', () => {
			const code = 'http';
			const response = {
				error: {
					code: 'wikilambda-zerror',
					info: 'Error of type Z500',
					title: 'Unknown error',
					message: 'Some unknown error happened',
					zerror: {
						Z1K1: 'Z6',
						Z6K1: 'this is not a zerror'
					},
					labelled: {}
				},
				servedby: '1312'
			};
			const apiError = new ApiError( code, response );
			expect( apiError.message ).toBe( 'Some unknown error happened' );
		} );
	} );

	describe( 'messageForZError', () => {
		it( 'returns key of Z500/Generic error', () => {
			const code = 'http';
			const response = {
				error: {
					code: 'wikilambda-zerror',
					info: 'Error of type Z500',
					title: 'Unknown error',
					message: 'Unknown error',
					zerror: {
						Z1K1: 'Z5',
						Z5K1: 'Z500',
						Z5K2: {
							K1: 'Some error happened and here is the info'
						}
					}
				}
			};

			const apiError = new ApiError( code, response );
			expect( apiError.messageForZError ).toBe( 'Some error happened and here is the info' );
		} );

		it( 'returns key of Z548/Invalid JSON error', () => {
			const code = 'http';
			const response = {
				error: {
					code: 'wikilambda-zerror',
					info: 'Error of type Z548',
					title: 'Invalid JSON',
					message: 'Invalid JSON',
					zerror: {
						Z1K1: 'Z5',
						Z5K1: 'Z548',
						Z5K2: {
							K1: 'JSON Error: Parse error, unexpected type'
						}
					}
				}
			};

			const apiError = new ApiError( code, response );
			expect( apiError.messageForZError ).toBe( 'JSON Error: Parse error, unexpected type' );
		} );

		it( 'returns key of Z557/User cannot edit error', () => {
			const code = 'http';
			const response = {
				error: {
					code: 'wikilambda-zerror',
					info: 'Error of type Z557',
					title: 'User does not have permission to edit',
					message: 'User does not have permission to edit',
					zerror: {
						Z1K1: 'Z5',
						Z5K1: 'Z557',
						Z5K2: {
							K1: "You don't have permission to edit a Function input type."
						}
					}
				}
			};

			const apiError = new ApiError( code, response );
			expect( apiError.messageForZError ).toBe( "You don't have permission to edit a Function input type." );
		} );

		it( 'returns undefined for other ZErrors', () => {
			const code = 'http';
			const response = {
				error: {
					code: 'wikilambda-zerror',
					info: 'Error of type Z504',
					title: 'ZID not found',
					message: 'ZID not found',
					zerror: {
						Z1K1: 'Z5',
						Z5K1: 'Z504',
						Z5K2: {
							K1: 'Z1234567'
						}
					}
				}
			};

			const apiError = new ApiError( code, response );
			expect( apiError.messageForZError ).toBeUndefined();
		} );
	} );

	describe( 'messageOrFallback', () => {
		beforeEach( () => {
			global.mw.message = jest.fn().mockReturnValue( {
				text: jest.fn().mockReturnValue( 'Fallback error message' )
			} );
		} );

		it( 'returns message if code is http and message is defined', () => {
			const code = 'http';
			const response = { error: { message: 'Some error message', info: 'Some error info' } };
			const apiError = new ApiError( code, response );

			const message = apiError.messageOrFallback( 'fallback-code' );
			expect( message ).toBe( 'Some error message' );
		} );

		it( 'returns fallback if code is http but message is undefined', () => {
			const code = 'http';
			const response = { error: { data: 'No message available' } };
			const apiError = new ApiError( code, response );

			const message = apiError.messageOrFallback( 'fallback-code' );
			expect( global.mw.message ).toHaveBeenCalledWith( 'fallback-code' );
			expect( message ).toBe( 'Fallback error message' );
		} );

		it( 'returns fallback if code is not http', () => {
			const code = 'internal_api_error_Error';
			const response = { error: { message: 'Some error message' } };
			const apiError = new ApiError( code, response );

			const message = apiError.messageOrFallback( 'fallback-code' );
			expect( global.mw.message ).toHaveBeenCalledWith( 'fallback-code' );
			expect( message ).toBe( 'Fallback error message' );
		} );

		it( 'returns generic fallback if arg is not provided', () => {
			const code = 'internal_api_error_Error';
			const response = { error: { info: 'Some error info' } };
			const apiError = new ApiError( code, response );

			const message = apiError.messageOrFallback();
			expect( global.mw.message ).toHaveBeenCalledWith( Constants.errorCodes.UNKNOWN_ERROR );
			expect( message ).toBe( 'Fallback error message' );
		} );
	} );
} );
