/*!
 * WikiLambda unit test suite for the Function Editor language field component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionEditorLanguage = require( '../../../../../resources/ext.wikilambda.app/components/function/editor/FunctionEditorLanguage.vue' );

describe( 'FunctionEditorDefinitionLanguage', () => {
	let getters;

	beforeEach( () => {
		getters = {
			getMetadataLanguages: createGettersWithFunctionsMock( [ 'Z1002', 'Z1004' ] )
		};
		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	describe( 'function editor language block', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( FunctionEditorLanguage, { props: {
				zLanguage: 'Z1002'
			} } );
			expect( wrapper.find( '.ext-wikilambda-function-language-selector' ).exists() ).toBe( true );
		} );

		it( 'renders the selector with initial value', () => {
			const wrapper = shallowMount( FunctionEditorLanguage, { props: {
				zLanguage: 'Z1002'
			} } );

			const selector = wrapper.findComponent( { name: 'wl-z-object-selector' } );
			expect( selector.props( 'selectedZid' ) ).toBe( 'Z1002' );
			expect( selector.props( 'disabled' ) ).toBe( true );
		} );

		it( 'renders the selector with no value', () => {
			const wrapper = shallowMount( FunctionEditorLanguage, { props: {
				zLanguage: ''
			} } );

			const selector = wrapper.findComponent( { name: 'wl-z-object-selector' } );
			expect( selector.props( 'selectedZid' ) ).toBe( '' );
			expect( selector.props( 'disabled' ) ).toBe( false );
		} );

		it( 'emits a change event whens selecting a new language', async () => {
			const wrapper = shallowMount( FunctionEditorLanguage, { props: {
				zLanguage: ''
			} } );

			const selector = wrapper.findComponent( { name: 'wl-z-object-selector' } );
			expect( selector.props( 'selectedZid' ) ).toBe( '' );

			// ACT: select input
			selector.vm.$emit( 'input', 'Z1002' );
			await wrapper.vm.$nextTick();

			// ASSERT: language component emits a change event
			expect( wrapper.emitted() ).toHaveProperty( 'change', [ [ 'Z1002' ] ] );
		} );
	} );
} );
