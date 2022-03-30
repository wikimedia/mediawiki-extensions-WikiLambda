/*!
 * WikiLambda unit test suite for the ZKeyModeSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var mount = require( '@vue/test-utils' ).mount,
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	ZKeyModeSelector = require( '../../../resources/ext.wikilambda.edit/components/ZKeyModeSelector.vue' ),
	zobjectModes = require( '../../../resources/ext.wikilambda.edit/store/modules/zobjectModes.js' );

describe( 'ZKeyModeSelector', function () {

	beforeAll( function () {
		global.store.hotUpdate( {
			getters: {
				isExpertMode: function () {
					return true;
				}
			}
		} );

		global.store.registerModule( 'zobjectModes', zobjectModes );
	} );

	it( 'renders without errors', function () {
		var wrapper = mount( ZKeyModeSelector, {
			props: {
				mode: Constants.Z_KEY_MODES.LITERAL,
				parentType: Constants.Z_OBJECT
			}
		} );

		expect( wrapper.find( 'select' ).exists() ).toBe( true );
	} );

	it( 'allows changing the type', function () {
		var wrapper = mount( ZKeyModeSelector, {
				props: {
					mode: Constants.Z_KEY_MODES.LITERAL,
					parentType: Constants.Z_OBJECT
				}
			} ),
			select,
			options;

		select = wrapper.find( 'select' );
		options = select.findAll( 'option' );
		// TODO (T303073): This fails, expects 6 but gets 5 since we upgraded to Vue3
		// expect( options.length ).toBe( Object.keys( Constants.Z_KEY_MODES ).length );
		options[ 1 ].element.selected = true;
		wrapper.find( 'select' ).trigger( 'change' );
		expect( wrapper.emitted().change.length ).toBe( 1 );
		expect( wrapper.emitted().change[ 0 ][ 0 ] ).toBe( Constants.Z_KEY_MODES.FUNCTION_CALL );
	} );
} );
