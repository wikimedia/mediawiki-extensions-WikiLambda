/*!
 * WikiLambda unit test suite for the Function Definition aliases component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const { createGettersWithFunctionsMock } = require( '../../../helpers/getterHelpers.js' );
const FunctionEditorAliases = require( '../../../../../resources/ext.wikilambda.app/components/function/editor/FunctionEditorAliases.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'FunctionEditorAliases', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getRowByKeyPath = createGettersWithFunctionsMock();
		store.getZPersistentAlias = createGettersWithFunctionsMock( { id: 2 } );
		store.getZMonolingualStringsetValues = createGettersWithFunctionsMock( [] );
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
		store.getZMonolingualStringsetValues = createGettersWithFunctionsMock( [
			{ rowId: 1, value: 'alias 1' },
			{ rowId: 2, value: 'alias 2' }
		] );
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

			expect( store.setValueByRowIdAndPath ).toHaveBeenCalledWith( {
				rowId: 2,
				keyPath: [ Constants.Z_MONOLINGUALSTRINGSET_VALUE ],
				value: [ Constants.Z_STRING, 'alias 1', 'alias 2' ]
			} );
			expect( store.removeItemFromTypedList ).not.toHaveBeenCalled();
		} );

		it( 'removes alias when aliasObject is defined and values are empty', async () => {
			const wrapper = shallowMount( FunctionEditorAliases, {
				props: { zLanguage: 'Z1002' },
				global: { stubs: { WlFunctionEditorField: false } }
			} );

			const chipInput = wrapper.getComponent( { name: 'cdx-chip-input' } );
			await chipInput.vm.$emit( 'update:input-chips', [] );

			expect( store.removeItemFromTypedList ).toHaveBeenCalledWith( { rowId: 2 } );
			expect( store.setValueByRowIdAndPath ).not.toHaveBeenCalled();
		} );

		it( 'creates new monolingual stringset when aliasObject is undefined', async () => {
			store.getZPersistentAlias = createGettersWithFunctionsMock( undefined );
			store.getRowByKeyPath = createGettersWithFunctionsMock( { id: 3 } );

			const wrapper = shallowMount( FunctionEditorAliases, {
				props: { zLanguage: 'Z1002' },
				global: { stubs: { WlFunctionEditorField: false } }
			} );

			const chipInput = wrapper.getComponent( { name: 'cdx-chip-input' } );
			await chipInput.vm.$emit( 'update:input-chips', [ { value: 'alias 1' } ] );

			expect( store.changeType ).toHaveBeenCalledWith( {
				id: 3,
				type: Constants.Z_MONOLINGUALSTRINGSET,
				lang: 'Z1002',
				value: [ 'alias 1' ],
				append: true
			} );
			expect( store.removeItemFromTypedList ).not.toHaveBeenCalled();
			expect( store.setValueByRowIdAndPath ).not.toHaveBeenCalled();
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
			store.getZPersistentAlias = createGettersWithFunctionsMock( undefined );
			store.getRowByKeyPath = createGettersWithFunctionsMock( undefined );

			const wrapper = shallowMount( FunctionEditorAliases, {
				props: { zLanguage: 'Z1002' },
				global: { stubs: { WlFunctionEditorField: false } }
			} );

			const chipInput = wrapper.getComponent( { name: 'cdx-chip-input' } );
			await chipInput.vm.$emit( 'update:input-chips', [ { value: 'alias 1' }, { value: 'alias 2' } ] );

			expect( store.changeType ).not.toHaveBeenCalled();
			expect( store.removeItemFromTypedList ).not.toHaveBeenCalled();
			expect( store.setValueByRowIdAndPath ).not.toHaveBeenCalled();
		} );
	} );
} );
