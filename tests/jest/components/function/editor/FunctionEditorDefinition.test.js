/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	flushPromises = require( '@vue/test-utils' ).flushPromises,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createGetterMock = require( '../../../helpers/getterHelpers.js' ).createGetterMock,
	mockLabels = require( '../../../fixtures/mocks.js' ).mockLabels,
	FunctionEditorName = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorName.vue' ),
	FunctionEditorAliases = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorAliases.vue' ),
	FunctionEditorInputs = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorInputs.vue' ),
	FunctionEditorOutput = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorOutput.vue' ),
	FunctionEditorFooter = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorFooter.vue' ),
	FunctionEditorDefinition = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorDefinition.vue' );

describe( 'FunctionEditorDefinition', () => {
	let getters;
	const addBtnClass = '.ext-wikilambda-function-definition__action-add-language-button';

	beforeEach( () => {
		getters = {
			currentZObjectLanguages: createGetterMock( [
				{ Z1K1: 'Z9', Z9K1: 'Z1002' },
				{ Z1K1: 'Z9', Z9K1: 'Z1004' }
			] ),
			getCurrentZLanguage: createGetterMock( 'Z1002' ),
			getCurrentZObjectId: createGetterMock( 'Z0' ),
			getLabel: createGetterMock( ( zid ) => {
				return ( zid === 'Z1002' ) ? 'Martian' :
					( zid === 'Z1004' ) ? 'Whale-talk' :
						zid;
			} ),
			getUserZlangZID: createGetterMock( 'Z1002' ),
			getViewMode: createGetterMock( false ),
			getZFunctionInputs: createGettersWithFunctionsMock( [] ),
			getZFunctionOutput: createGettersWithFunctionsMock( { id: 2 } ),
			getZTypeStringRepresentation: createGettersWithFunctionsMock( 'Z6' ),
			getZObjectChildrenById: createGettersWithFunctionsMock( [] ),
			getZObjectAsJsonById: createGettersWithFunctionsMock( mockLabels ),
			isNewZObject: createGetterMock( true ),
			isUserLoggedIn: createGetterMock( true )
		};
		actions = {
			setCurrentZLanguage: jest.fn()
		};
		global.store.hotUpdate( {
			actions: actions,
			getters: getters
		} );
	} );

	it( 'renders without errors', () => {
		var wrapper = shallowMount( FunctionEditorDefinition );
		expect( wrapper.find( '.ext-wikilambda-function-definition' ).exists() ).toBe( true );
	} );

	it( 'loads child components', ( done ) => {
		var wrapper = shallowMount( FunctionEditorDefinition );
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

	it( 'creates new form inputs for another language on add button click', () => {
		var wrapper = shallowMount( FunctionEditorDefinition, {
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
			return flushPromises();
		} ).then( () => {
			const fnDefinitionContainerEl = wrapper.find( { ref: 'fnDefinitionContainer' } ).element;
			expect( fnDefinitionContainerEl.scrollTop ).toEqual( fnDefinitionContainerEl.scrollHeight );
		} );
	} );
} );
