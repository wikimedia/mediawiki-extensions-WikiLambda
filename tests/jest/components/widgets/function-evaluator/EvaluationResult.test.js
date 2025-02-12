/*!
 * WikiLambda unit test suite for the default EvaluationResult component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock;
const createLabelDataMock = require( '../../../helpers/getterHelpers.js' ).createLabelDataMock;
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const EvaluationResult = require( '../../../../../resources/ext.wikilambda.app/components/widgets/function-evaluator/EvaluationResult.vue' );

describe( 'EvaluationResult', () => {
	let store;
	beforeEach( () => {
		store = useMainStore();
		store.getMetadata = {};
		store.getCurrentZObjectId = 'Z0';
		store.getLabelData = createLabelDataMock();
		store.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z8' );
		store.getZPersistentContentRowId = createGettersWithFunctionsMock( 0 );
	} );

	describe( 'with no result', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( EvaluationResult );
			expect( wrapper.find( '.ext-wikilambda-app-evaluation-result' ).exists() ).toBe( true );
		} );
	} );

	describe( 'with result', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( EvaluationResult, { props: { rowId: 1 } } );
			expect( wrapper.find( '.ext-wikilambda-app-evaluation-result' ).exists() ).toBe( true );
		} );

		it( 'renders result object', () => {
			const wrapper = shallowMount( EvaluationResult, { props: { rowId: 1 } } );
			const result = wrapper.find( '.ext-wikilambda-app-evaluation-result__result' );
			expect( result.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
			expect( result.findComponent( { name: 'wl-z-object-key-value' } ).props() ).toHaveProperty( 'rowId', 1 );
		} );
	} );

	describe( 'with metadata', () => {
		beforeEach( () => {
			store.getMetadata = {};
		} );

		it( 'renders without errors', () => {
			const wrapper = shallowMount( EvaluationResult, { props: { rowId: 1 } } );
			expect( wrapper.find( '.ext-wikilambda-app-evaluation-result' ).exists() ).toBe( true );
		} );

		it( 'renders metadata link', () => {
			const wrapper = shallowMount( EvaluationResult, { props: { rowId: 1 } } );
			const actions = wrapper.find( '.ext-wikilambda-app-evaluation-result__actions' );
			expect( actions.find( '.ext-wikilambda-app-evaluation-result__action-details' ).exists() ).toBe( true );
		} );

		it( 'renders metadata dialog', () => {
			const wrapper = shallowMount( EvaluationResult, { props: { rowId: 1 } } );
			expect( wrapper.findComponent( { name: 'wl-function-metadata-dialog' } ).exists() ).toBe( true );
		} );
	} );
} );
