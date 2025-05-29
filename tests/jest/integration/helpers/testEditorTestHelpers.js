/*!
 * WikiLambda unit test suite test viewer helper.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { createPinia } = require( 'pinia' );
const vueTestUtils = require( '@vue/test-utils' );

const ApiMock = require( './apiMock.js' );
const apiGetMock = require( './apiGetMock.js' );
const mockMWConfigGet = require( './mwConfigMock.js' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const existingFunctionFromApi = require( '../objects/existingFunctionFromApi.js' );
const { buildUrl } = require( '../../helpers/urlHelpers.js' );
const { mockWindowLocation, restoreWindowLocation } = require( '../../fixtures/location.js' );

const initializeRootZObject =
	new ApiMock( apiGetMock.loadZObjectsRequest, apiGetMock.loadZObjectsResponse, apiGetMock.loadZObjectsMatcher );
const lookupZObjectTypeLabels =
	new ApiMock( apiGetMock.functionLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const performTest =
	new ApiMock( apiGetMock.performTestRequest, apiGetMock.performTestResponse, apiGetMock.actionMatcher );
const functionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];

const runSetup = function () {
	jest.useFakeTimers();

	// Create a real Pinia store or a testing one
	global.store = createPinia();
	// Configure the Vue test utils to use our store
	vueTestUtils.config.global.plugins = [ global.store ];

	const queryParams = {
		title: Constants.PATHS.CREATE_OBJECT_TITLE,
		zid: Constants.Z_TESTER,
		[ Constants.Z_TESTER_FUNCTION ]: functionZid
	};

	const url = buildUrl( new window.mw.Title( Constants.PATHS.CREATE_OBJECT_TITLE ).getUrl( queryParams ) );
	mockWindowLocation( url );

	global.mw.config.get = mockMWConfigGet( {
		wgWikiLambda: {
			viewmode: false,
			createNewPage: true,
			zlangZid: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
			zlang: 'en',
			zId: Constants.Z_TESTER
		}
	} );

	const apiPostWithEditTokenMock = jest.fn( () => Promise.resolve( {
		wikilambda_edit: {
			page: 'newPage'
		}
	} ) );

	mw.Api = jest.fn( () => ( {
		postWithEditToken: apiPostWithEditTokenMock,
		get: apiGetMock.createMockApi( [
			initializeRootZObject,
			lookupZObjectTypeLabels,
			performTest
		] )
	} ) );

	return {
		apiPostWithEditTokenMock: apiPostWithEditTokenMock
	};
};

const runTeardown = () => {
	jest.runOnlyPendingTimers();
	jest.useRealTimers();
	restoreWindowLocation();
};

module.exports = {
	runSetup: runSetup,
	runTeardown: runTeardown
};
