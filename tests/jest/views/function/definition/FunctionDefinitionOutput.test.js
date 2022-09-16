/*!
 * WikiLambda unit test suite for the function-definition-output component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { CdxLookup } = require( '@wikimedia/codex' );
var shallowMount = require( '@vue/test-utils' ).shallowMount,
	mount = require( '@vue/test-utils' ).mount,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionDefinitionOutput = require( '../../../../../resources/ext.wikilambda.edit/components/function/definition/FunctionDefinitionOutput.vue' ),
	ZObjectSelector = require( '../../../../../resources/ext.wikilambda.edit/components/ZObjectSelector.vue' );

describe( 'FunctionDefinitionOutput', function () {
	var getters;

	beforeEach( function () {
		getters = {
			getNestedZObjectById: createGettersWithFunctionsMock( { id: 10 } )
		};

		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( FunctionDefinitionOutput );

		expect( wrapper.find( '.ext-wikilambda-function-definition-output' ) ).toBeTruthy();
	} );
	it( 'loads the z-object-selector component', function () {
		var wrapper = shallowMount( FunctionDefinitionOutput );

		expect( wrapper.find( '.ext-wikilambda-function-definition-output__selector' ) ).toBeTruthy();
	} );
	it( 'clears on focus-out if a value is typed but then not selected', function () {
		var wrapper = mount( FunctionDefinitionOutput );

		var outputTypeSelector = wrapper.get( '.ext-wikilambda-function-definition-output' ).getComponent( ZObjectSelector );

		var outputTypeSelectorLookup = wrapper.get( '.ext-wikilambda-select-zobject' ).getComponent( CdxLookup );
		outputTypeSelectorLookup.vm.$emit( 'input', 'S' );

		outputTypeSelector.vm.clearResults = jest.fn();

		outputTypeSelector.vm.$emit( 'focus-out' );

		expect( outputTypeSelector.vm.clearResults ).toHaveBeenCalled();
	} );
} );
