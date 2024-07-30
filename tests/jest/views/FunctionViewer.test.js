/*!
 * WikiLambda unit test suite for the ZKeyModeSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const VueTestUtils = require( '@vue/test-utils' ),
	createGetterMock = require( '../helpers/getterHelpers.js' ).createGetterMock,
	FunctionViewer = require( '../../../resources/ext.wikilambda.app/views/FunctionViewer.vue' );

describe( 'FunctionViewer', () => {
	const functionZid = 'Z12345';
	let getters;

	beforeEach( () => {
		getters = {
			getCurrentZObjectId: createGetterMock( functionZid ),
			getUserLangZid: createGetterMock( 'Z1002' ),
			isCreateNewPage: createGetterMock( false )
		};
		global.store.hotUpdate( { getters: getters } );

		window.mw.Uri.mockImplementation( () => ( {
			path: '/wiki/' + functionZid
		} ) );

		VueTestUtils.config.global.mocks.$i18n = jest.fn().mockImplementation( () => ( {
			text: jest.fn()
		} ) );
	} );

	it( 'renders without errors', () => {
		const wrapper = VueTestUtils.shallowMount( FunctionViewer );

		expect( wrapper.find( '.ext-wikilambda-function-viewer' ).exists() ).toBeTruthy();
	} );

	it( 'does not display success message by default', () => {
		const wrapper = VueTestUtils.shallowMount( FunctionViewer );
		expect( wrapper.find( '.ext-wikilambda-function-viewer__message' ).exists() ).toBeFalsy();
		expect( FunctionViewer.computed.displaySuccessMessage() ).toBe( false );
	} );

	it( 'displays success message if indicated in url', () => {
		window.mw.Uri.mockImplementation( () => ( {
			path: '/wiki/' + functionZid,
			query: {
				success: 'true'
			}
		} ) );
		const wrapper = VueTestUtils.shallowMount( FunctionViewer );

		expect( wrapper.find( '.ext-wikilambda-toast-message' ).exists() ).toBeTruthy();
		expect( FunctionViewer.computed.displaySuccessMessage() ).toBe( true );
	} );
} );
