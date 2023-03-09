/*!
 * WikiLambda unit test suite for the ZCode component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' );

var VueTestUtils = require( '@vue/test-utils' ),
	CodeEditor = require( '../../../resources/ext.wikilambda.edit/components/base/CodeEditor.vue' ),
	ZCode = require( '../../../resources/ext.wikilambda.edit/components/main-types/ZCode.vue' );

const zobjectId = 1;
const codeItemId = 2;
const codeLanguageId = 3;
const languageCodeId = 4;
const initialCodeValue = 'initial';

describe( 'ZCode', () => {
	beforeEach( () => {
		global.store.hotUpdate( {
			mutations: {
				setCodeValue( state, value ) {
					state.codeValue = value;
				}
			},
			getters: {
				getZObjectChildrenById: ( state ) =>
					( id ) => {
						if ( id === zobjectId ) {
							return [
								{ key: Constants.Z_CODE_CODE, id: codeItemId },
								{ key: Constants.Z_CODE_LANGUAGE, id: codeLanguageId }
							];
						} else if ( id === codeItemId ) {
							return [ { key: Constants.Z_STRING_VALUE, value: state.codeValue } ];
						} else if ( id === codeLanguageId ) {
							return [ { key: Constants.Z_PROGRAMMING_LANGUAGE_CODE, id: languageCodeId } ];
						} else if ( id === languageCodeId ) {
							return [ { key: Constants.Z_STRING_VALUE, value: 'Python' } ];
						}
						return [];
					},
				getAllProgrammingLangs: jest.fn( () => {
					return {};
				} ),
				getErrors: jest.fn( function () {
					return {};
				} )
			}
		} );
		global.store.commit( 'setCodeValue', initialCodeValue );
	} );

	it( 'renders without errors', () => {
		var wrapper = VueTestUtils.shallowMount( ZCode );

		expect( wrapper.find( '.ext-wikilambda-zcode' ).exists() ).toBe( true );
	} );

	it( 'sets code value in editor on first load', () => {
		var wrapper = VueTestUtils.shallowMount( ZCode, { props: { zobjectId: zobjectId } } );

		expect( wrapper.findComponent( { name: 'wl-code-editor' } ).props( 'value' ) ).toEqual( initialCodeValue );
	} );

	it( 'set code value in editor when it is updated in store following a language change', ( done ) => {
		var wrapper = VueTestUtils.shallowMount( ZCode, { props: { zobjectId: zobjectId } } );

		wrapper.findComponent( { name: 'cdx-select' } ).vm.$emit( 'update:selected' );
		global.store.commit( 'setCodeValue', 'new' );

		wrapper.vm.$nextTick( () => {
			expect( wrapper.findComponent( { name: 'wl-code-editor' } ).props( 'value' ) ).toEqual( 'new' );
			done();
		} );
	} );

	it( 'does not set code value in editor when it is updated in store, if that update does not follow a language change', ( done ) => {
		var wrapper = VueTestUtils.shallowMount( ZCode, { props: { zobjectId: zobjectId } } );

		global.store.commit( 'setCodeValue', 'new' );

		wrapper.vm.$nextTick( () => {
			expect( wrapper.findComponent( { name: 'wl-code-editor' } ).props( 'value' ) ).toEqual( initialCodeValue );
			done();
		} );
	} );

	it( 'enables programming language selector and code editor when not in read-only or view mode', () => {
		var wrapper = VueTestUtils.shallowMount( ZCode, { props: { zobjectId: zobjectId } } );

		expect( wrapper.findComponent( { name: 'cdx-select' } ).exists() ).toEqual( true );
		expect( wrapper.findComponent( { name: 'wl-code-editor' } ).props( 'readOnly' ) ).toEqual( false );
	} );

	it( 'disables programming language selector and code editor when in read-only mode', () => {
		var wrapper = VueTestUtils.shallowMount( ZCode, { props: { zobjectId: zobjectId, readonly: true } } );

		expect( wrapper.findComponent( { name: 'cdx-select' } ).exists() ).toEqual( false );
		expect( wrapper.findComponent( { name: 'wl-code-editor' } ).props( 'readOnly' ) ).toEqual( true );
	} );

	it( 'disables programming language selector and code editor when in view mode', () => {
		var wrapper = VueTestUtils.shallowMount( ZCode, {
			props: { zobjectId: zobjectId },
			global: { provide: { viewmode: true } }
		} );

		expect( wrapper.findComponent( { name: 'cdx-select' } ).exists() ).toEqual( false );
		expect( wrapper.findComponent( { name: 'wl-code-editor' } ).props( 'readOnly' ) ).toEqual( true );
	} );
	it( 'updates code for valid strings', async () => {
		var wrapper = VueTestUtils.shallowMount( ZCode );
		wrapper.getComponent( CodeEditor ).vm.$emit( 'change', 'def() {}' );
		await wrapper.vm.$nextTick();
		expect( wrapper.emitted( 'update-code' ) ).toBeTruthy();
	} );
} );
