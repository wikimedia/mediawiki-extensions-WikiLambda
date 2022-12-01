/*!
 * WikiLambda unit test suite for the ZKeyModeSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	mount = require( '@vue/test-utils' ).mount,
	createGettersWithFunctionsMock = require( '../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	ZObjectEditor = require( '../../../resources/ext.wikilambda.edit/views/ZObjectEditor.vue' ),
	ZObjectPublish = require( '../../../resources/ext.wikilambda.edit/components/ZObjectPublish.vue' );

describe( 'ZObjectEditor', function () {
	var getters,
		actions,
		mutations;

	beforeEach( function () {
		// Needed because of the Teleported component.
		const el = document.createElement( 'div' );
		el.id = 'ext-wikilambda-app';
		document.body.appendChild( el );

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
			isNewZObject: jest.fn( function () {
				return true;
			} ),
			getZObjectTypeById: createGettersWithFunctionsMock(),
			getErrors: createGettersWithFunctionsMock( {} ),
			getCurrentZObjectType: createGettersWithFunctionsMock(),
			getIsZObjectDirty: jest.fn( function () {
				return false;
			} )
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

	afterEach( () => {
		// Clear the element that was added for the Teleported dialog component.
		document.body.outerHTML = '';
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( ZObjectEditor );

		expect( wrapper.find( '#ext-wikilambda-editor' ).exists() ).toBeTruthy();
	} );

	it( 'displays the ZObjectPublish component', function () {
		var wrapper = shallowMount( ZObjectEditor );

		expect( wrapper.findComponent( ZObjectPublish ).exists() ).toBeTruthy();
	} );

	it( 'publish button is disabled when the zobject is not dirty (there are no changes)', function () {
		var wrapper = mount( ZObjectEditor );

		const publishButton = wrapper.get( '.ext-wikilambda-publish-zobject__publish-button' );
		expect( publishButton.attributes( 'disabled' ) ).toBeDefined();
	} );

	it( 'publish button becomes active once the zobject becomes dirty (changes have been made)', function () {
		getters.getIsZObjectDirty = jest.fn( function () {
			return true;
		} );
		global.store.hotUpdate( {
			getters: getters
		} );
		const wrapper = mount( ZObjectEditor );

		const publishButton = wrapper.find( '.ext-wikilambda-publish-zobject__publish-button' );
		expect( publishButton.attributes( 'disabled' ) ).toBeUndefined();
	} );

	it( 'shows the leave editor dialog if the Create Function button, which navigates away from the editor, is clicked before changes are saved',
		async function () {
			getters.getIsZObjectDirty = jest.fn( function () {
				return true;
			} );
			global.store.hotUpdate( {
				getters: getters
			} );
			const wrapper = mount( ZObjectEditor );

			await wrapper.get( '.ext-wikilambda-editor__navigate-to-function-editor' ).trigger( 'click' );
			await wrapper.vm.$nextTick();

			const leaveEditorDialog = wrapper.findComponent( { name: 'cdx-dialog' } );
			expect( leaveEditorDialog ).toBeTruthy();
		} );
} );
