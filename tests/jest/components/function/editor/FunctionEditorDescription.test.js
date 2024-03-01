/*!
 * WikiLambda unit test suite for the Function Definition description component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionEditorDescription = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorDescription.vue' );

describe( 'FunctionEditorDescription', () => {
	let getters,
		actions;

	beforeEach( () => {
		getters = {
			getRowByKeyPath: createGettersWithFunctionsMock(),
			getZPersistentDescription: createGettersWithFunctionsMock( { rowId: 2, langZid: 'Z1002', langIsoCode: 'en' } ),
			getZMonolingualTextValue: createGettersWithFunctionsMock( 'Function description' )
		};

		actions = {
			changeType: jest.fn(),
			removeItemFromTypedList: jest.fn(),
			setValueByRowIdAndPath: jest.fn()
		};

		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionEditorDescription, { props: {
			zLanguage: 'Z1002'
		} } );

		expect( wrapper.find( '.ext-wikilambda-function-definition-description' ).exists() ).toBeTruthy();
	} );

	it( 'renders an initialized input box', () => {
		const wrapper = shallowMount( FunctionEditorDescription, { props: {
			zLanguage: 'Z1002'
		} } );

		const input = wrapper.findComponent( { name: 'cdx-text-area' } );
		expect( input.props( 'modelValue' ) ).toBe( 'Function description' );
	} );

	describe( 'on input', () => {
		it( 'removes the description object if new value is empty string', async () => {
			const wrapper = shallowMount( FunctionEditorDescription, { props: {
				zLanguage: 'Z1002'
			} } );

			// ACT: Change value of name input
			const input = wrapper.findComponent( { name: 'cdx-text-area' } );
			input.vm.$emit( 'change', { target: { value: '' } } );
			await wrapper.vm.$nextTick();

			// ASSERT: removeItemFromTypedList action runs correctly
			expect( actions.removeItemFromTypedList ).toHaveBeenCalledWith( expect.anything(), {
				rowId: 2
			} );

			// ASSERT: emits updated-description
			expect( wrapper.emitted( 'updated-description' ) ).toBeTruthy();
		} );

		it( 'changes the description value if it already has a description object', async () => {
			const wrapper = shallowMount( FunctionEditorDescription, { props: {
				zLanguage: 'Z1002'
			} } );

			// ACT: Change value of name input
			const input = wrapper.findComponent( { name: 'cdx-text-area' } );
			input.vm.$emit( 'change', { target: { value: 'New Function Description' } } );
			await wrapper.vm.$nextTick();

			// ASSERT: setValueByRowIdAndPath action runs correctly
			expect( actions.setValueByRowIdAndPath ).toHaveBeenCalledWith( expect.anything(), {
				rowId: 2,
				keyPath: [ 'Z11K2', 'Z6K1' ],
				value: 'New Function Description'
			} );

			// ASSERT: emits updated-description
			expect( wrapper.emitted( 'updated-description' ) ).toBeTruthy();
		} );

		it( 'adds a new monolingual string if there is no description object', async () => {
			getters.getZPersistentDescription = createGettersWithFunctionsMock( undefined );
			getters.getRowByKeyPath = createGettersWithFunctionsMock( { id: 1 } );
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( FunctionEditorDescription, { props: {
				zLanguage: 'Z1002'
			} } );

			// ACT: Change value of name input
			const input = wrapper.findComponent( { name: 'cdx-text-area' } );
			input.vm.$emit( 'change', { target: { value: 'New Function Description' } } );
			await wrapper.vm.$nextTick();

			// ASSERT: changeType action runs correctly
			expect( actions.changeType ).toHaveBeenCalledWith( expect.anything(), {
				id: 1,
				type: 'Z11',
				lang: 'Z1002',
				value: 'New Function Description',
				append: true
			} );

			// ASSERT: emits updated-description
			expect( wrapper.emitted( 'updated-description' ) ).toBeTruthy();
		} );
	} );
} );
