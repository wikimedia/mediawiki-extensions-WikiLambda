/*!
 * WikiLambda unit test suite for the ZObjectSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' ),
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	{ CdxLookup } = require( '@wikimedia/codex' ),
	mount = require( '@vue/test-utils' ).mount,
	ZObjectSelector = require( '../../../resources/ext.wikilambda.edit/components/ZObjectSelector.vue' );

describe( 'ZObjectSelector', function () {
	var state,
		getters,
		actions,
		lookupMock = jest.fn( function () {
			return [];
		} );
	beforeEach( function () {
		state = {
			objects: {},
			labels: {},
			errors: {}
		};
		getters = {
			getStoredObject: jest.fn( function () {
				return {};
			} ),
			getLabel: jest.fn( () => '' ),
			getLabelData: jest.fn( function () {
				return {};
			} ),
			getZLang: jest.fn( function () {
				return 'en';
			} ),
			getViewMode: jest.fn( function () {
				return false;
			} ),
			getErrors: jest.fn( function () {
				return {};
			} )
		};
		actions = {
			// eslint-disable-next-line no-unused-vars
			fetchZids: jest.fn( function ( context, payload ) {
				return true;
			} ),
			lookupZObject: lookupMock,
			// eslint-disable-next-line no-unused-vars
			setError: jest.fn( function ( context, payload ) {
				return true;
			} )
		};

		global.store.hotUpdate( {
			state: state,
			getters: getters,
			actions: actions
		} );
	} );
	it( 'renders without errors', function () {
		var wrapper = mount( ZObjectSelector );
		expect( wrapper.find( 'div' ).exists() ).toBe( true );
	} );

	it( 'on lookup, sends the the selector type in the payload', function () {
		var wrapper = mount( ZObjectSelector, {
			props: {
				type: Constants.Z_TYPE
			}
		} );

		var lookup = wrapper.getComponent( CdxLookup );
		lookup.vm.$emit( 'input', 'Stri' );
		waitFor( () => expect( lookupMock ).toHaveBeenLastCalledWith(
			expect.anything(),
			{ input: 'Stri', returnType: '', type: Constants.Z_TYPE }
		) );
	} );
} );
