/*!
 * WikiLambda unit test suite for the Function Definition aliases component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	Constants = require( '../../../../../resources/ext.wikilambda.edit/Constants.js' ),
	FunctionEditorAliases = require( '../../../../../resources/ext.wikilambda.edit/components/function/editor/FunctionEditorAliases.vue' );

describe( 'FunctionEditorAliases', () => {
	let getters,
		actions;

	beforeEach( () => {
		getters = {
			getRowByKeyPath: createGettersWithFunctionsMock(),
			getZPersistentAlias: createGettersWithFunctionsMock( { rowId: 2, langZid: 'Z1002', langIsoCode: 'en' } ),
			getZMonolingualStringsetValues: createGettersWithFunctionsMock( [] )
		};

		actions = {
			changeType: jest.fn(),
			removeItemFromTypedList: jest.fn()
		};

		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionEditorAliases, { props: { zLanguage: 'Z1002' } } );

		expect( wrapper.find( '.ext-wikilambda-function-definition-aliases' ).exists() ).toBe( true );
	} );

	it( 'renders a chip container with empty aliases', () => {
		const wrapper = shallowMount( FunctionEditorAliases, { props: { zLanguage: 'Z1002' } } );

		expect( wrapper.getComponent( { name: 'wl-chip-container' } ).props( 'chips' ) ).toHaveLength( 0 );
	} );

	it( 'passes chips to chip container if there are aliases', () => {
		getters.getZMonolingualStringsetValues = createGettersWithFunctionsMock( [
			{ rowId: 1, value: 'alias 1' },
			{ rowId: 2, value: 'alias 2' }
		] );
		global.store.hotUpdate( { getters: getters } );
		const wrapper = shallowMount( FunctionEditorAliases, { props: { zLanguage: 'Z1002' } } );

		const chipsProp = wrapper.getComponent( { name: 'wl-chip-container' } ).props( 'chips' );
		expect( chipsProp ).toHaveLength( 2 );
		expect( chipsProp[ 0 ] ).toEqual( { id: 1, value: 'alias 1' } );
		expect( chipsProp[ 1 ] ).toEqual( { id: 2, value: 'alias 2' } );
	} );

	it( 'removes alias when chip removed from chip container', () => {
		getters.getZMonolingualStringsetValues = createGettersWithFunctionsMock( [
			{ rowId: 1, value: 'alias 1' },
			{ rowId: 2, value: 'alias 2' }
		] );
		global.store.hotUpdate( { getters: getters } );
		const wrapper = shallowMount( FunctionEditorAliases, { props: { zLanguage: 'Z1002' } } );

		wrapper.getComponent( { name: 'wl-chip-container' } ).vm.$emit( 'remove-chip', 1 );

		expect( actions.removeItemFromTypedList ).toHaveBeenCalledWith( expect.anything(), { rowId: 1 } );

		// ASSERT: emits updated-name
		expect( wrapper.emitted( 'updated-alias' ) ).toBeTruthy();
	} );

	describe( 'When a new chip is added in chip container', () => {
		it( 'for an existing language, adds new alias', () => {
			getters.getRowByKeyPath = createGettersWithFunctionsMock( { id: 1 } );
			global.store.hotUpdate( { getters: getters } );
			const wrapper = shallowMount( FunctionEditorAliases, { props: { zLanguage: 'Z1002' } } );

			wrapper.getComponent( { name: 'wl-chip-container' } ).vm.$emit( 'add-chip', 'new alias' );

			expect( actions.changeType ).toHaveBeenCalledWith( expect.anything(), {
				type: Constants.Z_STRING,
				id: 1,
				value: 'new alias',
				append: true
			} );

			// ASSERT: emits updated-name
			expect( wrapper.emitted( 'updated-alias' ) ).toBeTruthy();
		} );

		it( 'for an new language, adds new alias', () => {
			getters.getZPersistentAlias = createGettersWithFunctionsMock( undefined );
			getters.getRowByKeyPath = createGettersWithFunctionsMock( { id: 1 } );
			global.store.hotUpdate( { getters: getters } );
			const wrapper = shallowMount( FunctionEditorAliases, { props: { zLanguage: 'Z1002' } } );

			wrapper.getComponent( { name: 'wl-chip-container' } ).vm.$emit( 'add-chip', 'new alias' );

			expect( actions.changeType ).toHaveBeenCalledWith( expect.anything(), {
				type: Constants.Z_MONOLINGUALSTRINGSET,
				lang: 'Z1002',
				value: [ 'new alias' ],
				id: 1,
				append: true
			} );

			// ASSERT: emits updated-name
			expect( wrapper.emitted( 'updated-alias' ) ).toBeTruthy();
		} );

		it( 'for a repeated alias display an erro', async () => {
			getters.getZMonolingualStringsetValues = createGettersWithFunctionsMock( [
				{ rowId: 2, value: 'existing alias' }
			] );
			global.store.hotUpdate( { getters: getters } );
			const wrapper = shallowMount( FunctionEditorAliases, { props: { zLanguage: 'Z1002' } } );

			wrapper.getComponent( { name: 'wl-chip-container' } ).vm.$emit( 'add-chip', 'existing alias' );
			await wrapper.vm.$nextTick();

			expect( wrapper.get( '.ext-wikilambda-function-definition-aliases__error' ).exists() ).toBe( true );
			expect( actions.changeType ).not.toHaveBeenCalled();

			// ASSERT: does not emit updated-name
			expect( wrapper.emitted( 'updated-alias' ) ).toBeFalsy();
		} );
	} );
} );
