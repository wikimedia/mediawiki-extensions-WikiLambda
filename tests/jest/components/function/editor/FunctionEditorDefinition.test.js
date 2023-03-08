/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	mockLabels = require( '../../../fixtures/mocks.js' ).mockLabels,
	FunctionEditorName = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorName.vue' ),
	FunctionEditorAliases = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorAliases.vue' ),
	FunctionEditorInputs = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorInputs.vue' ),
	FunctionEditorOutput = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorOutput.vue' ),
	FunctionEditorFooter = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorFooter.vue' ),
	FunctionEditorDefinition = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorDefinition.vue' );

describe( 'FunctionEditorDefinition', function () {
	let getters;
	const addBtnClass = '.ext-wikilambda-function-definition__action-add-language-button';

	beforeEach( function () {
		getters = {
			getZkeyLabels: () => { return { Z1002: 'Martian', Z1004: 'Whale-talk' }; },
			getCurrentZLanguage: jest.fn().mockReturnValue( 'Z10002' ),
			currentZFunctionHasValidInputs: () => false,
			currentZFunctionHasOutput: () => false,
			currentZObjectLanguages: () => [
				{
					Z1K1: 'Z9',
					Z9K1: 'Z1002'
				},
				{
					Z1K1: 'Z9',
					Z9K1: 'Z1004'
				}
			],
			isNewZObject: jest.fn(),
			getViewMode: jest.fn(),
			getZObjectChildrenById: createGettersWithFunctionsMock(),
			getZObjectAsJsonById: createGettersWithFunctionsMock( mockLabels ),
			getAllZKeyLanguageLabels: jest.fn(),
			getZargumentsArray: createGettersWithFunctionsMock(),
			getNestedZObjectById: createGettersWithFunctionsMock( jest.fn() ),
			getAllItemsFromListById: createGettersWithFunctionsMock( [] )
		};
		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	it( 'renders without errors', () => {
		var wrapper = VueTestUtils.shallowMount( FunctionEditorDefinition );
		expect( wrapper.find( '.ext-wikilambda-function-definition' ).exists() ).toBe( true );
	} );

	it( 'loads child components', ( done ) => {
		var wrapper = VueTestUtils.shallowMount( FunctionEditorDefinition );
		global.store.hotUpdate( { getters: getters } );
		wrapper.vm.$nextTick( () => {
			// Two sets of label inputs for the two languages.
			expect( wrapper.findAll( '.ext-wikilambda-function-definition__container__input' ).length ).toEqual( 2 );
			expect( wrapper.findAllComponents( FunctionEditorName ).length ).toEqual( 2 );
			expect( wrapper.findAllComponents( FunctionEditorAliases ).length ).toEqual( 2 );
			expect( wrapper.findAllComponents( FunctionEditorInputs ).length ).toEqual( 2 );

			expect( wrapper.findComponent( FunctionEditorOutput ).exists() ).toBe( true );
			expect( wrapper.findComponent( FunctionEditorFooter ).exists() ).toBe( true );
			done();
		} );
	} );

	it( 'creates new form inputs for another language on add button click', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionEditorDefinition, {
			data() {
				return {
					labelLanguages: [
						{ zLang: 'Z1004', label: 'français', readOnly: true }
					]
				};
			},
			global: {
				stubs: { CdxButton: false, FunctionEditorDefinition: false }
			}
		} );
		return wrapper.findComponent( addBtnClass ).trigger( 'click' ).then( () => {
			expect( wrapper.findAllComponents( FunctionEditorName ).length ).toEqual( 2 );
			expect( wrapper.findAllComponents( FunctionEditorAliases ).length ).toEqual( 2 );
			expect( wrapper.findAllComponents( FunctionEditorInputs ).length ).toEqual( 2 );

			expect( wrapper.findAllComponents( FunctionEditorOutput ).length ).toEqual( 1 );
			expect( wrapper.findAllComponents( FunctionEditorFooter ).length ).toEqual( 1 );
			return VueTestUtils.flushPromises();
		} ).then( function () {
			const fnDefinitionContainerEl = wrapper.find( { ref: 'fnDefinitionContainer' } ).element;
			expect( fnDefinitionContainerEl.scrollTop ).toEqual( fnDefinitionContainerEl.scrollHeight );
		} );
	} );
} );
