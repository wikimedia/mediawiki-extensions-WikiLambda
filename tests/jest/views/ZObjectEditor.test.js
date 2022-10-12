/*!
 * WikiLambda unit test suite for the ZKeyModeSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	ZObjectEditor = require( '../../../resources/ext.wikilambda.edit/views/ZObjectEditor.vue' );

describe( 'ZObjectEditor', function () {
	var getters,
		actions,
		mutations;

	beforeEach( function () {
		getters = {
			isCreateNewPage: jest.fn( function () {
				return true;
			} ),
			getZObjectMessage: jest.fn( function () {
				return {
					type: 'error',
					text: null
				};
			} ),
			getZObjectAsJson: jest.fn( function () {
				return {
					Z1K1: 'Z1'
				};
			} ),
			currentZObjectIsValid: jest.fn(),
			isNewZObject: jest.fn()
		};
		actions = {
			fetchZKeys: jest.fn(),
			submitZObject: jest.fn(),
			initialize: jest.fn()
		};
		mutations = {
			addZKeyLabel: jest.fn()
		};

		global.store.hotUpdate( {
			getters: getters,
			actions: actions,
			mutations: mutations
		} );

		mw.msg = jest.fn();
		mw.language = {};
		mw.language.getFallbackLanguageChain = jest.fn( function () {
			return 'en';
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( ZObjectEditor );

		expect( wrapper.find( '#ext-wikilambda-editor' ).exists() ).toBeTruthy();

	} );
} );
