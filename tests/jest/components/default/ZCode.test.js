/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	ZCode = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZCode.vue' ),
	CodeEditor = require( '../../../../resources/ext.wikilambda.edit/components/base/CodeEditor.vue' );

describe( 'ZCode', () => {
	var getters,
		actions;
	beforeEach( () => {
		getters = {
			getAllProgrammingLangs: createGettersWithFunctionsMock(),
			getZCodeLanguage: createGettersWithFunctionsMock( { id: 5 } ),
			getZCode: createGettersWithFunctionsMock( { id: 10 } ),
			getZStringTerminalValue: createGettersWithFunctionsMock(),
			getZCodeFunction: createGettersWithFunctionsMock(),
			getZarguments: createGettersWithFunctionsMock()
		};
		actions = {
			fetchAllZProgrammingLanguages: createGettersWithFunctionsMock(),
			// eslint-disable-next-line no-unused-vars
			setError: jest.fn( function ( context, payload ) {
				return true;
			} )
		};
		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );
	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			var wrapper = shallowMount( ZCode, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays the ace editor', () => {
			var wrapper = shallowMount( ZCode, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-zcode__code-editor' ).exists() ).toBe( true );
		} );

		it( 'editor is in read only mode', () => {
			var wrapper = shallowMount( ZCode, {
				props: {
					edit: false
				}
			} );
			expect( wrapper.findComponent( { name: 'code-editor' } ).props( 'readOnly' ) ).toBe( true );
		} );
	} );
	describe( 'in edit mode', () => {
		it( 'enables programming language selector and code editor when not in read-only or view mode', () => {
			var wrapper = shallowMount( ZCode, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.findComponent( '.ext-wikilambda-zcode__language-selector' ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'code-editor' } ).props( 'readOnly' ) ).toBe( false );
		} );
		it( 'updates code for valid strings', async () => {
			var wrapper = shallowMount( ZCode, {
				props: {
					edit: true
				}
			} );
			wrapper.getComponent( CodeEditor ).vm.$emit( 'change', 'def() {}' );
			await wrapper.vm.$nextTick();
			expect( wrapper.emitted( 'set-value' ) ).toBeTruthy();
		} );
	} );
} );
