/* eslint-disable compat/compat */
/*!
 * WikiLambda integration test for creating new function.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { CdxLookup, CdxTextInput } = require( '@wikimedia/codex' );
const Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	mount = require( '@vue/test-utils' ).mount,
	store = require( '../../../resources/ext.wikilambda.edit/store/index.js' ),
	App = require( '../../../resources/ext.wikilambda.edit/components/App.vue' ),
	apiGetMock = require( './helpers/apiGetMock.js' ),
	expectedNewFunctionPostedToApi = require( './objects/expectedNewFunctionPostedToApi.js' );

const awaitLookup = async ( wrapper ) => {
	// Fast-forward timer for API call.
	jest.runAllTimers();
	// CdxLookup requires no fewer than 3 ticks to fully update itself.
	await wrapper.vm.$nextTick();
	await wrapper.vm.$nextTick();
	await wrapper.vm.$nextTick();
};

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
		await languageSelectorLookup.findAll( '.cdx-menu-item' )
			.find( ( item ) => item.text() === 'Chinese' )
			.trigger( 'click' );

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
		await argumentTypeSelectorLookup.findAll( '.cdx-menu-item' )
			.find( ( item ) => item.text() === 'String' )
			.trigger( 'click' );

		// ACT: Enter a label for the first argument.
		const argumentLabelInput = wrapper.get( '.ext-wikilambda-editor-input-list-item__label input' );
		await argumentLabelInput.setValue( 'first argument label, in Chinese' );

		// ASSERT: First argument's type and label are visible in work summary.
		expect( wrapper.get( '.ext-wikilambda-editior-visual-display-input-box' ).text() )
			.toEqual( 'String, “first argument label, in Chinese”' );

		// ACT: Add another argument
		await wrapper.get( '.ext-wikilambda-editor-input-list-item__button' ).trigger( 'click' );

		// ACT: Select a type for the second argument.
		const secondArgumentTypeSelectorLookup =
			wrapper.findAll( '.ext-wikilambda-editor-input-list-item__selector' )[ 1 ].getComponent( CdxLookup );
		secondArgumentTypeSelectorLookup.vm.$emit( 'input', 'Str' );
		await awaitLookup( wrapper );
		await secondArgumentTypeSelectorLookup.findAll( '.cdx-menu-item' )
			.find( ( item ) => item.text() === 'String' )
			.trigger( 'click' );

		// ACT: Enter a label for the second argument.
		const secondArgumentLabelInput = wrapper.findAll( '.ext-wikilambda-editor-input-list-item__label input' )[ 1 ];
		await secondArgumentLabelInput.setValue( 'second argument label, in Chinese' );

		// TODO(T317781): Test scrolling to second argument in work summary, once bug fixed.

		// ACT: Select a type for the output
		const outputTypeSelectorLookup =
			wrapper.get( '.ext-wikilambda-function-definition-output__selector' ).getComponent( CdxLookup );
		outputTypeSelectorLookup.vm.$emit( 'input', 'Str' );
		await awaitLookup( wrapper );
		await outputTypeSelectorLookup.findAll( '.cdx-menu-item' )
			.find( ( item ) => item.text() === 'String' )
			.trigger( 'click' );

		// ASSERT: Output's type is visible in work summary.
		expect( wrapper.get( '.ext-wikilambda-editior-visual-display-output-box' ).text() ).toEqual( 'String' );

		// ACT: Click publish button.
		await wrapper.get( '.ext-wikilambda-function-definition-footer__publish-button' ).trigger( 'click' );
		jest.runAllTimers();
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
