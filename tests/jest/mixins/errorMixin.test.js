/*!
 * WikiLambda unit test suite for the errorMixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { shallowMount } = require( '@vue/test-utils' );

const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );
const createGettersWithFunctionsMock = require( '../helpers/getterHelpers.js' ).createGettersWithFunctionsMock;
const errorMixin = require( '../../../resources/ext.wikilambda.app/mixins/errorMixin.js' );
const useMainStore = require( '../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'errorMixin mixin', () => {
	let wrapper, store;

	beforeEach( () => {
		store = useMainStore();
		store.getErrors = createGettersWithFunctionsMock( [] );
		store.clearErrors = jest.fn();

		// Mocking a Vue component to test the mixin
		const TestComponent = {
			template: '<div></div>',
			mixins: [ errorMixin ],
			data() {
				return {
					keyPath: 'main.Z2K2'
				};
			}
		};
		wrapper = shallowMount( TestComponent );
	} );

	describe( 'clearFieldErrors', () => {
		it( 'should call clearErrors action if keyPath is defined and is not main', () => {
			wrapper.vm.keyPath = 'main.Z2K2';
			wrapper.vm.clearFieldErrors();

			expect( store.clearErrors ).toHaveBeenCalledWith( 'main.Z2K2' );
		} );

		it( 'should not call clearErrors action if keyPath is not defined', () => {
			wrapper.vm.keyPath = undefined;
			wrapper.vm.clearFieldErrors();

			expect( store.clearErrors ).not.toHaveBeenCalled();
		} );

		it( 'should not call clearErrors action if keyPath is main', () => {
			wrapper.vm.keyPath = 'main';
			wrapper.vm.clearFieldErrors();

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
		it( 'should return global errors for local key path', () => {
			const errors = [
				{ type: 'global_error', code: 'GLOBAL', message: 'Global error' },
				{ type: 'local_error', code: 'LOCAL', message: 'Local error' }
			];
			store.getErrors = jest.fn().mockImplementation( ( id ) => ( id === 'main.Z2K2' ) ? errors : [] );

			wrapper.vm.keyPath = 'main.Z2K2';
			expect( wrapper.vm.fieldErrors ).toEqual( errors );
		} );
	} );

	describe( 'hasFieldErrors computed property', () => {
		it( 'should return true if there are any fieldErrors', () => {
			const errors = [
				{ type: 'global_error', code: 'GLOBAL', message: 'Global error' },
				{ type: 'local_error', code: 'LOCAL', message: 'Local error' }
			];
			store.getErrors = jest.fn().mockImplementation( ( id ) => ( id === 'main.Z2K2' ) ? errors : [] );

			wrapper.vm.keyPath = 'main.Z2K2';
			expect( wrapper.vm.hasFieldErrors ).toBe( true );
		} );

		it( 'should return false if there are no fieldErrors', () => {
			store.getErrors = jest.fn().mockReturnValue( [] );
			wrapper.vm.keyPath = 'main.Z2K2';
			expect( wrapper.vm.hasFieldErrors ).toBe( false );
		} );
	} );

	describe( 'hasChildErrors', () => {
		it( 'returns true if there are error keys that are child of current keypath', () => {
			store.getChildErrorKeys = jest.fn().mockReturnValue( [
				'main.Z2K2.Z12K1',
				'main.Z2K2.Z12K1.2'
			] );

			wrapper.vm.keyPath = 'main.Z2K2';
			expect( wrapper.vm.hasChildErrors ).toBe( true );
		} );

		it( 'returns false if there are no error keys that are child of current keypath', () => {
			store.getChildErrorKeys = jest.fn().mockReturnValue( [] );

			wrapper.vm.keyPath = 'main.Z2K5';
			expect( wrapper.vm.hasChildErrors ).toBe( false );
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
