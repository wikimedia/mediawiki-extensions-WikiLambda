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
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const functionCallResultFromApi = require( '../objects/functionCallResultFromApi.js' );

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

	// Set page url and mw.Uri mock
	Object.defineProperty( window, 'location', {
		value: {
			href: 'currentPage'
		}
	} );

	// Create a real Pinia store or a testing one
	global.store = createPinia();
	// Configure the Vue test utils to use our store
	vueTestUtils.config.global.plugins = [ global.store ];

	window.mw.Uri = jest.fn( () => ( {
		path: new window.mw.Title( Constants.PATHS.RUN_FUNCTION_TITLE ).getUrl(),
		query: {}
	} ) );

	// Set mw.config variables
	global.mw.config.get = jest.fn( ( endpoint ) => {
		switch ( endpoint ) {
			case 'wgWikiLambda':
				return {
					runFunction: true,
					viewmode: false,
					zlang: 'en',
					zlangZid: Constants.Z_NATURAL_LANGUAGE_ENGLISH
				};
			default:
				return {};
		}
	} );

	// Set wiki url encode mock
	mw.internalWikiUrlencode = jest.fn( ( url ) => url );

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
	document.body.outerHTML = '';
	jest.runOnlyPendingTimers();
	jest.useRealTimers();
};

module.exports = {
	runSetup: runSetup,
	runTeardown: runTeardown
};
