/*!
 * WikiLambda unit test suite for the FunctionViewerAbout component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	Constants = require( '../../../../../resources/ext.wikilambda.edit/Constants.js' ),
	FunctionViewerAbout = require( '../../../../../resources/ext.wikilambda.edit/components/function/viewer/FunctionViewerAbout.vue' );

describe( 'FunctionViewerAbout', function () {
	var getters;
	var actions;

	const otherId = 1;
	const multilingualStringValueId = 2;
	const multiLingualStringsetId = 3;
	const monolingualStringsetId = 4;
	const zFunctionTestersId = 5;
	const zFunctionTesterId = 6;

	beforeEach( function () {
		getters = {
			getUserZlangZID: jest.fn().mockReturnValue( Constants.Z_NATURAL_LANGUAGE_ENGLISH ),
			getNestedZObjectById: createGettersWithFunctionsMock( { id: otherId } ),
			getAllItemsFromListById: createGettersWithFunctionsMock( [] )
		};

		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( FunctionViewerAbout );

		expect( wrapper.find( '.ext-wikilambda-function-about' ).exists() ).toBeTruthy();
	} );

	it( 'does not display the sidebar if there are no aliases or names', async function () {
		var wrapper = shallowMount( FunctionViewerAbout );

		await wrapper.vm.$nextTick();
		expect( wrapper.find( '.ext-wikilambda-function-about__sidebar' ).exists() ).toBeFalsy();
	} );

	it( 'displays the sidebar if there are names in an additional language', async function () {
		getters.getNestedZObjectById = () => ( id, keys ) => {
			if ( id === 0 &&
				keys[ 0 ] === Constants.Z_PERSISTENTOBJECT_LABEL &&
				keys[ 1 ] === Constants.Z_MULTILINGUALSTRING_VALUE ) {
				return { id: multilingualStringValueId };
			} else if ( id === monolingualStringsetId && keys.length === 2 &&
				keys[ 0 ] === Constants.Z_MONOLINGUALSTRING_LANGUAGE &&
				keys[ 1 ] === Constants.Z_REFERENCE_ID ) {
				return { value: Constants.Z_NATURAL_LANGUAGE_AFRIKAANS };
			} else if ( id === monolingualStringsetId && keys.length === 2 &&
				keys[ 0 ] === Constants.Z_MONOLINGUALSTRING_VALUE &&
				keys[ 1 ] === Constants.Z_STRING_VALUE ) {
				return { value: 'Afrikaans name' };
			} else {
				return { id: otherId };
			}
		};

		getters.getAllItemsFromListById = () => ( id ) => {
			if ( id === multilingualStringValueId ) {
				return [ { id: monolingualStringsetId, key: '1', value: 'object' } ];
			} else {
				return [];
			}
		};

		global.store.hotUpdate( {
			getters: getters
		} );

		var wrapper = shallowMount( FunctionViewerAbout );

		expect( wrapper.find( '.ext-wikilambda-function-about__sidebar' ).exists() ).toBeTruthy();
	} );

	it( 'displays the sidebar if there are aliases', async function () {
		getters.getNestedZObjectById = () => ( id, keys ) => {
			if ( keys[ 0 ] === Constants.Z_PERSISTENTOBJECT_ALIASES &&
				keys[ 1 ] === Constants.Z_MULTILINGUALSTRINGSET_VALUE ) {
				return { id: multiLingualStringsetId };
			} else {
				return { id: otherId };
			}
		};
		getters.getAllItemsFromListById = () => ( id ) => {
			if ( id === multiLingualStringsetId ) {
				return [ { id: monolingualStringsetId, key: '1', value: 'object', parent: otherId } ];
			} else {
				return [];
			}
		};

		global.store.hotUpdate( {
			getters: getters
		} );

		var wrapper = shallowMount( FunctionViewerAbout );

		expect( wrapper.find( '.ext-wikilambda-function-about__sidebar' ).exists() ).toBeTruthy();
	} );

	// TODO(T320274): Update this test for showing the sidebar once tester examples table fixed and reimplemented.
	it( 'does not display the sidebar for tester examples as the table is hidden', async function () {
		getters.getNestedZObjectById = () => ( id, keys ) => {
			if ( keys[ 0 ] === Constants.Z_PERSISTENTOBJECT_VALUE &&
				keys[ 1 ] === Constants.Z_FUNCTION_TESTERS ) {
				return { id: zFunctionTestersId };
			} else {
				return { id: otherId };
			}
		};
		getters.getAllItemsFromListById = () => ( id ) => {
			if ( id === zFunctionTestersId ) {
				return [ { id: zFunctionTesterId, key: '1', value: 'object', parent: otherId } ];
			} else {
				return [];
			}
		};

		global.store.hotUpdate( {
			getters: getters
		} );

		var wrapper = shallowMount( FunctionViewerAbout );

		expect( wrapper.find( '.ext-wikilambda-function-about__sidebar' ).exists() ).toBeFalsy();
	} );
} );
