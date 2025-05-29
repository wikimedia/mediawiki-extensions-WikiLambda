/*!
 * WikiLambda unit test suite function viewer helper.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

// const { render } = require( '@testing-library/vue' );
const { createPinia } = require( 'pinia' );
const vueTestUtils = require( '@vue/test-utils' );

const ApiMock = require( './apiMock.js' );
const apiGetMock = require( './apiGetMock.js' );
const mockMWConfigGet = require( './mwConfigMock.js' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const wikidataMock = require( './wikidataMock.js' );
const { buildUrl } = require( '../../helpers/urlHelpers.js' );
const { mockWindowLocation, restoreWindowLocation } = require( '../../fixtures/location.js' );

const initializeRootZObject =
	new ApiMock( apiGetMock.loadZObjectsRequest, apiGetMock.loadZObjectsResponse, apiGetMock.loadZObjectsMatcher );
const lookupZObjectTypeLabels =
	new ApiMock( apiGetMock.typeLabelsDefaultView, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const lookupZObjectFunctionLabels =
	new ApiMock( apiGetMock.functionLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );

const runSetup = function () {
	// Remove or comment out this line:
	jest.useFakeTimers();

	// Create a real Pinia store or a testing one
	global.store = createPinia();
	// Configure the Vue test utils to use our store
	vueTestUtils.config.global.plugins = [ global.store ];

	const queryParams = {
		title: Constants.PATHS.CREATE_OBJECT_TITLE
	};

	// Set the URL to the create object page with the necessary query parameters
	const url = buildUrl( new window.mw.Title( Constants.PATHS.CREATE_OBJECT_TITLE ).getUrl( queryParams ) );
	mockWindowLocation( url );

	global.mw.config.get = mockMWConfigGet( {
		wgWikiLambda: {
			createNewPage: true,
			viewmode: false,
			zlang: 'en',
			zlangZid: Constants.Z_NATURAL_LANGUAGE_ENGLISH
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
			lookupZObjectFunctionLabels
		] )
	} ) );

	// Mock fetch for Wikidata APIs
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	global.fetch = jest.fn( ( u ) => {
		if ( u.includes( 'wikidata.org' ) ) {
			return wikidataMock( u );
		}
	} );

	// Mock #firstHeading for tests that expect it
	const heading = document.createElement( 'h1' );
	heading.id = 'firstHeading';
	document.body.appendChild( heading );

	return {
		apiPostWithEditTokenMock: apiPostWithEditTokenMock
	};

};

const runTeardown = function () {
	restoreWindowLocation();
	// Remove or comment out these lines:
	jest.runOnlyPendingTimers();
	jest.useRealTimers();
	// Clean up the mocked fetch API
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	global.fetch.mockClear();

	// Clean up #firstHeading after each test
	const heading = document.getElementById( 'firstHeading' );
	if ( heading ) {
		heading.remove();
	}
};

module.exports = {
	runSetup: runSetup,
	runTeardown: runTeardown
};
