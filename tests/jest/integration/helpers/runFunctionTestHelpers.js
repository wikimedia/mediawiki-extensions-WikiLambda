/*!
 * WikiLambda unit test suite run function page helper.
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
const functionCallResultFromApi = require( '../objects/functionCallResultFromApi.js' );
const { buildUrl } = require( '../../helpers/urlHelpers.js' );
const { mockWindowLocation, restoreWindowLocation } = require( '../../fixtures/location.js' );

const lookupZObjectTypeLabels = new ApiMock(
	apiGetMock.functionLabelsRequest,
	apiGetMock.labelsResponse,
	apiGetMock.labelsMatcher
);

const initializeRootZObject = new ApiMock(
	apiGetMock.loadZObjectsRequest,
	apiGetMock.loadZObjectsResponse,
	apiGetMock.loadZObjectsMatcher
);

const runSetup = function () {
	// Needed because of the Teleported component.
	const el = document.createElement( 'div' );
	el.id = 'ext-wikilambda-app';
	document.body.appendChild( el );

	jest.useFakeTimers().setSystemTime( new Date( '2022-11-09T19:56:53Z' ) );

	// Create a real Pinia store or a testing one
	global.store = createPinia();
	// Configure the Vue test utils to use our store
	vueTestUtils.config.global.plugins = [ global.store ];

	// Set the URL to the run function page
	const url = buildUrl( new window.mw.Title( Constants.PATHS.RUN_FUNCTION_TITLE ).getUrl() );
	mockWindowLocation( url );

	// Set mw.config variables
	global.mw.config.get = mockMWConfigGet( {
		wgWikiLambda: {
			runFunction: true,
			viewmode: false,
			zlang: 'en',
			zlangZid: Constants.Z_NATURAL_LANGUAGE_ENGLISH
		}
	} );

	// Set wiki url encode mock
	mw.internalWikiUrlencode = jest.fn( ( u ) => u );

	// Set function call API mocks
	const apiPostWithFunctionCallMock = jest.fn( () => Promise.resolve( {
		wikilambda_function_call: {
			success: '',
			data: JSON.stringify( functionCallResultFromApi )
		}
	} ) );
	mw.Api = jest.fn( () => ( {
		post: apiPostWithFunctionCallMock,
		get: apiGetMock.createMockApi( [
			lookupZObjectTypeLabels,
			initializeRootZObject
		] )
	} ) );

	return {
		apiPostWithFunctionCallMock: apiPostWithFunctionCallMock
	};
};

const runTeardown = () => {
	restoreWindowLocation();
	document.body.outerHTML = '';
	jest.runOnlyPendingTimers();
	jest.useRealTimers();
};

module.exports = {
	runSetup: runSetup,
	runTeardown: runTeardown
};
