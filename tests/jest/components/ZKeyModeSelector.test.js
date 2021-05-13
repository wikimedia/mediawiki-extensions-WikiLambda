/*!
 * WikiLambda unit test suite for the ZKeyModeSelector component and related files.
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var mount = require( '@vue/test-utils' ).mount,
	createLocalVue = require( '@vue/test-utils' ).createLocalVue,
	Vuex = require( 'vuex' ),
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	ZKeyModeSelector = require( '../../../resources/ext.wikilambda.edit/components/ZKeyModeSelector.vue' ),
	zobjectModes = require( '../../../resources/ext.wikilambda.edit/store/modules/zobjectModes.js' ),
	localVue;

localVue = createLocalVue();
localVue.use( Vuex );

describe( 'ZKeyModeSelector', function () {
	var store;

	beforeAll( function () {
		store = new Vuex.Store( {
			modules: {
				zobjectModes: zobjectModes
			}
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = mount( ZKeyModeSelector, {
			propsData: {
				mode: Constants.Z_KEY_MODES.LITERAL,
				parentType: 'Z1'
			},
			store: store,
			localVue: localVue,
			mocks: {
				$i18n: jest.fn()
			}
		} );

		expect( wrapper.find( 'select' ).exists() ).toBe( true );
	} );

	it( 'allows changing the type', function () {
		var wrapper = mount( ZKeyModeSelector, {
				propsData: {
					mode: Constants.Z_KEY_MODES.LITERAL,
					parentType: 'Z1'
				},
				store: store,
				localVue: localVue,
				mocks: {
					$i18n: jest.fn()
				}
			} ),
			select,
			options;

		select = wrapper.find( 'select' );
		options = select.findAll( 'option' );
		expect( select.find( 'option' ).length ).toBe( Constants.Z_KEY_MODES.length );
		options.at( 1 ).element.selected = true;
		wrapper.find( 'select' ).trigger( 'change' );
		expect( wrapper.emitted().change.length ).toBe( 1 );
		expect( wrapper.emitted().change[ 0 ][ 0 ] ).toBe( Constants.Z_KEY_MODES.FUNCTION_CALL );
	} );
} );
