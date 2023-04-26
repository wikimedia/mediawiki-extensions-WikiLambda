/*!
 * WikiLambda unit test suite for the default ZImplementation component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	ZImplementation = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZImplementation.vue' );

describe( 'ZImplementation', () => {
	var getters;
	beforeEach( () => {
		getters = {
			getZImplementationFunctionRowId: createGettersWithFunctionsMock( 0 ),
			getZImplementationContentType: createGettersWithFunctionsMock( 'Z14K2' ),
			getZImplementationContentRowId: createGettersWithFunctionsMock( 1 ),
			getLabel: () => ( key ) => {
				const labels = {
					Z14K2: 'composition',
					Z14K3: 'code',
					Z14: 'Implementation'
				};
				return labels[ key ] || 'label';
			}
		};
		global.store.hotUpdate( { getters: getters } );
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			var wrapper = shallowMount( ZImplementation, {
				props: {
					edit: false
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-implementation' ).exists() ).toBe( true );
		} );

		it( 'renders function block', () => {
			var wrapper = shallowMount( ZImplementation, {
				props: {
					edit: false
				}
			} );
			const functionBlock = wrapper.find( '.ext-wikilambda-implementation-function' );
			expect( functionBlock.exists() ).toBe( true );
			expect( functionBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'renders type block', () => {
			var wrapper = shallowMount( ZImplementation, {
				props: {
					edit: false
				}
			} );
			const typeBlock = wrapper.find( '.ext-wikilambda-implementation-type' );
			expect( typeBlock.exists() ).toBe( true );
			expect( typeBlock.find( '.ext-wikilambda-value-text' ).exists() ).toBe( true );
		} );

		it( 'renders content block', () => {
			var wrapper = shallowMount( ZImplementation, {
				props: {
					edit: false
				}
			} );
			const contentBlock = wrapper.find( '.ext-wikilambda-implementation-content' );
			expect( contentBlock.exists() ).toBe( true );
			expect( contentBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'it renders the composition type for a composition', () => {
			getters.getZImplementationContentType = createGettersWithFunctionsMock( 'Z14K2' );
			global.store.hotUpdate( { getters: getters } );
			var wrapper = shallowMount( ZImplementation, {
				props: {
					edit: false
				}
			} );
			const typeBlock = wrapper.find( '.ext-wikilambda-implementation-type' );
			expect( typeBlock.find( '.ext-wikilambda-key-block' ).text() ).toBe( 'Implementation' );
			expect( typeBlock.find( '.ext-wikilambda-value-block' ).text() ).toBe( 'composition' );
		} );

		it( 'it renders the code type for a code implementation', () => {
			getters.getZImplementationContentType = createGettersWithFunctionsMock( 'Z14K3' );
			global.store.hotUpdate( { getters: getters } );
			var wrapper = shallowMount( ZImplementation, {
				props: {
					edit: false
				}
			} );
			const typeBlock = wrapper.find( '.ext-wikilambda-implementation-type' );
			expect( typeBlock.find( '.ext-wikilambda-key-block' ).text() ).toBe( 'Implementation' );
			expect( typeBlock.find( '.ext-wikilambda-value-block' ).text() ).toBe( 'code' );
		} );

		it( 'it renders non editable function for a builtin', () => {
			getters.getZImplementationContentType = createGettersWithFunctionsMock( 'Z14K4' );
			global.store.hotUpdate( { getters: getters } );
			var wrapper = shallowMount( ZImplementation, {
				props: {
					edit: false
				}
			} );
			const functionBlock = wrapper.find( '.ext-wikilambda-implementation-function' );
			expect( functionBlock.exists() ).toBe( true );
			expect( functionBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
			expect( functionBlock.findComponent( { name: 'wl-z-object-key-value' } ).props( 'edit' ) ).toBe( false );
		} );

		it( 'it renders the warning message for a builtin', () => {
			getters.getZImplementationContentType = createGettersWithFunctionsMock( 'Z14K4' );
			global.store.hotUpdate( { getters: getters } );
			var wrapper = shallowMount( ZImplementation, {
				props: {
					edit: false
				}
			} );
			const typeBlock = wrapper.find( '.ext-wikilambda-implementation-type' );
			expect( typeBlock.find( '.ext-wikilambda-key-block' ).text() ).toBe( 'Implementation' );
			const valueBlock = typeBlock.find( '.ext-wikilambda-value-block' );
			expect( valueBlock.findComponent( { name: 'cdx-message' } ).exists() ).toBe( true );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders without errors', () => {
			var wrapper = shallowMount( ZImplementation, {
				props: {
					edit: true
				}
			} );
			expect( wrapper.find( '.ext-wikilambda-implementation' ).exists() ).toBe( true );
		} );

		it( 'renders function block', () => {
			var wrapper = shallowMount( ZImplementation, {
				props: {
					edit: true
				}
			} );
			const functionBlock = wrapper.find( '.ext-wikilambda-implementation-function' );
			expect( functionBlock.exists() ).toBe( true );
			expect( functionBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'renders type block', () => {
			var wrapper = shallowMount( ZImplementation, {
				props: {
					edit: true
				}
			} );
			const typeBlock = wrapper.find( '.ext-wikilambda-implementation-type' );
			expect( typeBlock.exists() ).toBe( true );
			expect( typeBlock.findAllComponents( { name: 'cdx-radio' } ) ).toHaveLength( 2 );
		} );

		it( 'renders content block', () => {
			var wrapper = shallowMount( ZImplementation, {
				props: {
					edit: true
				}
			} );
			const contentBlock = wrapper.find( '.ext-wikilambda-implementation-content' );
			expect( contentBlock.exists() ).toBe( true );
			expect( contentBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
		} );

		it( 'type block has code and composition radio buttons', () => {
			var wrapper = shallowMount( ZImplementation, {
				props: {
					edit: true
				}
			} );
			const typeBlock = wrapper.find( '.ext-wikilambda-implementation-type' );
			const radioButtons = typeBlock.findAllComponents( { name: 'cdx-radio' } );
			expect( radioButtons ).toHaveLength( 2 );
			expect( radioButtons[ 0 ].props( 'inputValue' ) ).toBe( 'Z14K3' );
			expect( radioButtons[ 1 ].props( 'inputValue' ) ).toBe( 'Z14K2' );
		} );

		it( 'it renders non editable function for a builtin', () => {
			getters.getZImplementationContentType = createGettersWithFunctionsMock( 'Z14K4' );
			global.store.hotUpdate( { getters: getters } );
			var wrapper = shallowMount( ZImplementation, {
				props: {
					edit: true
				}
			} );
			const functionBlock = wrapper.find( '.ext-wikilambda-implementation-function' );
			expect( functionBlock.exists() ).toBe( true );
			expect( functionBlock.findComponent( { name: 'wl-z-object-key-value' } ).exists() ).toBe( true );
			expect( functionBlock.findComponent( { name: 'wl-z-object-key-value' } ).props( 'edit' ) ).toBe( false );
		} );

		it( 'it renders the warning message for a builtin', () => {
			getters.getZImplementationContentType = createGettersWithFunctionsMock( 'Z14K4' );
			global.store.hotUpdate( { getters: getters } );
			var wrapper = shallowMount( ZImplementation, {
				props: {
					edit: true
				}
			} );
			const typeBlock = wrapper.find( '.ext-wikilambda-implementation-type' );
			expect( typeBlock.find( '.ext-wikilambda-key-block' ).text() ).toBe( 'Implementation' );
			const valueBlock = typeBlock.find( '.ext-wikilambda-value-block' );
			expect( valueBlock.findComponent( { name: 'cdx-message' } ).exists() ).toBe( true );
		} );
	} );
} );
