/*!
 * WikiLambda unit test suite for the default ZEvaluationResult component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' ),
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock,
	createGetterMock = require( '../../helpers/getterHelpers.js' ).createGetterMock,
	ZEvaluationResult = require( '../../../../resources/ext.wikilambda.app/components/default-view-types/ZEvaluationResult.vue' );

describe( 'ZEvaluationResult', () => {
	let getters;
	beforeEach( () => {
		getters = {
			getCurrentZObjectId: createGetterMock( 'Z0' ),
			getLabelData: createLabelDataMock(),
			getMapValueByKey: createGettersWithFunctionsMock( undefined ),
			getRowByKeyPath: createGettersWithFunctionsMock( undefined ),
			getZObjectAsJsonById: createGettersWithFunctionsMock( {} ),
			getZObjectTypeByRowId: createGettersWithFunctionsMock( 'Z8' ),
			getZPersistentContentRowId: createGettersWithFunctionsMock( 0 )
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
			const wrapper = shallowMount( ZEvaluationResult );
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
			const wrapper = shallowMount( ZEvaluationResult );
			expect( wrapper.find( '.ext-wikilambda-evaluation-result' ).exists() ).toBe( true );
		} );

		it( 'renders result object', () => {
			const wrapper = shallowMount( ZEvaluationResult );
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
			const wrapper = shallowMount( ZEvaluationResult );
			expect( wrapper.find( '.ext-wikilambda-evaluation-result' ).exists() ).toBe( true );
		} );

		it( 'renders metadata link', () => {
			const wrapper = shallowMount( ZEvaluationResult );
			const actions = wrapper.find( '.ext-wikilambda-evaluation-result-actions' );
			expect( actions.find( '.ext-wikilambda-evaluation-result-actions__metadata' ).exists() ).toBe( true );
		} );

		it( 'renders metadata dialog', () => {
			const wrapper = shallowMount( ZEvaluationResult );
			expect( wrapper.findComponent( { name: 'wl-function-metadata-dialog' } ).exists() ).toBe( true );
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
			const wrapper = shallowMount( ZEvaluationResult );
			expect( wrapper.find( '.ext-wikilambda-evaluation-result' ).exists() ).toBe( true );
		} );

		it( 'renders metadata and error links', () => {
			const wrapper = shallowMount( ZEvaluationResult );
			const actions = wrapper.find( '.ext-wikilambda-evaluation-result-actions' );
			expect( actions.find( '.ext-wikilambda-evaluation-result-actions__metadata' ).exists() ).toBe( true );
			expect( actions.find( '.ext-wikilambda-evaluation-result-actions__error' ).exists() ).toBe( true );
		} );

		it( 'renders metadata and error dialogs', () => {
			const wrapper = shallowMount( ZEvaluationResult );
			expect( wrapper.findComponent( { name: 'wl-function-metadata-dialog' } ).exists() ).toBe( true );
			expect( wrapper.find( '.ext-wikilambda-evaluation-result-error-dialog' ).exists() ).toBe( true );
		} );
	} );
} );
