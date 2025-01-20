/*!
 * WikiLambda unit test suite test viewer helper.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' ),
	apiGetMock = require( './apiGetMock.js' ),
	ApiMock = require( './apiMock.js' ),
	existingFunctionFromApi = require( '../objects/existingFunctionFromApi.js' );
const { createPinia } = require( 'pinia' );
const vueTestUtils = require( '@vue/test-utils' );

const initializeRootZObject =
	new ApiMock( apiGetMock.loadZObjectsRequest, apiGetMock.loadZObjectsResponse, apiGetMock.loadZObjectsMatcher );
const lookupZObjectTypeLabels =
	new ApiMock( apiGetMock.functionLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const performTest =
	new ApiMock( apiGetMock.performTestRequest, apiGetMock.performTestResponse, apiGetMock.actionMatcher );
const functionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];

const runSetup = function () {
	jest.useFakeTimers();

	Object.defineProperty( window, 'location', {
		value: {
			href: '/w/index.php?title=Special:CreateObject&zid=Z20&Z20K1=' + functionZid
		}
	} );

	// Create a real Pinia store or a testing one
	global.store = createPinia();
	// Configure the Vue test utils to use our store
	vueTestUtils.config.global.plugins = [ global.store ];

	const queryParams = {
		title: Constants.PATHS.CREATE_OBJECT_TITLE,
		zid: Constants.Z_TESTER,
		[ Constants.Z_TESTER_FUNCTION ]: functionZid
	};
	window.mw.Uri = jest.fn( () => ( {
		query: queryParams,
		path: new window.mw.Title( Constants.PATHS.CREATE_OBJECT_TITLE ).getUrl( queryParams )
	} ) );

	global.mw.config.get = ( endpoint ) => {
		switch ( endpoint ) {
			case 'wgWikiLambda':
				return {
					viewmode: false,
					createNewPage: true,
					zlangZid: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
					zlang: 'en',
					zId: Constants.Z_TESTER
				};
			case 'wgExtensionAssetsPath':
				return '/w/extensions';
			default:
				return {};
		}
	};

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
};

module.exports = {
	runSetup: runSetup,
	runTeardown: runTeardown
};
