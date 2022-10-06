/* eslint-disable compat/compat */
/*!
 * WikiLambda integration test for creating new function.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { CdxLookup, CdxTextInput } = require( '@wikimedia/codex' ),
	{ awaitLookup, clickItemInMenu } = require( './helpers/interactionHelpers.js' ),
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	mount = require( '@vue/test-utils' ).mount,
	store = require( '../../../resources/ext.wikilambda.edit/store/index.js' ),
	App = require( '../../../resources/ext.wikilambda.edit/components/App.vue' ),
	apiGetMock = require( './helpers/apiGetMock.js' ),
	expectedNewFunctionPostedToApi = require( './objects/expectedNewFunctionPostedToApi.js' );

describe( 'WikiLambda frontend, on function-editor view', () => {
	let apiPostWithEditTokenMock;
	let wrapper;
	beforeEach( () => {
		jest.useFakeTimers();

		global.window = Object.create( window );
		Object.defineProperty( window, 'location', {
			value: {
				href: 'currentPage'
			}
		} );

		// This is necessary to allow FunctionDefinition to attempt to scroll to second language without crashing.
		document.getElementById = ( selector ) => {
			if ( selector === 'fnDefinitionContainer' ) {
				return {};
			}
		};

		apiPostWithEditTokenMock = jest.fn( () => Promise.resolve( {
			wikilambda_edit: {
				page: 'newPage'
			}
		} ) );
		mw.Api = jest.fn( () => {
			return {
				postWithEditToken: apiPostWithEditTokenMock,
				get: apiGetMock
			};
		} );
		window.mw.Uri.mockImplementation( () => {
			return {
				path: Constants.PATHS.CREATE_Z_OBJECT,
				query: {
					view: Constants.VIEWS.FUNCTION_EDITOR
				}
			};
		} );
		wrapper = mount( App, { global: { plugins: [ store ] } } );
	} );
	it( 'allows creating a new function, making use of most important features', async () => {
		// ACT: Select a natural language.
		const languageSelectorLookup =
			wrapper.get( '.ext-wikilambda-language-selector__add-language' ).getComponent( CdxLookup );
		languageSelectorLookup.vm.$emit( 'input', 'Chin' );
		await awaitLookup( wrapper );
		await clickItemInMenu( languageSelectorLookup, 'Chinese' );

		// ACT: Enter a name for the function.
		wrapper.get( '.ext-wikilambda-function-definition-name' ).getComponent( CdxTextInput )
			.vm.$emit( 'input', 'function name, in Chinese' );
		await wrapper.vm.$nextTick();

		// ASSERT: New name is visible in work summary.
		expect( wrapper.get( '.ext-wikilambda-editior-visual-display-name' ).text() )
			.toEqual( 'function name, in Chinese' );

		// ACT: Enter an alias for the function.
		const aliasInput = wrapper.get( '.ext-wikilambda-function-definition-aliases__inputs input' );
		await aliasInput.setValue( 'function alias, in Chinese' );
		await aliasInput.trigger( 'keydown', { key: 'enter' } );

		// ACT: Select a type for the first argument.
		const argumentTypeSelectorLookup =
			wrapper.get( '.ext-wikilambda-editor-input-list-item__selector' ).getComponent( CdxLookup );
		argumentTypeSelectorLookup.vm.$emit( 'input', 'Str' );
		await awaitLookup( wrapper );
		await clickItemInMenu( argumentTypeSelectorLookup, 'String' );

		// ACT: Enter a label for the first argument.
		const argumentLabelInput = wrapper.get( '.ext-wikilambda-editor-input-list-item__label input' );
		await argumentLabelInput.setValue( 'first argument label, in Chinese' );

		// ASSERT: First argument's type and label are visible in work summary.
		expect( wrapper.findAll( '.ext-wikilambda-editior-visual-display-input-box' )[ 0 ].text() )
			.toEqual( 'String, “first argument label, in Chinese”' );

		// ACT: Add another argument
		await wrapper.get( '.ext-wikilambda-editor-input-list-item__button' ).trigger( 'click' );

		// ACT: Select a type for the second argument.
		const secondArgumentTypeSelectorLookup =
			wrapper.findAll( '.ext-wikilambda-editor-input-list-item__selector' )[ 1 ].getComponent( CdxLookup );
		secondArgumentTypeSelectorLookup.vm.$emit( 'input', 'Str' );
		await awaitLookup( wrapper );
		await clickItemInMenu( secondArgumentTypeSelectorLookup, 'String' );

		// ACT: Enter a label for the second argument.
		const secondArgumentLabelInput = wrapper.findAll( '.ext-wikilambda-editor-input-list-item__label input' )[ 1 ];
		await secondArgumentLabelInput.setValue( 'second argument label, in Chinese' );

		// ASSERT: Second argument's type and label are visible in work summary.
		expect( wrapper.findAll( '.ext-wikilambda-editior-visual-display-input-box' )[ 1 ].text() )
			.toEqual( 'String, “second argument label, in Chinese”' );

		// ACT: Select a type for the output
		const outputTypeSelectorLookup =
			wrapper.get( '.ext-wikilambda-function-definition-output__selector' ).getComponent( CdxLookup );
		outputTypeSelectorLookup.vm.$emit( 'input', 'Str' );
		await awaitLookup( wrapper );
		await clickItemInMenu( outputTypeSelectorLookup, 'String' );

		// ASSERT: Output's type is visible in work summary.
		expect( wrapper.get( '.ext-wikilambda-editior-visual-display-output-box' ).text() ).toEqual( 'String' );

		// ACT: Click "Add labels in another language".
		await wrapper.get( '.ext-wikilambda-function-definition__action-add-input-button' ).trigger( 'click' );

		// ACT: Select a second natural language.
		const secondLanguageSelectorLookup =
			wrapper.findAll( '.ext-wikilambda-language-selector__add-language' )[ 1 ].getComponent( CdxLookup );
		secondLanguageSelectorLookup.vm.$emit( 'input', 'Fren' );
		await awaitLookup( wrapper );
		await clickItemInMenu( secondLanguageSelectorLookup, 'French' );

		// ACT: Enter a name in the second language.
		wrapper.findAll( '.ext-wikilambda-function-definition-name' )[ 1 ].getComponent( CdxTextInput )
			.vm.$emit( 'input', 'function name, in French' );
		await wrapper.vm.$nextTick();

		// ACT: Select second language in work summary.
		const workSummaryLanguageSelector =
			wrapper.get( '.ext-wikilambda-editior-visual-display-body__language-selector' );
		await workSummaryLanguageSelector.trigger( 'click' );
		await clickItemInMenu( workSummaryLanguageSelector, 'French' );

		// ASSERT: New name is visible in work summary.
		expect( wrapper.get( '.ext-wikilambda-editior-visual-display-name' ).text() )
			.toEqual( 'function name, in French' );

		// ACT: Enter an alias in the second language.
		const secondLanguageAliasInput =
			wrapper.findAll( '.ext-wikilambda-function-definition-aliases__inputs input' )[ 1 ];
		await secondLanguageAliasInput.setValue( 'function alias, in French' );
		await secondLanguageAliasInput.trigger( 'keydown', { key: 'enter' } );

		// ACT: Enter a label for the first argument, in the second language.
		await wrapper.findAll( '.ext-wikilambda-editor-input-list-item__label input' )[ 2 ]
			.setValue( 'first argument label, in French' );

		// ASSERT: First argument's label is visible in work summary.
		expect( wrapper.findAll( '.ext-wikilambda-editior-visual-display-input-box' )[ 0 ].text() )
			.toEqual( 'String, “first argument label, in French”' );

		// ACT: Enter a label for the second argument, in the second language.
		await wrapper.findAll( '.ext-wikilambda-editor-input-list-item__label input' )[ 3 ]
			.setValue( 'second argument label, in French' );

		// ASSERT: Second argument's type and label are visible in work summary.
		expect( wrapper.findAll( '.ext-wikilambda-editior-visual-display-input-box' )[ 1 ].text() )
			.toEqual( 'String, “second argument label, in French”' );

		// ACT: Click publish button.
		await wrapper.get( '.ext-wikilambda-function-definition-footer__publish-button' ).trigger( 'click' );
		jest.runAllTimers();
		await wrapper.vm.$nextTick();
		await wrapper.vm.$nextTick();

		// ASSERT: Location is changed to page returned by API.
		expect( window.location.href ).toEqual( 'newPage' );

		// ASSERT: Correct ZObject was posted to the API.
		expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_edit',
			summary: '',
			zid: undefined,
			zobject: JSON.stringify( expectedNewFunctionPostedToApi )
		} );
	} );
} );
