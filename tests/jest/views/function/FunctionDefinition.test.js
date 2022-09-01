/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { CdxMessage } = require( '@wikimedia/codex' );

var VueTestUtils = require( '@vue/test-utils' ),
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	mockLabels = require( '../../fixtures/mocks.js' ).mockLabels,
	FunctionDefinitionName = require( '../../../../resources/ext.wikilambda.edit/components/function/definition/FunctionDefinitionName.vue' ),
	FunctionDefinitionAliases = require( '../../../../resources/ext.wikilambda.edit/components/function/definition/FunctionDefinitionAliases.vue' ),
	FunctionDefinitionInputs = require( '../../../../resources/ext.wikilambda.edit/components/function/definition/FunctionDefinitionInputs.vue' ),
	FunctionDefinitionOutput = require( '../../../../resources/ext.wikilambda.edit/components/function/definition/FunctionDefinitionOutput.vue' ),
	FunctionDefinitionFooter = require( '../../../../resources/ext.wikilambda.edit/components/function/definition/FunctionDefinitionFooter.vue' ),
	FunctionDefinition = require( '../../../../resources/ext.wikilambda.edit/views/function/FunctionDefinition.vue' );

describe( 'FunctionDefinition', function () {
	let getters;
	const addBtnClass = '.ext-wikilambda-function-definition__action-add-input-button';

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
		var wrapper = VueTestUtils.shallowMount( FunctionDefinition );
		expect( wrapper.find( '.ext-wikilambda-function-definition' ).exists() ).toBe( true );
	} );

	it( 'loads child components', ( done ) => {
		var wrapper = VueTestUtils.shallowMount( FunctionDefinition );
		global.store.hotUpdate( { getters: getters } );
		wrapper.vm.$nextTick( () => {
			// Two sets of label inputs for the two languages.
			expect( wrapper.findAll( '.ext-wikilambda-function-definition__container__input' ).length ).toEqual( 2 );
			expect( wrapper.findAllComponents( FunctionDefinitionName ).length ).toEqual( 2 );
			expect( wrapper.findAllComponents( FunctionDefinitionAliases ).length ).toEqual( 2 );
			expect( wrapper.findAllComponents( FunctionDefinitionInputs ).length ).toEqual( 2 );

			expect( wrapper.findComponent( FunctionDefinitionOutput ).exists() ).toBe( true );
			expect( wrapper.findComponent( FunctionDefinitionFooter ).exists() ).toBe( true );
			done();
		} );
	} );
	it( 'does not initially display toast', ( done ) => {
		var wrapper = VueTestUtils.shallowMount( FunctionDefinition );
		global.store.hotUpdate( { getters: getters } );
		wrapper.vm.$nextTick( () => {
			expect( wrapper.findComponent( CdxMessage ).exists() ).toBe( false );
			done();
		} );
	} );
	it( 'displays success toast when function becomes publishable', ( done ) => {
		var wrapper = VueTestUtils.shallowMount( FunctionDefinition );
		getters.currentZFunctionHasValidInputs = () => true;
		getters.currentZFunctionHasOutput = () => true;
		global.store.hotUpdate( { getters: getters } );
		wrapper.vm.$nextTick( () => {
			expect( wrapper.findComponent( CdxMessage ).exists() ).toBe( true );
			expect( wrapper.findComponent( CdxMessage ).props( 'type' ) ).toEqual( 'success' );
			done();
		} );
	} );

	it( 'creates new form inputs for another language on add button click', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionDefinition, {
			data() {
				return {
					labelLanguages: [
						{ zLang: 'Z1004', label: 'français', readOnly: true }
					]
				};
			},
			global: {
				stubs: { CdxButton: false, FunctionDefinition: false }
			}
		} );
		return wrapper.findComponent( addBtnClass ).trigger( 'click' ).then( () => {
			expect( wrapper.findAllComponents( FunctionDefinitionName ).length ).toEqual( 2 );
			expect( wrapper.findAllComponents( FunctionDefinitionAliases ).length ).toEqual( 2 );
			expect( wrapper.findAllComponents( FunctionDefinitionInputs ).length ).toEqual( 2 );

			expect( wrapper.findAllComponents( FunctionDefinitionOutput ).length ).toEqual( 1 );
			expect( wrapper.findAllComponents( FunctionDefinitionFooter ).length ).toEqual( 1 );
			return VueTestUtils.flushPromises();
		} ).then( function () {
			const fnDefinitionContainerEl = wrapper.find( { ref: 'fnDefinitionContainer' } ).element;
			expect( fnDefinitionContainerEl.scrollTop ).toEqual( fnDefinitionContainerEl.scrollHeight );
		} );
	} );
} );
