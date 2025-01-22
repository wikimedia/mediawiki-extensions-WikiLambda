/*!
 * WikiLambda unit test suite for the Function Definition aliases component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' ),
	FunctionEditorAliases = require( '../../../../../resources/ext.wikilambda.app/components/function/editor/FunctionEditorAliases.vue' );

describe( 'FunctionEditorAliases', () => {
	let getters,
		actions;

	beforeEach( () => {
		getters = {
			getRowByKeyPath: createGettersWithFunctionsMock(),
			getZPersistentAlias: createGettersWithFunctionsMock( { id: 2 } ),
			getZMonolingualStringsetValues: createGettersWithFunctionsMock( [] )
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
		const wrapper = shallowMount( FunctionEditorAliases, {
			props: { zLanguage: 'Z1002' },
			global: { stubs: { WlFunctionEditorField: false } }
		} );

		expect( wrapper.find( '.ext-wikilambda-app-function-editor-aliases' ).exists() ).toBe( true );
	} );

	it( 'renders a chip container with empty aliases', () => {
		const wrapper = shallowMount( FunctionEditorAliases, {
			props: { zLanguage: 'Z1002' },
			global: { stubs: { WlFunctionEditorField: false } }
		} );

		const chipInput = wrapper.getComponent( { name: 'cdx-chip-input' } );
		expect( chipInput.vm.inputChips.length ).toBe( 0 );
	} );

	it( 'passes chips to chip container if there are aliases', () => {
		getters.getZMonolingualStringsetValues = createGettersWithFunctionsMock( [
			{ rowId: 1, value: 'alias 1' },
			{ rowId: 2, value: 'alias 2' }
		] );
		global.store.hotUpdate( { getters: getters } );
		const wrapper = shallowMount( FunctionEditorAliases, {
			props: { zLanguage: 'Z1002' },
			global: { stubs: { WlFunctionEditorField: false } }
		} );

		const chipInput = wrapper.getComponent( { name: 'cdx-chip-input' } );
		expect( chipInput.vm.inputChips.length ).toBe( 2 );
		expect( chipInput.vm.inputChips[ 0 ] ).toEqual( { id: 1, value: 'alias 1' } );
		expect( chipInput.vm.inputChips[ 1 ] ).toEqual( { id: 2, value: 'alias 2' } );
	} );

	describe( 'When the chips are updated', () => {
		it( 'persists aliases when aliasObject is defined and values are non-empty', async () => {
			const wrapper = shallowMount( FunctionEditorAliases, {
				props: { zLanguage: 'Z1002' },
				global: {
					stubs: {
						WlFunctionEditorField: false,
						CdxChipInput: false
					}
				}
			} );

			const chipInput = wrapper.getComponent( { name: 'cdx-chip-input' } );
			await chipInput.vm.$emit( 'update:input-chips', [ { value: 'alias 1' }, { value: 'alias 2' } ] );

			expect( actions.setValueByRowIdAndPath ).toHaveBeenCalledWith( expect.anything(), {
				rowId: 2,
				keyPath: [ Constants.Z_MONOLINGUALSTRINGSET_VALUE ],
				value: [ Constants.Z_STRING, 'alias 1', 'alias 2' ]
			} );
			expect( actions.removeItemFromTypedList ).not.toHaveBeenCalled();
		} );

		it( 'removes alias when aliasObject is defined and values are empty', async () => {
			const wrapper = shallowMount( FunctionEditorAliases, {
				props: { zLanguage: 'Z1002' },
				global: { stubs: { WlFunctionEditorField: false } }
			} );

			const chipInput = wrapper.getComponent( { name: 'cdx-chip-input' } );
			await chipInput.vm.$emit( 'update:input-chips', [] );

			expect( actions.removeItemFromTypedList ).toHaveBeenCalledWith( expect.anything(), { rowId: 2 } );
			expect( actions.setValueByRowIdAndPath ).not.toHaveBeenCalled();
		} );

		it( 'creates new monolingual stringset when aliasObject is undefined', async () => {
			getters.getZPersistentAlias = createGettersWithFunctionsMock( undefined );
			getters.getRowByKeyPath = createGettersWithFunctionsMock( { id: 3 } );
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( FunctionEditorAliases, {
				props: { zLanguage: 'Z1002' },
				global: { stubs: { WlFunctionEditorField: false } }
			} );

			const chipInput = wrapper.getComponent( { name: 'cdx-chip-input' } );
			await chipInput.vm.$emit( 'update:input-chips', [ { value: 'alias 1' } ] );

			expect( actions.changeType ).toHaveBeenCalledWith( expect.anything(), {
				id: 3,
				type: Constants.Z_MONOLINGUALSTRINGSET,
				lang: 'Z1002',
				value: [ 'alias 1' ],
				append: true
			} );
			expect( actions.removeItemFromTypedList ).not.toHaveBeenCalled();
			expect( actions.setValueByRowIdAndPath ).not.toHaveBeenCalled();
		} );

		it( 'emits alias-updated event after persisting aliases', async () => {
			const wrapper = shallowMount( FunctionEditorAliases, {
				props: { zLanguage: 'Z1002' },
				global: { stubs: { WlFunctionEditorField: false } }
			} );

			const chipInput = wrapper.getComponent( { name: 'cdx-chip-input' } );
			await chipInput.vm.$emit( 'update:input-chips', [ { value: 'alias 1' } ] );

			expect( wrapper.emitted()[ 'alias-updated' ] ).toBeTruthy();
		} );

		it( 'does nothing when currentRowId is undefined and no parentRow exists', async () => {
			getters.getZPersistentAlias = createGettersWithFunctionsMock( undefined );
			getters.getRowByKeyPath = createGettersWithFunctionsMock( undefined );
			global.store.hotUpdate( { getters: getters } );

			const wrapper = shallowMount( FunctionEditorAliases, {
				props: { zLanguage: 'Z1002' },
				global: { stubs: { WlFunctionEditorField: false } }
			} );

			const chipInput = wrapper.getComponent( { name: 'cdx-chip-input' } );
			await chipInput.vm.$emit( 'update:input-chips', [ { value: 'alias 1' }, { value: 'alias 2' } ] );

			expect( actions.changeType ).not.toHaveBeenCalled();
			expect( actions.removeItemFromTypedList ).not.toHaveBeenCalled();
			expect( actions.setValueByRowIdAndPath ).not.toHaveBeenCalled();
		} );
	} );
} );
