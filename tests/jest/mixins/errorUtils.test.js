/*!
 * WikiLambda unit test suite for the errorUtils mixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { shallowMount } = require( '@vue/test-utils' );

const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );
const createGettersWithFunctionsMock = require( '../helpers/getterHelpers.js' ).createGettersWithFunctionsMock;
const errorUtils = require( '../../../resources/ext.wikilambda.app/mixins/errorUtils.js' );
const useMainStore = require( '../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'errorUtils mixin', () => {
	let wrapper, store;

	beforeEach( () => {
		store = useMainStore();
		store.getErrors = createGettersWithFunctionsMock( [] );
		store.clearErrors = jest.fn();

		// Mocking a Vue component to test the mixin
		const TestComponent = {
			template: '<div></div>',
			mixins: [ errorUtils ],
			data() {
				return {
					rowId: 1
				};
			}
		};
		wrapper = shallowMount( TestComponent );
	} );

	describe( 'setLocalError', () => {
		it( 'should add an error to localErrors', () => {
			const payload = {
				type: 'error',
				code: 'Z500',
				message: 'message1'
			};
			wrapper.vm.setLocalError( payload );

			expect( wrapper.vm.localErrors ).toHaveLength( 1 );
			expect( wrapper.vm.localErrors[ 0 ] ).toEqual( payload );
		} );
	} );

	describe( 'clearFieldErrors', () => {
		it( 'should clear localErrors and call clearErrors action if rowId is defined and greater than 0', () => {
			wrapper.vm.localErrors = [ { type: 'error', code: 'Z500', message: 'message1' } ];
			wrapper.vm.clearFieldErrors();

			expect( wrapper.vm.localErrors ).toHaveLength( 0 );
			expect( store.clearErrors ).toHaveBeenCalledWith( 1 );
		} );

		it( 'should not call clearErrors action if rowId is not defined or is 0', () => {
			wrapper.vm.rowId = 0;
			wrapper.vm.clearFieldErrors();

			expect( wrapper.vm.localErrors ).toHaveLength( 0 );
			expect( store.clearErrors ).not.toHaveBeenCalled();
		} );
	} );

	describe( 'getErrorMessage', () => {
		it( 'should return the error message from error object', () => {
			const error = { message: 'Error occurred' };
			expect( wrapper.vm.getErrorMessage( error ) ).toBe( 'Error occurred' );
		} );
	} );

	describe( 'fieldErrors computed property', () => {
		it( 'should return combined localErrors and global errors from store', () => {
			const globalErrors = [ { type: 'global_error', code: 'GLOBAL', message: 'Global error' } ];
			store.getErrors = createGettersWithFunctionsMock( globalErrors );

			wrapper.vm.localErrors = [ { type: 'local_error', code: 'LOCAL', message: 'Local error' } ];

			expect( wrapper.vm.fieldErrors ).toEqual( [
				{ type: 'global_error', code: 'GLOBAL', message: 'Global error' },
				{ type: 'local_error', code: 'LOCAL', message: 'Local error' }
			] );
		} );
	} );

	describe( 'hasFieldErrors computed property', () => {
		it( 'should return true if there are any fieldErrors', () => {
			wrapper.vm.localErrors = [ { type: 'error', code: 'CODE', message: 'Error' } ];
			expect( wrapper.vm.hasFieldErrors ).toBe( true );
		} );

		it( 'should return false if there are no fieldErrors', () => {
			wrapper.vm.localErrors = [];
			expect( wrapper.vm.hasFieldErrors ).toBe( false );
		} );
	} );

	describe( 'extractErrorMessage', () => {
		it( 'should return undefined if error.zerror is not defined', () => {
			const error = {};
			expect( wrapper.vm.extractErrorMessage( error ) ).toBeUndefined();
		} );

		it( 'should return the error message for generic errors', () => {
			const error = {
				zerror: {
					Z1K1: 'Z5',
					Z5K1: Constants.Z_GENERIC_ERROR,
					Z5K2: {
						Z1K1: {
							Z1K1: 'Z7',
							Z7K1: 'Z885',
							Z885K1: Constants.Z_GENERIC_ERROR
						},
						K1: 'Description too long for language English.'
					}
				}
			};

			expect( wrapper.vm.extractErrorMessage( error ) ).toBe( 'Description too long for language English.' );
		} );
	} );
} );
