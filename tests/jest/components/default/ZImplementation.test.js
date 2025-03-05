/*!
 * WikiLambda unit test suite for the default ZImplementation component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );

const ZImplementation = require( '../../../../resources/ext.wikilambda.app/components/types/ZImplementation.vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const { createLabelDataMock } = require( '../../helpers/getterHelpers.js' );

// General use (composition implementation)
const keyPath = 'main.Z2K2';
const objectValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z14' },
	Z14K1: { Z1K1: 'Z9', Z9K1: 'Z802' },
	Z14K2: {
		Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
		Z7K1: { Z1K1: 'Z9', Z9K1: '' }
	}
};

// Empty implementation
const emptyObjectValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z14' },
	Z14K1: { Z1K1: 'Z9', Z9K1: '' },
	Z14K2: {
		Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
		Z7K1: { Z1K1: 'Z9', Z9K1: '' }
	}
};

// Code implementation
const codeObjectValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z14' },
	Z14K1: { Z1K1: 'Z9', Z9K1: 'Z802' },
	Z14K3: {
		Z1K1: { Z1K1: 'Z9', Z9K1: 'Z16' },
		Z16K1: { Z1K1: 'Z9', Z9K1: 'Z610' },
		Z16K2: { Z1K1: 'Z6', Z6K1: 'some_code();' }
	}
};

// Builtin implementation
const builtinObjectValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z14' },
	Z14K1: { Z1K1: 'Z9', Z9K1: 'Z802' },
	Z14K4: { Z1K1: 'Z9', Z9K1: 'Z902' }
};

const globalStubs = {
	stubs: {
		WlKeyValueBlock: false,
		WlKeyBlock: false
	}
};

describe( 'ZImplementation', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getLabelData = createLabelDataMock( {
			Z14K2: 'composition',
			Z14K3: 'code',
			Z14: 'Implementation'
		} );
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZImplementation, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: globalStubs
			} );
			expect( wrapper.find( '.ext-wikilambda-app-implementation' ).exists() ).toBe( true );
		} );

		it( 'renders function block', () => {
			const wrapper = shallowMount( ZImplementation, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: globalStubs
			} );
			const functionBlock = wrapper.find( '.ext-wikilambda-app-implementation__function' );
			expect( functionBlock.exists() ).toBe( true );
			expect( functionBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'renders type block', () => {
			const wrapper = shallowMount( ZImplementation, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: globalStubs
			} );
			const typeBlock = wrapper.find( '.ext-wikilambda-app-implementation__type' );
			expect( typeBlock.exists() ).toBe( true );
			expect( typeBlock.find( '.ext-wikilambda-app-implementation__value-text' ).exists() ).toBe( true );
		} );

		it( 'renders content block', () => {
			const wrapper = shallowMount( ZImplementation, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: globalStubs
			} );
			const contentBlock = wrapper.find( '.ext-wikilambda-app-implementation__content' );
			expect( contentBlock.exists() ).toBe( true );
			expect( contentBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'it renders the composition type for a composition', () => {
			const wrapper = shallowMount( ZImplementation, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: globalStubs
			} );
			const typeBlock = wrapper.find( '.ext-wikilambda-app-implementation__type' );
			expect( typeBlock.find( '.ext-wikilambda-app-key-block' ).text() ).toBe( 'Implementation' );
			expect( typeBlock.find( '.ext-wikilambda-app-implementation__value-text' ).text() ).toBe( 'composition' );
		} );

		it( 'it renders the code type for a code implementation', () => {
			const wrapper = shallowMount( ZImplementation, {
				props: {
					keyPath,
					objectValue: codeObjectValue,
					edit: false
				},
				global: globalStubs
			} );
			const typeBlock = wrapper.find( '.ext-wikilambda-app-implementation__type' );
			expect( typeBlock.find( '.ext-wikilambda-app-key-block' ).text() ).toBe( 'Implementation' );
			expect( typeBlock.find( '.ext-wikilambda-app-implementation__value-text' ).text() ).toBe( 'code' );
		} );

		it( 'it renders non editable function for a builtin', () => {
			const wrapper = shallowMount( ZImplementation, {
				props: {
					keyPath,
					objectValue: builtinObjectValue,
					edit: false
				},
				global: globalStubs
			} );
			const functionBlock = wrapper.find( '.ext-wikilambda-app-implementation__function' );
			expect( functionBlock.exists() ).toBe( true );
			expect( functionBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
			expect( functionBlock.findComponent( { name: 'wl-z-object-key-value' } ).props( 'edit' ) ).toBe( false );
		} );

		it( 'it renders the warning message for a builtin', () => {
			const wrapper = shallowMount( ZImplementation, {
				props: {
					keyPath,
					objectValue: builtinObjectValue,
					edit: false
				},
				global: globalStubs
			} );
			const typeBlock = wrapper.find( '.ext-wikilambda-app-implementation__type' );
			expect( typeBlock.find( '.ext-wikilambda-app-key-block' ).text() ).toBe( 'Implementation' );
			const valueBlock = typeBlock.find( '.ext-wikilambda-app-key-value-block__value' );
			expect( valueBlock.findComponent( { name: 'cdx-message' } ).exists() ).toBe( true );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZImplementation, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );
			expect( wrapper.find( '.ext-wikilambda-app-implementation' ).exists() ).toBe( true );
		} );

		it( 'renders function block', () => {
			const wrapper = shallowMount( ZImplementation, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );
			const functionBlock = wrapper.find( '.ext-wikilambda-app-implementation__function' );
			expect( functionBlock.exists() ).toBe( true );
			expect( functionBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'renders type block', () => {
			const wrapper = shallowMount( ZImplementation, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );
			const typeBlock = wrapper.find( '.ext-wikilambda-app-implementation__type' );
			expect( typeBlock.exists() ).toBe( true );
			expect( typeBlock.findAllComponents( { name: 'cdx-radio' } ) ).toHaveLength( 2 );
		} );

		it( 'renders content block', () => {
			const wrapper = shallowMount( ZImplementation, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );
			const contentBlock = wrapper.find( '.ext-wikilambda-app-implementation__content' );
			expect( contentBlock.exists() ).toBe( true );
			expect( contentBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'type block has code and composition radio buttons', () => {
			const wrapper = shallowMount( ZImplementation, {
				props: {
					keyPath,
					objectValue,
					edit: true
				},
				global: globalStubs
			} );
			const typeBlock = wrapper.find( '.ext-wikilambda-app-implementation__type' );
			const radioButtons = typeBlock.findAllComponents( { name: 'cdx-radio' } );
			expect( radioButtons ).toHaveLength( 2 );
			expect( radioButtons[ 0 ].props( 'inputValue' ) ).toBe( 'Z14K3' );
			expect( radioButtons[ 1 ].props( 'inputValue' ) ).toBe( 'Z14K2' );
		} );

		it( 'it renders non editable function for a builtin', () => {
			const wrapper = shallowMount( ZImplementation, {
				props: {
					keyPath,
					objectValue: builtinObjectValue,
					edit: true
				},
				global: globalStubs
			} );
			const functionBlock = wrapper.find( '.ext-wikilambda-app-implementation__function' );
			expect( functionBlock.exists() ).toBe( true );
			expect( functionBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
			expect( functionBlock.findComponent( { name: 'wl-z-object-key-value' } ).props( 'edit' ) ).toBe( false );
		} );

		it( 'it renders the warning message for a builtin', () => {
			const wrapper = shallowMount( ZImplementation, {
				props: {
					keyPath,
					objectValue: builtinObjectValue,
					edit: true
				},
				global: globalStubs
			} );
			const typeBlock = wrapper.find( '.ext-wikilambda-app-implementation__type' );
			expect( typeBlock.find( '.ext-wikilambda-app-key-block' ).text() ).toBe( 'Implementation' );
			const valueBlock = typeBlock.find( '.ext-wikilambda-app-key-value-block__value' );
			expect( valueBlock.findComponent( { name: 'cdx-message' } ).exists() ).toBe( true );
		} );

		it( 'does not render the content block and radio buttons should be disabled when function zid is not available', () => {
			const wrapper = shallowMount( ZImplementation, {
				props: {
					keyPath,
					objectValue: emptyObjectValue,
					edit: true
				},
				global: globalStubs
			} );
			const contentBlock = wrapper.find( '.ext-wikilambda-app-implementation__content' );
			expect( contentBlock.exists() ).toBe( false );

			const typeBlock = wrapper.find( '.ext-wikilambda-app-implementation__type' );
			const radioButtons = typeBlock.findAllComponents( { name: 'cdx-radio' } );
			expect( radioButtons ).toHaveLength( 2 );
			expect( radioButtons[ 0 ].props( 'disabled' ) ).toBe( true );
			expect( radioButtons[ 1 ].props( 'disabled' ) ).toBe( true );
		} );
	} );
} );
