/*!
 * WikiLambda unit test suite for the ZKeyModeSelector component and related files.
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createLocalVue = require( '@vue/test-utils' ).createLocalVue,
	Vuex = require( 'vuex' ),
	ZObjectEditor = require( '../../../resources/ext.wikilambda.edit/components/ZObjectEditor.vue' ),
	localVue;

localVue = createLocalVue();
localVue.use( Vuex );

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
			} )
		};
		actions = {
			fetchZKeys: jest.fn(),
			initializeZObject: jest.fn(),
			submitZObject: jest.fn()
		};
		mutations = {
			addZKeyLabel: jest.fn(),
			setZLangs: jest.fn()
		};

		store = new Vuex.Store( {
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
			store: store,
			localVue: localVue,
			mocks: {
				$i18n: jest.fn()
			}
		} );

		expect( wrapper.find( 'div' ) ).toBeTruthy();
		expect( actions.initializeZObject.mock.calls.length ).toBe( 1 );
	} );
} );
