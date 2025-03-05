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

const responseObject = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z22' },
	Z22K1: { Z1K1: 'Z6', Z6K1: 'one two' },
	Z22K2: {}
};

describe( 'EvaluationResult', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getCurrentZObjectId = 'Z0';
		store.getCurrentZObjectType = createGettersWithFunctionsMock( 'Z14' );
		store.getLabelData = createLabelDataMock();
		store.getZObjectByKeyPath = createGettersWithFunctionsMock( responseObject );
	} );

	describe( 'with no result', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( EvaluationResult );
			expect( wrapper.find( '.ext-wikilambda-app-evaluation-result' ).exists() ).toBe( true );
		} );
	} );

	describe( 'with result', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( EvaluationResult );
			expect( wrapper.find( '.ext-wikilambda-app-evaluation-result' ).exists() ).toBe( true );
		} );

		it( 'renders result object', () => {
			const wrapper = shallowMount( EvaluationResult );
			const result = wrapper.find( '.ext-wikilambda-app-evaluation-result__result' );

			const resultComponent = result.findComponent( { name: 'wl-z-object-key-value' } );
			expect( resultComponent.exists() ).toBe( true );
			expect( resultComponent.props( 'keyPath' ) ).toBe( 'response.Z22K1' );
			expect( resultComponent.props( 'objectValue' ) ).toEqual( { Z1K1: 'Z6', Z6K1: 'one two' } );
		} );
	} );

	describe( 'with metadata', () => {
		beforeEach( () => {
			store.getMetadata = {};
		} );

		it( 'renders without errors', () => {
			const wrapper = shallowMount( EvaluationResult );
			expect( wrapper.find( '.ext-wikilambda-app-evaluation-result' ).exists() ).toBe( true );
		} );

		it( 'renders metadata link', () => {
			const wrapper = shallowMount( EvaluationResult );
			const actions = wrapper.find( '.ext-wikilambda-app-evaluation-result__actions' );
			expect( actions.find( '.ext-wikilambda-app-evaluation-result__action-details' ).exists() ).toBe( true );
		} );

		it( 'renders metadata dialog', () => {
			const wrapper = shallowMount( EvaluationResult );
			expect( wrapper.findComponent( { name: 'wl-function-metadata-dialog' } ).exists() ).toBe( true );
		} );
	} );
} );
