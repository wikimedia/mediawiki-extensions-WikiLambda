/*!
 * WikiLambda unit test suite for the Function Editor output component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createGetterMock = require( '../../../helpers/getterHelpers.js' ).createGetterMock,
	FunctionEditorOutput = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorOutput.vue' );

describe( 'FunctionEditorOutput', () => {
	let getters,
		actions;

	beforeEach( () => {
		getters = {
			getZLang: createGetterMock( 'Z1002' ),
			getZFunctionOutput: createGettersWithFunctionsMock(),
			getZReferenceTerminalValue: createGettersWithFunctionsMock(),
			getErrors: createGettersWithFunctionsMock( [] )
		};

		actions = {
			setValueByRowIdAndPath: jest.fn()
		};

		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionEditorOutput, { props: { canEdit: true } } );

		expect( wrapper.find( '.ext-wikilambda-function-definition-output' ).exists() ).toBeTruthy();
	} );

	it( 'loads the z-object-selector component', () => {
		const wrapper = shallowMount( FunctionEditorOutput, { props: { canEdit: true } } );

		expect( wrapper.findComponent( { name: 'wl-z-object-selector' } ).exists() ).toBeTruthy();
	} );

	it( 'initializes the z-object-selector component with the function output type value', () => {
		getters.getZFunctionOutput = createGettersWithFunctionsMock( { id: 1 } );
		getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( 'Z6' );
		global.store.hotUpdate( { getters: getters } );
		const wrapper = shallowMount( FunctionEditorOutput, { props: { canEdit: true } } );

		const selector = wrapper.findComponent( { name: 'wl-z-object-selector' } );
		expect( selector.exists() ).toBeTruthy();
		expect( selector.props( 'selectedZid' ) ).toBe( 'Z6' );
		expect( selector.props( 'disabled' ) ).toBe( false );
	} );

	it( 'initializes a disabled z-object-selector component with the function output type value', () => {
		getters.getZFunctionOutput = createGettersWithFunctionsMock( { id: 1 } );
		getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( 'Z6' );
		global.store.hotUpdate( { getters: getters } );
		const wrapper = shallowMount( FunctionEditorOutput, { props: { canEdit: false } } );

		const selector = wrapper.findComponent( { name: 'wl-z-object-selector' } );
		expect( selector.exists() ).toBeTruthy();
		expect( selector.props( 'selectedZid' ) ).toBe( 'Z6' );
		expect( selector.props( 'disabled' ) ).toBe( true );
	} );

	it( 'initializes an empty z-object-selector component', () => {
		getters.getZFunctionOutput = createGettersWithFunctionsMock( undefined );
		getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( '' );
		global.store.hotUpdate( { getters: getters } );
		const wrapper = shallowMount( FunctionEditorOutput, { props: { canEdit: true } } );

		const selector = wrapper.findComponent( { name: 'wl-z-object-selector' } );
		expect( selector.exists() ).toBeTruthy();
		expect( selector.props( 'selectedZid' ) ).toBe( '' );
	} );

	it( 'persists the new type when selecting a new value', async () => {
		getters.getZFunctionOutput = createGettersWithFunctionsMock( { id: 1 } );
		getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( 'Z6' );
		global.store.hotUpdate( { getters: getters } );
		const wrapper = shallowMount( FunctionEditorOutput, { props: { canEdit: true } } );

		const selector = wrapper.findComponent( { name: 'wl-z-object-selector' } );
		expect( selector.exists() ).toBeTruthy();
		expect( selector.props( 'selectedZid' ) ).toBe( 'Z6' );
		expect( selector.props( 'disabled' ) ).toBe( false );

		// ACT: select input
		selector.vm.$emit( 'input', 'Z40' );
		await wrapper.vm.$nextTick();

		// ASSERT: output is persisted
		expect( actions.setValueByRowIdAndPath ).toHaveBeenCalledWith( expect.anything(), {
			rowId: 1,
			keyPath: [ 'Z9K1' ],
			value: 'Z40'
		} );
	} );
} );
