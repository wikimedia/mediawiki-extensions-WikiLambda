/*!
 * WikiLambda unit test suite for the errorMixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const { metadataBasic, convertSetToMap } = require( '../fixtures/metadata.js' );

const createGettersWithFunctionsMock = require( '../helpers/getterHelpers.js' ).createGettersWithFunctionsMock;
const createLabelDataMock = require( '../helpers/getterHelpers.js' ).createLabelDataMock;
const errorMixin = require( '../../../resources/ext.wikilambda.app/mixins/errorMixin.js' );
const useMainStore = require( '../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'errorMixin mixin', () => {
	let wrapper, store;

	beforeEach( () => {
		store = useMainStore();
		store.getErrors = createGettersWithFunctionsMock( [] );
		store.clearErrors = jest.fn();
		store.fetchZids = jest.fn().mockResolvedValue();
		store.getStoredObject = createGettersWithFunctionsMock();
		store.getLabelData = createLabelDataMock( {
			Z500: 'Generic error',
			Z1500: 'Custom error'
		} );

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

		describe( 'getErrorMessage', () => {
			it( 'should return the error message from error object', () => {
				const error = { message: 'Error occurred' };
				expect( wrapper.vm.getErrorMessage( error ) ).toBe( 'Error occurred' );
			} );
		} );

		describe( 'setErrorMessageCallback', () => {
			it( 'calls callback with fallback message if there is no metadata', () => {
				const fallbackMsg = 'fallback error message';
				const callback = jest.fn();
				wrapper.vm.setErrorMessageCallback( null, fallbackMsg, callback );
				expect( callback ).toHaveBeenCalledWith( fallbackMsg );
			} );

			it( 'calls callback with fallback message if metadata has no errors', () => {
				const fallbackMsg = 'fallback error message';
				const callback = jest.fn();
				wrapper.vm.setErrorMessageCallback( metadataBasic, fallbackMsg, callback );
				expect( callback ).toHaveBeenCalledWith( fallbackMsg );
			} );

			it( 'calls callback with generic error message (global keys)', () => {
				const callback = jest.fn();
				const fallbackMsg = 'fallback error message';
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

				wrapper.vm.setErrorMessageCallback( metadata, fallbackMsg, callback );
				expect( callback ).toHaveBeenCalledWith( 'some generic error message' );
			} );

			it( 'calls callback with generic error message (local keys)', () => {
				const callback = jest.fn();
				const fallbackMsg = 'fallback error message';
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

				wrapper.vm.setErrorMessageCallback( metadata, fallbackMsg, callback );
				expect( callback ).toHaveBeenCalledWith( 'some generic error message' );
			} );

			it( 'calls callback with fallback error message when generic error has non-string key', async () => {
				const callback = jest.fn();
				const fallbackMsg = 'fallback error message';
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

				wrapper.vm.setErrorMessageCallback( metadata, fallbackMsg, callback );
				await waitFor( () => expect( callback ).toHaveBeenCalledWith( fallbackMsg ) );
			} );

			it( 'calls callback with custom error zid was successfully fetched', async () => {
				store.getStoredObject = jest.fn().mockReturnValue( {
					Z1K1: 'Z2',
					Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1500' },
					Z2K2: { Z1K1: 'Z50' }
				} );

				const callback = jest.fn();
				const fallbackMsg = 'fallback error message';
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

				wrapper.vm.setErrorMessageCallback( metadata, fallbackMsg, callback );
				await waitFor( () => expect( callback ).toHaveBeenCalledWith( 'Custom error' ) );
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
