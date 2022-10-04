/* eslint-disable compat/compat */
/*!
 * WikiLambda integration test for editing a function.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { CdxLookup, CdxTextInput } = require( '@wikimedia/codex' ),
	{ awaitLookup, clickItemInMenu, pageChange } = require( './helpers/interactionHelpers.js' ),
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	mount = require( '@vue/test-utils' ).mount,
	store = require( '../../../resources/ext.wikilambda.edit/store/index.js' ),
	App = require( '../../../resources/ext.wikilambda.edit/components/App.vue' ),
	apiGetMock = require( './helpers/apiGetMock.js' ),
	ApiMock = require( './helpers/apiMock.js' ),
	existingFunctionFromApi = require( './objects/existingFunctionFromApi.js' ),
	expectedEditedFunctionPostedToApi = require( './objects/expectedEditedFunctionPostedToApi.js' );

const functionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];

const lookupZObjectTypeLabels =
	new ApiMock( apiGetMock.typeLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const lookupZObjectLanguageLabels =
	new ApiMock( apiGetMock.languageLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const initializeRootZObject =
	new ApiMock( apiGetMock.loadZObjectsRequest, apiGetMock.loadZObjectsResponse, apiGetMock.loadZObjectsMatcher );
const fetchZImplementations =
	new ApiMock( apiGetMock.fetchZImplementationsRequest,
		apiGetMock.zObjectSearchResponse, apiGetMock.zObjectSearchMatcher );
const fetchZTesters =
	new ApiMock( apiGetMock.fetchZTestersRequest, apiGetMock.zObjectSearchResponse, apiGetMock.zObjectSearchMatcher );
const performTest =
	new ApiMock( apiGetMock.performTestRequest, apiGetMock.performTestResponse, apiGetMock.performTestMatcher );

describe( 'WikiLambda frontend, editing an existing function, on function-editor view', () => {
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
				get: apiGetMock.createMockApi( [
					lookupZObjectLanguageLabels,
					lookupZObjectTypeLabels,
					initializeRootZObject,
					fetchZImplementations,
					fetchZTesters,
					performTest ] )
			};
		} );

		window.mw.Uri.mockImplementation( () => {
			return {
				path: Constants.PATHS.EDIT_Z_OBJECT,
				query: {
					action: Constants.ACTIONS.EDIT,
					view: Constants.VIEWS.FUNCTION_EDITOR,
					title: functionZid
				}
			};
		} );
		global.mw.config.get = ( endpoint ) => {
			switch ( endpoint ) {
				case 'wgWikiLambda':
					return {
						zlangZid: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
						zId: functionZid
					};
				default:
					return {};
			}
		};

		wrapper = mount( App, { global: { plugins: [ store ] } } );
	} );
	it( 'allows editing the function, making use of most important features', async () => {
		// ACT: Edit the name of the function.
		wrapper.get( '.ext-wikilambda-function-definition-name' ).getComponent( CdxTextInput )
			.vm.$emit( 'input', 'edited function name, in Chinese' );
		await wrapper.vm.$nextTick();

		// ASSERT: New name is visible in work summary.
		expect( wrapper.get( '.ext-wikilambda-editior-visual-display-name' ).text() )
			.toEqual( 'edited function name, in Chinese' );

		// ACT: Add a second alias for the function.
		const aliasInput = wrapper.get( '.ext-wikilambda-function-definition-aliases__inputs input' );
		await aliasInput.setValue( 'second function alias, in Chinese' );
		await aliasInput.trigger( 'keydown', { key: 'enter' } );

		// ACT: Add a label for the first argument.
		await wrapper.findAll( '.ext-wikilambda-editor-input-list-item__label input' )[ 0 ]
			.setValue( 'newly added first argument label, in Chinese' );

		// ASSERT: New label for argument is visible in work summary.
		expect( wrapper.get( '.ext-wikilambda-editior-visual-display-input-box' ).text() )
			.toEqual( 'String, “newly added first argument label, in Chinese”' );

		// [ACT: Don't enter a label for the second argument, in the first language.]

		// Second language is Afrikaans fetched from the API with only two argument labels.
		// ACT: Edit the label for the first argument.
		await wrapper.findAll( '.ext-wikilambda-editor-input-list-item__label input' )[ 2 ]
			.setValue( 'edited first argument label, in Afrikaans' );

		// Second language is Afrikaans fetched from the API with only two argument labels.
		// ACT: Edit the label for the first argument.
		await wrapper.findAll( '.ext-wikilambda-editor-input-list-item__label input' )[ 2 ]
			.setValue( 'edited first argument label, in Afrikaans' );

		// ACT: Select second language in work summary.
		const workSummaryLanguageSelector =
			wrapper.get( '.ext-wikilambda-editior-visual-display-body__language-selector' );
		await workSummaryLanguageSelector.trigger( 'click' );
		await clickItemInMenu( workSummaryLanguageSelector, 'Afrikaans' );

		// ASSERT: New label for argument is visible in work summary.
		expect( wrapper.get( '.ext-wikilambda-editior-visual-display-input-box' ).text() )
			.toEqual( 'String, “edited first argument label, in Afrikaans”' );

		// ACT: Enter a name in the second language.
		wrapper.findAll( '.ext-wikilambda-function-definition-name' )[ 1 ].getComponent( CdxTextInput )
			.vm.$emit( 'input', 'function name, in Afrikaans' );
		await wrapper.vm.$nextTick();

		// ASSERT: New name is visible in work summary.
		expect( wrapper.get( '.ext-wikilambda-editior-visual-display-name' ).text() )
			.toEqual( 'function name, in Afrikaans' );

		// ACT: Delete the name.
		wrapper.findAll( '.ext-wikilambda-function-definition-name' )[ 1 ].getComponent( CdxTextInput )
			.vm.$emit( 'input', '' );
		await wrapper.vm.$nextTick();

		// ASSERT: No name is visible in the work summary.
		expect( wrapper.get( '.ext-wikilambda-editior-visual-display-name' ).text() )
			.toEqual( 'wikilambda-editor-default-name' );

		// ACT: Enter an aliase in the second language.
		const secondLanguageAliasInput =
			wrapper.findAll( '.ext-wikilambda-function-definition-aliases__inputs input' )[ 1 ];
		await secondLanguageAliasInput.setValue( 'first function alias, in Afrikaans' );
		await secondLanguageAliasInput.trigger( 'keydown', { key: 'enter' } );

		// ACT: Delete the alias.
		const aliasChipsContainer = wrapper.findAll( '.ext-wikilambda-function-definition-aliases__inputs' )[ 1 ].get( '.ext-wikilambda-chip_icon' );
		await aliasChipsContainer.trigger( 'click' );

		// ACT: Click "Add labels in another language".
		await wrapper.get( '.ext-wikilambda-function-definition__action-add-input-button' ).trigger( 'click' );

		// ACT: Select a third natural language.
		const thirdLanguageSelectorLookup =
			wrapper.findAll( '.ext-wikilambda-language-selector__add-language' )[ 2 ].getComponent( CdxLookup );
		thirdLanguageSelectorLookup.vm.$emit( 'input', 'Fren' );
		await awaitLookup( wrapper );
		await clickItemInMenu( thirdLanguageSelectorLookup, 'French' );

		// ACT: Enter a name in the third language.
		wrapper.findAll( '.ext-wikilambda-function-definition-name' )[ 2 ].getComponent( CdxTextInput )
			.vm.$emit( 'input', 'function name, in French' );
		await wrapper.vm.$nextTick();

		// ACT: Enter an alias in the third language.
		const thirdLanguageAliasInput =
			wrapper.findAll( '.ext-wikilambda-function-definition-aliases__inputs input' )[ 2 ];
		await thirdLanguageAliasInput.setValue( 'function alias, in French' );
		await thirdLanguageAliasInput.trigger( 'keydown', { key: 'enter' } );

		// ACT: Click publish button.
		await wrapper.get( '.ext-wikilambda-function-definition-footer__publish-button' ).trigger( 'click' );
		jest.runAllTimers();

		await pageChange( wrapper );

		// ASSERT: Location is changed to page returned by API.
		expect( window.location.href ).toEqual( 'newPage' );

		// ASSERT: Correct ZID and ZObject were posted to the API.
		expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_edit',
			summary: '',
			zid: functionZid,
			zobject: JSON.stringify( expectedEditedFunctionPostedToApi )
		} );
	} );
} );
