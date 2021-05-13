/*!
 * WikiLambda unit test suite for the App component and related files.
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	App = require( '../../../resources/ext.wikilambda.edit/components/App.vue' ),
	ZObjectEditor = require( '../../../resources/ext.wikilambda.edit/components/ZObjectEditor.vue' ),
	ZObjectViewer = require( '../../../resources/ext.wikilambda.edit/components/ZObjectViewer.vue' );

describe( 'App.vue', function () {
	it( 'Renders nothing when the viewmode is not returned from mw.config', function () {
		var wrapper;
		mw.config.get = jest.fn( function () {
			return {
				viewmode: null
			};
		} );

		wrapper = shallowMount( App );

		expect( wrapper.findComponent( ZObjectEditor ).exists() ).toBe( false );
		expect( wrapper.findComponent( ZObjectViewer ).exists() ).toBe( false );
	} );

	it( 'Renders z-object-editor when viewmode === false', function () {
		var wrapper;
		mw.config.get = jest.fn( function () {
			return {
				viewmode: false
			};
		} );

		wrapper = shallowMount( App );

		expect( wrapper.findComponent( ZObjectEditor ).exists() ).toBe( true );
	} );

	it( 'Renders z-object-viewer when viewmode === true', function () {
		var wrapper;
		mw.config.get = jest.fn( function () {
			return {
				viewmode: true
			};
		} );

		wrapper = shallowMount( App );

		expect( wrapper.findComponent( ZObjectViewer ).exists() ).toBe( true );
	} );
} );
