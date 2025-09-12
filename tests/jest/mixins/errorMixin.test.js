/*!
 * WikiLambda unit test suite for the errorMixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { shallowMount } = require( '@vue/test-utils' );

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

	describe( 'methods', () => {
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
	} );

	describe( 'computed properties', () => {
		describe( 'fieldErrors', () => {
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

		describe( 'hasFieldErrors', () => {
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
	} );
} );
