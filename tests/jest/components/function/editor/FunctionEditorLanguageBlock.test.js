/*!
 * WikiLambda unit test suite for the Function Editor language block component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createLabelDataMock = require( '../../../helpers/getterHelpers.js' ).createLabelDataMock,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createGetterMock = require( '../../../helpers/getterHelpers.js' ).createGetterMock,
	FunctionEditorLanguageBlock = require( '../../../../../resources/ext.wikilambda.app/components/function/editor/FunctionEditorLanguageBlock.vue' );

describe( 'FunctionEditorLanguageBlock', () => {
	let getters;

	beforeEach( () => {
		getters = {
			getLabelDataForLangCode: createLabelDataMock( { zid: null, label: null, lang: 'Z1002', langCode: 'en', langDir: 'ltr' } ),
			getLabelData: createLabelDataMock( { Z1002: 'English' } ),
			getZFunctionLanguages: createGettersWithFunctionsMock( [ 'Z1002', 'Z1004' ] ),
			isCreateNewPage: createGetterMock( true ),
			isUserLoggedIn: createGetterMock( true )
		};
		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	describe( 'function editor language block', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( FunctionEditorLanguageBlock, {
				props: {
					index: 0,
					zLanguage: 'Z1002'
				},
				global: { stubs: { WlFunctionEditorField: false } }
			} );
			expect( wrapper.find( '.ext-wikilambda-app-function-editor-language-block' ).exists() ).toBe( true );
		} );

		it( 'renders all fields for main language', async () => {
			const wrapper = shallowMount( FunctionEditorLanguageBlock, {
				props: {
					index: 0,
					zLanguage: 'Z1002'
				},
				global: { stubs: { WlFunctionEditorField: false } }
			} );

			const lang = wrapper.findComponent( { name: 'wl-function-editor-language' } );
			expect( lang.exists() ).toBe( true );
			expect( lang.props( 'zLanguage' ) ).toBe( 'Z1002' );

			const name = wrapper.findComponent( { name: 'wl-function-editor-name' } );
			expect( name.exists() ).toBe( true );
			expect( name.props( 'zLanguage' ) ).toBe( 'Z1002' );

			const description = wrapper.findComponent( { name: 'wl-function-editor-description' } );
			expect( description.exists() ).toBe( true );
			expect( description.props( 'zLanguage' ) ).toBe( 'Z1002' );

			const aliases = wrapper.findComponent( { name: 'wl-function-editor-aliases' } );
			expect( aliases.exists() ).toBe( true );
			expect( aliases.props( 'zLanguage' ) ).toBe( 'Z1002' );

			const inputs = wrapper.findComponent( { name: 'wl-function-editor-inputs' } );
			expect( inputs.exists() ).toBe( true );
			expect( inputs.props( 'zLanguage' ) ).toBe( 'Z1002' );
			expect( inputs.props( 'isMainLanguageBlock' ) ).toBe( true );

			const output = wrapper.findComponent( { name: 'wl-function-editor-output' } );
			expect( output.exists() ).toBe( true );
		} );

		it( 'renders all fields for the other languages', async () => {
			const wrapper = shallowMount( FunctionEditorLanguageBlock, {
				props: {
					index: 2,
					zLanguage: 'Z1002'
				},
				global: { stubs: { WlFunctionEditorField: false } }
			} );

			const lang = wrapper.findComponent( { name: 'wl-function-editor-language' } );
			expect( lang.exists() ).toBe( true );
			expect( lang.props( 'zLanguage' ) ).toBe( 'Z1002' );

			const name = wrapper.findComponent( { name: 'wl-function-editor-name' } );
			expect( name.exists() ).toBe( true );
			expect( name.props( 'zLanguage' ) ).toBe( 'Z1002' );

			const description = wrapper.findComponent( { name: 'wl-function-editor-description' } );
			expect( description.exists() ).toBe( true );
			expect( description.props( 'zLanguage' ) ).toBe( 'Z1002' );

			const aliases = wrapper.findComponent( { name: 'wl-function-editor-aliases' } );
			expect( aliases.exists() ).toBe( true );
			expect( aliases.props( 'zLanguage' ) ).toBe( 'Z1002' );

			const inputs = wrapper.findComponent( { name: 'wl-function-editor-inputs' } );
			expect( inputs.exists() ).toBe( true );
			expect( inputs.props( 'zLanguage' ) ).toBe( 'Z1002' );
			expect( inputs.props( 'isMainLanguageBlock' ) ).toBe( false );

			const output = wrapper.findComponent( { name: 'wl-function-editor-output' } );
			expect( output.exists() ).toBe( false );
		} );
	} );
} );
