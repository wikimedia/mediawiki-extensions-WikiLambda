/*!
 * WikiLambda unit test suite for the default ZReference component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock;
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const ZReference = require( '../../../../resources/ext.wikilambda.app/components/types/ZReference.vue' );

// General use
const keyPath = 'main.Z2K2.Z1K1';
const objectValue = { Z1K1: 'Z9', Z9K1: 'Z6' };

// Terminal value
const terminalKeyPath = 'main.Z2K2.Z1K1.Z9K1';
const terminalObjectValue = 'Z6';

// Function call function
const functionCallKeyPath = 'main.Z2K2.Z7K1';

// Root level

describe( 'ZReference', () => {
	let store;

	/**
	 * Helper function to render ZReference component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderZReference( props = {}, options = {} ) {
		const defaultProps = {
			keyPath,
			objectValue,
			edit: false,
			expectedType: Constants.Z_STRING
		};
		return shallowMount( ZReference, { props: { ...defaultProps, ...props }, ...options } );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getUserLangCode = 'en';
		store.getLabelData = createLabelDataMock( {
			Z6: 'String'
		} );
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = renderZReference();

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays the reference link with its label if there is one', () => {
			const wrapper = renderZReference();

			const referenceLink = wrapper.get( 'a' );
			expect( referenceLink.attributes().href ).toBe( '/view/en/Z6' );
			expect( referenceLink.text() ).toBe( 'String' );
		} );

		it( 'displays the reference link with its value if there is no label', () => {
			store.getLabelData = createLabelDataMock();
			const wrapper = renderZReference();

			const referenceLink = wrapper.get( 'a' );
			expect( referenceLink.attributes().href ).toBe( '/view/en/Z6' );
			expect( referenceLink.text() ).toBe( 'Z6' );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = renderZReference( { edit: true } );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays a selector and emits the value with a Z_REFERENCE_ID (Z9K1) keyPath if its key is not a Z_REFERENCE_ID', async () => {
			const wrapper = renderZReference( { edit: true } );

			expect( wrapper.getComponent( { name: 'wl-z-object-selector' } ).exists() ).toBe( true );

			await wrapper.getComponent( { name: 'wl-z-object-selector' } ).vm.$emit( 'select-item', 'String' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [ 'Z9K1' ], value: 'String' } ] ] );
		} );

		it( 'displays a selector and emits the value with an empty keyPath if its key is a Z_REFERENCE_ID (Z9K1)', async () => {
			const wrapper = renderZReference( {
				keyPath: terminalKeyPath,
				objectValue: terminalObjectValue,
				edit: true
			} );

			expect( wrapper.getComponent( { name: 'wl-z-object-selector' } ).exists() ).toBe( true );

			await wrapper.getComponent( { name: 'wl-z-object-selector' } ).vm.$emit( 'select-item', 'String' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [], value: 'String' } ] ] );
		} );

		it( 'binds the returnType to the selector when key is a function call function', async () => {
			const wrapper = renderZReference( {
				keyPath: functionCallKeyPath,
				objectValue,
				edit: true,
				expectedType: Constants.Z_FUNCTION,
				parentExpectedType: Constants.Z_STRING
			} );

			const selector = wrapper.getComponent( { name: 'wl-z-object-selector' } );
			expect( selector.props( 'returnType' ) ).toBe( Constants.Z_STRING );
			expect( selector.props( 'type' ) ).toBe( Constants.Z_FUNCTION );
		} );

		it( 'returns empty returnType when the key is a function call but parent expected type is unbound', async () => {
			const wrapper = renderZReference( {
				keyPath: functionCallKeyPath,
				objectValue,
				edit: true,
				expectedType: Constants.Z_FUNCTION,
				parentExpectedType: Constants.Z_OBJECT
			} );

			const selector = wrapper.getComponent( { name: 'wl-z-object-selector' } );
			expect( selector.props( 'returnType' ) ).toBe( undefined );
			expect( selector.props( 'type' ) ).toBe( Constants.Z_FUNCTION );
		} );

		it( 'returns empty returnType when the key is a function call but parent expected type is a resolver', async () => {
			const wrapper = renderZReference( {
				keyPath: functionCallKeyPath,
				objectValue,
				edit: true,
				expectedType: Constants.Z_FUNCTION,
				parentExpectedType: Constants.Z_FUNCTION_CALL
			} );

			const selector = wrapper.getComponent( { name: 'wl-z-object-selector' } );
			expect( selector.props( 'returnType' ) ).toBe( undefined );
			expect( selector.props( 'type' ) ).toBe( Constants.Z_FUNCTION );
		} );

		it( 'sets excluded zids from root persistent content', () => {
			const wrapper = renderZReference( {
				edit: true,
				expectedType: 'Z4'
			} );

			const selector = wrapper.getComponent( { name: 'wl-z-object-selector' } );
			expect( selector.props( 'excludeZids' ) ).toEqual( Constants.EXCLUDE_FROM_PERSISTENT_CONTENT );
		} );
	} );
} );
