/*!
 * WikiLambda unit test suite for the default ZEvaluationResult component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	ZEvaluationResult = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZEvaluationResult.vue' );

describe( 'ZEvaluationResult', () => {
	var getters;
	beforeEach( () => {
		getters = {
			getLabel: createGettersWithFunctionsMock(),
			getMapValueByKey: createGettersWithFunctionsMock( undefined ),
			getRowByKeyPath: createGettersWithFunctionsMock( undefined ),
			getZObjectAsJsonById: createGettersWithFunctionsMock( {} )
		};
		actions = {
			fetchZids: jest.fn()
		};
		global.store.hotUpdate( {
			actions: actions,
			getters: getters
		} );
	} );

	describe( 'with no result', () => {
		it( 'renders without errors', () => {
			var wrapper = shallowMount( ZEvaluationResult, {
				props: {
					edit: false
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-evaluation-result' ).exists() ).toBe( true );
		} );
	} );

	describe( 'with result', () => {
		beforeEach( () => {
			getters.getRowByKeyPath = () => ( keyPath ) => {
				const row = { id: 1, parent: 0, key: '', value: '' };
				return ( keyPath[ 0 ] === Constants.Z_RESPONSEENVELOPE_VALUE ) ? row : undefined;
			};
			global.store.hotUpdate( {
				actions: actions,
				getters: getters
			} );
		} );

		it( 'renders without errors', () => {
			var wrapper = shallowMount( ZEvaluationResult, {
				props: {
					edit: false
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-evaluation-result' ).exists() ).toBe( true );
		} );

		it( 'renders result object', () => {
			var wrapper = shallowMount( ZEvaluationResult, {
				props: {
					edit: false
				}
			} );
			const result = wrapper.find( '.ext-wikilambda-evaluation-result-result' );
			expect( result.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
			expect( result.findComponent( { name: 'wl-z-object-key-value' } ).props() ).toHaveProperty( 'rowId', 1 );
		} );
	} );

	describe( 'with metadata', () => {
		beforeEach( () => {
			getters.getRowByKeyPath = () => ( keyPath ) => {
				const row = { id: 1, parent: 0, key: '', value: '' };
				return ( keyPath[ 0 ] === Constants.Z_RESPONSEENVELOPE_METADATA ) ? row : undefined;
			};
			global.store.hotUpdate( {
				actions: actions,
				getters: getters
			} );
		} );

		it( 'renders without errors', () => {
			var wrapper = shallowMount( ZEvaluationResult, {
				props: {
					edit: false
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-evaluation-result' ).exists() ).toBe( true );
		} );

		it( 'renders metadata link', () => {
			var wrapper = shallowMount( ZEvaluationResult, {
				props: {
					edit: false
				}
			} );
			const actions = wrapper.find( '.ext-wikilambda-evaluation-result-actions' );
			expect( actions.find( '.ext-wikilambda-evaluation-result-actions__metadata' ).exists() ).toBe( true );
		} );

		it( 'renders metadata dialog', () => {
			var wrapper = shallowMount( ZEvaluationResult, {
				props: {
					edit: false
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-evaluation-result-metadata-dialog' ).exists() ).toBe( true );
		} );
	} );

	describe( 'with errors', () => {
		beforeEach( () => {
			getters.getRowByKeyPath = () => ( keyPath ) => {
				const row = { id: 1, parent: 0, key: '', value: '' };
				return ( keyPath[ 0 ] === Constants.Z_RESPONSEENVELOPE_METADATA ) ? row : undefined;
			};
			getters.getMapValueByKey = createGettersWithFunctionsMock( { id: 2 } );
			global.store.hotUpdate( {
				actions: actions,
				getters: getters
			} );
		} );

		it( 'renders without errors', () => {
			var wrapper = shallowMount( ZEvaluationResult, {
				props: {
					edit: false
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-evaluation-result' ).exists() ).toBe( true );
		} );

		it( 'renders metadata and error links', () => {
			var wrapper = shallowMount( ZEvaluationResult, {
				props: {
					edit: false
				}
			} );
			const actions = wrapper.find( '.ext-wikilambda-evaluation-result-actions' );
			expect( actions.find( '.ext-wikilambda-evaluation-result-actions__metadata' ).exists() ).toBe( true );
			expect( actions.find( '.ext-wikilambda-evaluation-result-actions__error' ).exists() ).toBe( true );
		} );

		it( 'renders metadata and error dialogs', () => {
			var wrapper = shallowMount( ZEvaluationResult, {
				props: {
					edit: false
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-evaluation-result-metadata-dialog' ).exists() ).toBe( true );
			expect( wrapper.find( '.ext-wikilambda-evaluation-result-error-dialog' ).exists() ).toBe( true );
		} );
	} );
} );
