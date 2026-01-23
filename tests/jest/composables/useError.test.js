/*!
 * WikiLambda unit test suite for the useError composable.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const loadComposable = require( '../helpers/loadComposable.js' );
const createGettersWithFunctionsMock = require( '../helpers/getterHelpers.js' ).createGettersWithFunctionsMock;
const useError = require( '../../../resources/ext.wikilambda.app/composables/useError.js' );
const useMainStore = require( '../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'useError', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getErrors = createGettersWithFunctionsMock( [] );
		store.getErrorPaths = [];
		store.getChildErrorKeys = createGettersWithFunctionsMock( [] );
	} );

	describe( 'clearFieldErrors', () => {
		it( 'should call clearErrors action if keyPath is defined and is not main', () => {
			const [ errorComposable ] = loadComposable( () => useError( { keyPath: 'main.Z2K2' } ) );
			errorComposable.clearFieldErrors();

			expect( store.clearErrors ).toHaveBeenCalledWith( 'main.Z2K2' );
		} );

		it( 'should not call clearErrors action if keyPath is not defined', async () => {
			const [ errorComposable, wrapper ] = loadComposable( () => useError( { keyPath: undefined } ) );
			errorComposable.clearFieldErrors();

			expect( store.clearErrors ).not.toHaveBeenCalled();
			wrapper.unmount();
		} );

		it( 'should not call clearErrors action if keyPath is main', async () => {
			const [ errorComposable, wrapper ] = loadComposable( () => useError( { keyPath: 'main' } ) );
			errorComposable.clearFieldErrors();

			expect( store.clearErrors ).not.toHaveBeenCalled();
			wrapper.unmount();
		} );
	} );

	describe( 'fieldErrors', () => {
		it( 'should return errors for local key path', () => {
			const errors = [
				{ type: 'global_error', code: 'GLOBAL', message: 'Global error' },
				{ type: 'local_error', code: 'LOCAL', message: 'Local error' }
			];
			store.getErrors = jest.fn().mockImplementation( ( id ) => ( id === 'main.Z2K2' ) ? errors : [] );

			const [ errorComposable ] = loadComposable( () => useError( { keyPath: 'main.Z2K2' } ) );

			expect( errorComposable.fieldErrors.value ).toEqual( errors );
		} );

		it( 'should return empty array for main keyPath', async () => {
			store.getErrors = jest.fn().mockReturnValue( [] );

			const [ errorComposable ] = loadComposable( () => useError( { keyPath: 'main' } ) );

			expect( errorComposable.fieldErrors.value ).toEqual( [] );
		} );
	} );

	describe( 'hasFieldErrors', () => {
		it( 'should return true if there are any fieldErrors', () => {
			const errors = [
				{ type: 'global_error', code: 'GLOBAL', message: 'Global error' },
				{ type: 'local_error', code: 'LOCAL', message: 'Local error' }
			];
			store.getErrors = jest.fn().mockImplementation( ( id ) => ( id === 'main.Z2K2' ) ? errors : [] );

			const [ errorComposable ] = loadComposable( () => useError( { keyPath: 'main.Z2K2' } ) );

			expect( errorComposable.hasFieldErrors.value ).toBe( true );
		} );

		it( 'should return false if there are no fieldErrors', () => {
			store.getErrors = jest.fn().mockReturnValue( [] );

			const [ errorComposable ] = loadComposable( () => useError( { keyPath: 'main.Z2K2' } ) );

			expect( errorComposable.hasFieldErrors.value ).toBe( false );
		} );
	} );

	describe( 'hasChildErrors', () => {
		it( 'returns true if there are error keys that are child of current keypath', () => {
			// Mock the store getter to return a function that returns the array
			store.getChildErrorKeys = jest.fn().mockReturnValue( [
				'main.Z2K2.Z12K1',
				'main.Z2K2.Z12K1.2'
			] );

			const [ errorComposable ] = loadComposable( () => useError( { keyPath: 'main.Z2K2' } ) );

			expect( errorComposable.hasChildErrors.value ).toBe( true );
		} );

		it( 'returns false if there are no error keys that are child of current keypath', () => {
			// Mock the store getter to return a function that returns empty array
			store.getChildErrorKeys = jest.fn().mockReturnValue( [] );

			const [ errorComposable ] = loadComposable( () => useError( { keyPath: 'main.Z2K2' } ) );

			expect( errorComposable.hasChildErrors.value ).toBe( false );
		} );
	} );
} );
