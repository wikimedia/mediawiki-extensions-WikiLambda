/*!
 * WikiLambda unit test suite for the Function Definition aliases component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { createGettersWithFunctionsMock } = require( '../../../helpers/getterHelpers.js' );
const FunctionEditorAliases = require( '../../../../../resources/ext.wikilambda.app/components/function/editor/FunctionEditorAliases.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'FunctionEditorAliases', () => {
	let store;

	/**
	 * Helper function to render FunctionEditorAliases component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderFunctionEditorAliases( props = {}, options = {} ) {
		const defaultOptions = {
			global: {
				stubs: {
					WlFunctionEditorField: false,
					CdxChipInput: false,
					...options?.stubs
				}
			}
		};
		return shallowMount( FunctionEditorAliases, {
			props,
			...defaultOptions
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getZPersistentAlias = createGettersWithFunctionsMock( {
			keyPath: 'main.Z2K4.Z32K1.1.Z31K2',
			value: [ 'alias 1', 'alias 2' ]
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFunctionEditorAliases( {
			zLanguage: 'Z1002'
		} );

		expect( wrapper.find( '.ext-wikilambda-app-function-editor-aliases' ).exists() ).toBe( true );
	} );

	it( 'renders a chip container with empty aliases', () => {
		store.getZPersistentAlias = createGettersWithFunctionsMock();

		const wrapper = renderFunctionEditorAliases( {
			zLanguage: 'Z1002'
		} );

		const chipInput = wrapper.getComponent( { name: 'cdx-chip-input' } );
		expect( chipInput.vm.inputChips.length ).toBe( 0 );
	} );

	it( 'passes chips to chip container if there are aliases', () => {
		const wrapper = renderFunctionEditorAliases( {
			zLanguage: 'Z1002'
		} );

		const chipInput = wrapper.getComponent( { name: 'cdx-chip-input' } );
		expect( chipInput.vm.inputChips.length ).toBe( 2 );
		expect( chipInput.vm.inputChips[ 0 ] ).toEqual( { value: 'alias 1' } );
		expect( chipInput.vm.inputChips[ 1 ] ).toEqual( { value: 'alias 2' } );
	} );

	describe( 'When the chips are updated', () => {
		it( 'persists aliases when monolingual strinset is defined', async () => {
			const wrapper = renderFunctionEditorAliases( {
				zLanguage: 'Z1002'
			} );

			const chipInput = wrapper.getComponent( { name: 'cdx-chip-input' } );
			await chipInput.vm.$emit( 'update:input-chips', [ { value: 'alias 1' }, { value: 'alias 2' } ] );

			expect( store.setZMonolingualStringset ).toHaveBeenCalledWith( {
				parentKeyPath: [ 'main', 'Z2K4', 'Z32K1' ],
				itemKeyPath: 'main.Z2K4.Z32K1.1.Z31K2',
				value: [ 'alias 1', 'alias 2' ],
				lang: 'Z1002'
			} );
		} );

		it( 'persists aliases when monolingual strinset is not defined', async () => {
			store.getZPersistentAlias = createGettersWithFunctionsMock();

			const wrapper = renderFunctionEditorAliases( {
				zLanguage: 'Z1002'
			} );

			const chipInput = wrapper.getComponent( { name: 'cdx-chip-input' } );
			await chipInput.vm.$emit( 'update:input-chips', [ { value: 'alias 1' }, { value: 'alias 2' } ] );

			expect( store.setZMonolingualStringset ).toHaveBeenCalledWith( {
				parentKeyPath: [ 'main', 'Z2K4', 'Z32K1' ],
				value: [ 'alias 1', 'alias 2' ],
				lang: 'Z1002'
			} );
		} );

		it( 'emits alias-updated event after persisting aliases', async () => {
			const wrapper = renderFunctionEditorAliases( {
				zLanguage: 'Z1002'
			} );

			const chipInput = wrapper.getComponent( { name: 'cdx-chip-input' } );
			await chipInput.vm.$emit( 'update:input-chips', [ { value: 'alias 1' } ] );

			expect( wrapper.emitted()[ 'alias-updated' ] ).toBeTruthy();
		} );
	} );
} );
