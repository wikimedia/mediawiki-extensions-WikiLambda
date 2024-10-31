/*!
 * WikiLambda unit test suite for the default EvaluationResult component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createLabelDataMock = require( '../../../helpers/getterHelpers.js' ).createLabelDataMock,
	createGetterMock = require( '../../../helpers/getterHelpers.js' ).createGetterMock,
	EvaluationResult = require( '../../../../../resources/ext.wikilambda.app/components/widgets/function-evaluator/EvaluationResult.vue' );

describe( 'EvaluationResult', () => {
	let getters;
	beforeEach( () => {
		getters = {
			getMetadata: createGetterMock(),
			getCurrentZObjectId: createGetterMock( 'Z0' ),
			getLabelData: createLabelDataMock(),
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
			getters.getMetadata = createGetterMock( {} );
			global.store.hotUpdate( {
				actions: actions,
				getters: getters
			} );
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
