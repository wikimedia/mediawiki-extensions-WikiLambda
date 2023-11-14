/*!
 * WikiLambda unit test suite for the Function Editor input item component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createGetterMock = require( '../../../helpers/getterHelpers.js' ).createGetterMock,
	FunctionEditorInputsItem = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorInputsItem.vue' );

describe( 'FunctionEditorInputsItem', () => {
	let getters,
		actions;

	beforeEach( () => {
		getters = {
			getRowByKeyPath: createGettersWithFunctionsMock(),
			getZArgumentLabelForLanguage: createGettersWithFunctionsMock(),
			getZArgumentTypeRowId: createGettersWithFunctionsMock(),
			getUserLangCode: createGetterMock( 'en' ),
			getZMonolingualTextValue: createGettersWithFunctionsMock()
		};

		actions = {
			changeType: jest.fn(),
			setValueByRowIdAndPath: jest.fn(),
			removeItemFromTypedList: jest.fn()
		};

		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionEditorInputsItem, { props: {
			rowId: 1,
			index: 0,
			isMainLanguageBlock: true,
			canEditType: true,
			zLanguage: 'Z1002'
		} } );

		expect( wrapper.find( '.ext-wikilambda-editor-input-list-item' ).exists() ).toBeTruthy();
	} );

	it( 'has an input element ', () => {
		const wrapper = shallowMount( FunctionEditorInputsItem, {
			props: {
				rowId: 1,
				index: 0,
				isMainLanguageBlock: true,
				canEditType: true,
				zLanguage: 'Z1002'
			},
			global: { stubs: { CdxField: false } }
		} );

		expect( wrapper.findComponent( { name: 'cdx-text-input' } ).exists() ).toBeTruthy();
	} );

	it( 'has an type selector if is main language block ', () => {
		const wrapper = shallowMount( FunctionEditorInputsItem, {
			props: {
				rowId: 1,
				index: 0,
				isMainLanguageBlock: true,
				canEditType: true,
				zLanguage: 'Z1002'
			},
			global: { stubs: { CdxField: false } }
		} );

		expect( wrapper.findComponent( { name: 'wl-type-selector' } ).exists() ).toBeTruthy();
	} );

	it( 'does not have a type selector if is a secondary language block ', () => {
		const wrapper = shallowMount( FunctionEditorInputsItem, {
			props: {
				rowId: 1,
				index: 0,
				isMainLanguageBlock: false,
				canEditType: true,
				zLanguage: 'Z1002'
			},
			global: { stubs: { CdxField: false } }
		} );

		expect( wrapper.findComponent( { name: 'wl-z-object-selector' } ).exists() ).toBeFalsy();
	} );

	it( 'has one delete button if it is editable', () => {
		const wrapper = shallowMount( FunctionEditorInputsItem, {
			props: {
				rowId: 1,
				index: 0,
				isMainLanguageBlock: true,
				canEditType: true,
				zLanguage: 'Z1002'
			},
			global: { stubs: { CdxButton: false } }
		} );

		expect( wrapper.findAll( '.ext-wikilambda-editor-input-list-item__header__action-delete' ).length ).toBe( 1 );
	} );

	describe( 'on argument label change', () => {
		it( 'removes the input label object if new value is empty string', async () => {
			getters.getZArgumentLabelForLanguage = createGettersWithFunctionsMock( { id: 2 } );
			global.store.hotUpdate( { getters: getters } );
			const wrapper = shallowMount( FunctionEditorInputsItem, {
				props: {
					rowId: 1,
					index: 0,
					isMainLanguageBlock: true,
					canEditType: true,
					zLanguage: 'Z1002'
				},
				global: { stubs: { CdxField: false } }
			} );

			// ACT: Change value of label
			const input = wrapper.findComponent( { name: 'cdx-text-input' } );
			input.vm.$emit( 'change', { target: { value: '' } } );
			await wrapper.vm.$nextTick();

			// ASSERT: removeItemFromTypedList action runs correctly
			expect( actions.removeItemFromTypedList ).toHaveBeenCalledWith( expect.anything(), {
				rowId: 2
			} );

			// ASSERT: emits updated-argument-label
			expect( wrapper.emitted( 'update-argument-label' ) ).toBeTruthy();
		} );

		it( 'changes the label of an input if the language already exists', async () => {
			getters.getZArgumentLabelForLanguage = createGettersWithFunctionsMock( { id: 2 } );
			global.store.hotUpdate( { getters: getters } );
			const wrapper = shallowMount( FunctionEditorInputsItem, {
				props: {
					rowId: 1,
					index: 0,
					isMainLanguageBlock: true,
					canEditType: true,
					zLanguage: 'Z1002'
				},
				global: { stubs: { CdxField: false } }
			} );

			// ACT: Change value of label
			const input = wrapper.findComponent( { name: 'cdx-text-input' } );
			input.vm.$emit( 'change', { target: { value: 'new input label' } } );
			await wrapper.vm.$nextTick();

			// ASSERT: setValueByRowIdAndPath action runs correctly
			expect( actions.setValueByRowIdAndPath ).toHaveBeenCalledWith( expect.anything(), {
				rowId: 2,
				keyPath: [ 'Z11K2', 'Z6K1' ],
				value: 'new input label'
			} );

			// ASSERT: emits updated-argument-label
			expect( wrapper.emitted( 'update-argument-label' ) ).toBeTruthy();
		} );

		it( 'adds a new monolingual string if there is no label object for this language', async () => {
			getters.getZArgumentLabelForLanguage = createGettersWithFunctionsMock( undefined );
			getters.getRowByKeyPath = createGettersWithFunctionsMock( { id: 1 } );
			global.store.hotUpdate( { getters: getters } );
			const wrapper = shallowMount( FunctionEditorInputsItem, {
				props: {
					rowId: 1,
					index: 0,
					isMainLanguageBlock: true,
					canEditType: true,
					zLanguage: 'Z1002'
				},
				global: { stubs: { CdxField: false } }
			} );

			// ACT: Change value of label
			const input = wrapper.findComponent( { name: 'cdx-text-input' } );
			input.vm.$emit( 'change', { target: { value: 'new input label' } } );
			await wrapper.vm.$nextTick();

			// ASSERT: changeType action runs correctly
			expect( actions.changeType ).toHaveBeenCalledWith( expect.anything(), {
				id: 1,
				type: 'Z11',
				lang: 'Z1002',
				value: 'new input label',
				append: true
			} );

			// ASSERT: emits updated-argument-label
			expect( wrapper.emitted( 'update-argument-label' ) ).toBeTruthy();
		} );
	} );
} );
