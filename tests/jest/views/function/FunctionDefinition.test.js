/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	mockLabels = require( '../../fixtures/mocks.js' ).mockLabels,
	FunctionDefinitionName = require( '../../../../resources/ext.wikilambda.edit/components/function/definition/function-definition-name.vue' ),
	FunctionDefinitionAliases = require( '../../../../resources/ext.wikilambda.edit/components/function/definition/function-definition-aliases.vue' ),
	FunctionDefinitionInputs = require( '../../../../resources/ext.wikilambda.edit/components/function/definition/function-definition-inputs.vue' ),
	FunctionDefinitionOutput = require( '../../../../resources/ext.wikilambda.edit/components/function/definition/function-definition-output.vue' ),
	FunctionDefinitionFooter = require( '../../../../resources/ext.wikilambda.edit/components/function/definition/function-definition-footer.vue' ),
	FunctionDefinition = require( '../../../../resources/ext.wikilambda.edit/views/function/FunctionDefinition.vue' );

describe( 'FunctionDefinition', function () {
	var getters;

	beforeEach( function () {
		getters = {
			getZkeyLabels: createGettersWithFunctionsMock( [] ),
			getCurrentZLanguage: jest.fn(),
			currentZFunctionHasInputs: jest.fn(),
			currentZFunctionHasOutput: jest.fn(),
			isNewZObject: jest.fn(),
			getViewMode: jest.fn(),
			getZObjectChildrenById: createGettersWithFunctionsMock(),
			getZObjectAsJsonById: createGettersWithFunctionsMock( mockLabels ),
			getCurrentLanguageZkeyLabels: jest.fn(),
			getAllZKeyLanguageLabels: jest.fn()
		};

		global.store.hotUpdate( {
			getters: getters
		} );

	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( FunctionDefinition );

		expect( wrapper.find( '.ext-wikilambda-function-definition' ) ).toBeTruthy();
	} );
	it( 'loads child components', function () {
		var wrapper = shallowMount( FunctionDefinition );
		expect( wrapper.findComponent( FunctionDefinitionName ) ).toBeTruthy();
		expect( wrapper.findComponent( FunctionDefinitionAliases ) ).toBeTruthy();
		expect( wrapper.findComponent( FunctionDefinitionInputs ) ).toBeTruthy();
		expect( wrapper.findComponent( FunctionDefinitionOutput ) ).toBeTruthy();
		expect( wrapper.findComponent( FunctionDefinitionFooter ) ).toBeTruthy();
	} );
} );
