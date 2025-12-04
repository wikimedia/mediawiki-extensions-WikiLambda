/*!
 * WikiLambda unit test suite for the Function Editor language field component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { createGettersWithFunctionsMock } = require( '../../../helpers/getterHelpers.js' );
const FunctionEditorLanguage = require( '../../../../../resources/ext.wikilambda.app/components/function/editor/FunctionEditorLanguage.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'FunctionEditorLanguage', () => {
	let store;

	/**
	 * Helper function to render FunctionEditorLanguage component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderFunctionEditorLanguage( props = {}, options = {} ) {
		const defaultProps = { zLanguage: 'Z1002' };
		const defaultOptions = {
			global: {
				stubs: {
					WlFunctionEditorField: false,
					...options?.stubs
				}
			}
		};
		return shallowMount( FunctionEditorLanguage, {
			props: { ...defaultProps, ...props },
			...defaultOptions
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getMultilingualDataLanguages = createGettersWithFunctionsMock( [ 'Z1002', 'Z1004' ] );
		// Mock the content tracking functions
		store.getZPersistentName = createGettersWithFunctionsMock( null );
		store.getZPersistentDescription = createGettersWithFunctionsMock( null );
		store.getZPersistentAlias = createGettersWithFunctionsMock( null );
		store.getZFunctionInputLabels = createGettersWithFunctionsMock( [] );
	} );

	describe( 'function editor language block', () => {
		it( 'renders without errors', () => {
			const wrapper = renderFunctionEditorLanguage();
			expect( wrapper.find( '.ext-wikilambda-app-function-editor-language' ).exists() ).toBe( true );
		} );

		it( 'renders the selector with initial value', () => {
			const wrapper = renderFunctionEditorLanguage();

			const selector = wrapper.findComponent( { name: 'wl-z-object-selector' } );
			expect( selector.props( 'selectedZid' ) ).toBe( 'Z1002' );
			expect( selector.props( 'disabled' ) ).toBe( false );
		} );

		it( 'renders the selector with no value', () => {
			const wrapper = renderFunctionEditorLanguage( { zLanguage: '' } );

			const selector = wrapper.findComponent( { name: 'wl-z-object-selector' } );
			expect( selector.props( 'selectedZid' ) ).toBe( '' );
			expect( selector.props( 'disabled' ) ).toBe( false );
		} );

		it( 'renders the selector as disabled when content has been entered', () => {
			// Mock name with content
			store.getZPersistentName = createGettersWithFunctionsMock( { value: 'Test Name' } );

			const wrapper = renderFunctionEditorLanguage();

			const selector = wrapper.findComponent( { name: 'wl-z-object-selector' } );
			expect( selector.props( 'selectedZid' ) ).toBe( 'Z1002' );
			expect( selector.props( 'disabled' ) ).toBe( true );
		} );

		it( 'emits a language changed event whens selecting a new language', async () => {
			const wrapper = renderFunctionEditorLanguage( { zLanguage: '' } );

			const selector = wrapper.findComponent( { name: 'wl-z-object-selector' } );
			expect( selector.props( 'selectedZid' ) ).toBe( '' );

			// ACT: select item
			selector.vm.$emit( 'select-item', 'Z1002' );

			// ASSERT: language component emits a language changed event
			expect( wrapper.emitted() ).toHaveProperty( 'language-changed', [ [ 'Z1002' ] ] );
		} );
	} );

	describe( 'language exclusion behavior', () => {
		it( 'prevents user from selecting languages already used in other blocks', () => {
			const functionLanguages = [ 'Z1002', 'Z1004', 'Z1001' ];
			const wrapper = renderFunctionEditorLanguage( {
				zLanguage: 'Z1002',
				functionLanguages: functionLanguages,
				index: 0
			} );

			const selector = wrapper.findComponent( { name: 'wl-z-object-selector' } );
			const excludedZids = selector.props( 'excludeZids' );

			// User should not be able to select Z1004 or Z1001 (from other blocks)
			expect( excludedZids ).toContain( 'Z1004' );
			expect( excludedZids ).toContain( 'Z1001' );
			// User should be able to keep their current selection (Z1002)
			expect( excludedZids ).not.toContain( 'Z1002' );
		} );

		it( 'allows user to select any language when no other blocks have languages', () => {
			const wrapper = renderFunctionEditorLanguage( {
				zLanguage: 'Z1002',
				functionLanguages: [ 'Z1002' ],
				index: 0
			} );

			const selector = wrapper.findComponent( { name: 'wl-z-object-selector' } );
			const excludedZids = selector.props( 'excludeZids' );

			// No languages should be excluded - user can select any language
			expect( excludedZids ).toEqual( [] );
		} );

		it( 'updates excluded languages when functionLanguages prop changes', async () => {
			const wrapper = renderFunctionEditorLanguage( {
				zLanguage: 'Z1002',
				functionLanguages: [ 'Z1002', 'Z1004' ],
				index: 0
			} );

			let selector = wrapper.findComponent( { name: 'wl-z-object-selector' } );
			let excludedZids = selector.props( 'excludeZids' );

			// Initially excludes Z1004
			expect( excludedZids ).toContain( 'Z1004' );

			// Simulate another block selecting a new language
			await wrapper.setProps( {
				functionLanguages: [ 'Z1002', 'Z1001' ]
			} );

			selector = wrapper.findComponent( { name: 'wl-z-object-selector' } );
			excludedZids = selector.props( 'excludeZids' );

			// Now excludes Z1001 instead of Z1004
			expect( excludedZids ).toContain( 'Z1001' );
			expect( excludedZids ).not.toContain( 'Z1004' );
		} );
	} );
} );
