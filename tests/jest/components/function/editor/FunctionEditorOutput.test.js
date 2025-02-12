/*!
 * WikiLambda unit test suite for the Function Editor output component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock;
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const FunctionEditorOutput = require( '../../../../../resources/ext.wikilambda.app/components/function/editor/FunctionEditorOutput.vue' );

describe( 'FunctionEditorOutput', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getUserLangCode = 'en';
		store.getZFunctionOutput = createGettersWithFunctionsMock( { id: 1 } );
		store.getZReferenceTerminalValue = createGettersWithFunctionsMock();
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionEditorOutput, {
			props: { canEdit: true },
			global: { stubs: { WlFunctionEditorField: false } }
		} );

		expect( wrapper.find( '.ext-wikilambda-app-function-editor-output' ).exists() ).toBeTruthy();
	} );

	it( 'loads the type selector component', () => {
		const wrapper = shallowMount( FunctionEditorOutput, {
			props: { canEdit: true },
			global: { stubs: { WlFunctionEditorField: false } }
		} );

		expect( wrapper.findComponent( { name: 'wl-type-selector' } ).exists() ).toBeTruthy();
	} );

	it( 'initializes the type selector component with the function output row Id', () => {
		const wrapper = shallowMount( FunctionEditorOutput, {
			props: { canEdit: true },
			global: { stubs: { WlFunctionEditorField: false } }
		} );

		const selector = wrapper.findComponent( { name: 'wl-type-selector' } );
		expect( selector.exists() ).toBeTruthy();
		expect( selector.props( 'rowId' ) ).toBe( 1 );
		expect( selector.props( 'disabled' ) ).toBe( false );
	} );

	it( 'initializes a disabled type selector component with the function output row Id', () => {
		const wrapper = shallowMount( FunctionEditorOutput, {
			props: { canEdit: false },
			global: { stubs: { WlFunctionEditorField: false } }
		} );

		const selector = wrapper.findComponent( { name: 'wl-type-selector' } );
		expect( selector.exists() ).toBeTruthy();
		expect( selector.props( 'rowId' ) ).toBe( 1 );
		expect( selector.props( 'disabled' ) ).toBe( true );
	} );

	it( 'does not initialize a type selector component', () => {
		store.getZFunctionOutput = createGettersWithFunctionsMock( undefined );
		const wrapper = shallowMount( FunctionEditorOutput, {
			props: { canEdit: true },
			global: { stubs: { WlFunctionEditorField: false } }
		} );

		const selector = wrapper.findComponent( { name: 'wl-type-selector' } );
		expect( selector.exists() ).toBe( false );
	} );
} );
