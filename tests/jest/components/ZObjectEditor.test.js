/*!
 * WikiLambda unit test suite for the ZKeyModeSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	Vuex = require( 'vuex' ),
	ZObjectEditor = require( '../../../resources/ext.wikilambda.edit/components/ZObjectEditor.vue' );

describe( 'ZObjectEditor', function () {
	var getters,
		actions,
		mutations,
		store;

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
			currentZObjectHasLabel: jest.fn(),
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

		store = Vuex.createStore( {
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
		var wrapper = shallowMount( ZObjectEditor, {
			global: {
				plugins: [
					store
				],
				mocks: {
					$i18n: jest.fn()
				}
			}
		} );

		expect( wrapper.find( 'div' ) ).toBeTruthy();
	} );
} );
