/*!
 * WikiLambda unit test suite for the Function Definition name component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionEditorName = require( '../../../../../resources/ext.wikilambda.app/components/function/editor/FunctionEditorName.vue' );

describe( 'FunctionEditorName', () => {
	let getters,
		actions;

	beforeEach( () => {
		getters = {
			getRowByKeyPath: createGettersWithFunctionsMock(),
			getZPersistentName: createGettersWithFunctionsMock( { rowId: 2, langZid: 'Z1002', langIsoCode: 'en' } ),
			getZMonolingualTextValue: createGettersWithFunctionsMock( 'Function name' )
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
		const wrapper = shallowMount( FunctionEditorName, { props: {
			zLanguage: 'Z1002',
			isMainLanguageBlock: true
		} } );

		expect( wrapper.find( '.ext-wikilambda-function-definition-name' ).exists() ).toBeTruthy();
	} );

	it( 'renders an initialized input box', () => {
		const wrapper = shallowMount( FunctionEditorName, { props: {
			zLanguage: 'Z1002',
			isMainLanguageBlock: true
		} } );

		const input = wrapper.findComponent( { name: 'cdx-text-input' } );
		expect( input.props( 'modelValue' ) ).toBe( 'Function name' );
	} );

	describe( 'on input', () => {
		it( 'removes the name object if new value is empty string', async () => {
			const wrapper = shallowMount( FunctionEditorName, { props: {
				zLanguage: 'Z1002',
				isMainLanguageBlock: true
			} } );

			// ACT: Change value of name input
			const input = wrapper.findComponent( { name: 'cdx-text-input' } );
			input.vm.$emit( 'change', { target: { value: '' } } );
			await wrapper.vm.$nextTick();

			// ASSERT: removeItemFromTypedList action runs correctly
			expect( actions.removeItemFromTypedList ).toHaveBeenCalledWith( expect.anything(), {
				rowId: 2
			} );

			// ASSERT: emits updated-name
			expect( wrapper.emitted( 'updated-name' ) ).toBeTruthy();
		} );

		it( 'changes the name value if it already has a name object', async () => {
			const wrapper = shallowMount( FunctionEditorName, { props: {
				zLanguage: 'Z1002',
				isMainLanguageBlock: true
			} } );

			// ACT: Change value of name input
			const input = wrapper.findComponent( { name: 'cdx-text-input' } );
			input.vm.$emit( 'change', { target: { value: 'New Function Name' } } );
			await wrapper.vm.$nextTick();

			// ASSERT: setValueByRowIdAndPath action runs correctly
			expect( actions.setValueByRowIdAndPath ).toHaveBeenCalledWith( expect.anything(), {
				rowId: 2,
				keyPath: [ 'Z11K2', 'Z6K1' ],
				value: 'New Function Name'
			} );

			// ASSERT: emits updated-name
			expect( wrapper.emitted( 'updated-name' ) ).toBeTruthy();
		} );

		it( 'adds a new monolingual string if there is no name object', async () => {
			getters.getZPersistentName = createGettersWithFunctionsMock( undefined );
			getters.getRowByKeyPath = createGettersWithFunctionsMock( { id: 1 } );
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( FunctionEditorName, { props: {
				zLanguage: 'Z1002',
				isMainLanguageBlock: true
			} } );

			// ACT: Change value of name input
			const input = wrapper.findComponent( { name: 'cdx-text-input' } );
			input.vm.$emit( 'change', { target: { value: 'New Function Name' } } );
			await wrapper.vm.$nextTick();

			// ASSERT: changeType action runs correctly
			expect( actions.changeType ).toHaveBeenCalledWith( expect.anything(), {
				id: 1,
				type: 'Z11',
				lang: 'Z1002',
				value: 'New Function Name',
				append: true
			} );

			// ASSERT: emits updated-name
			expect( wrapper.emitted( 'updated-name' ) ).toBeTruthy();
		} );

		it( 'changes the page title if it is the main language block', async () => {
			const wrapper = shallowMount( FunctionEditorName, { props: {
				zLanguage: 'Z1002',
				isMainLanguageBlock: true
			} } );
			jest.spyOn( wrapper.vm, 'setPageTitle' );

			// ACT: Change value of name input
			const input = wrapper.findComponent( { name: 'cdx-text-input' } );
			input.vm.$emit( 'change', { target: { value: 'New Function Title' } } );
			await wrapper.vm.$nextTick();

			// ASSERT: page title gets changed
			expect( wrapper.vm.setPageTitle ).toHaveBeenCalledWith( 'New Function Title' );
		} );

		it( 'does not change the page title if it is not the main language block', async () => {
			const wrapper = shallowMount( FunctionEditorName, { props: {
				zLanguage: 'Z1002',
				isMainLanguageBlock: false
			} } );
			jest.spyOn( wrapper.vm, 'setPageTitle' );

			// ACT: Change value of name input
			const input = wrapper.findComponent( { name: 'cdx-text-input' } );
			input.vm.$emit( 'change', { target: { value: 'New Function Name' } } );
			await wrapper.vm.$nextTick();

			// ASSERT: page title does not change
			expect( wrapper.vm.setPageTitle ).toHaveBeenCalledTimes( 0 );
		} );
	} );
} );
