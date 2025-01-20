/*!
 * WikiLambda unit test suite function viewer helper.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { render } = require( '@testing-library/vue' ),
	App = require( '../../../../resources/ext.wikilambda.app/components/App.vue' ),
	Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' ),
	apiGetMock = require( './apiGetMock.js' ),
	ApiMock = require( './apiMock.js' ),
	existingFunctionFromApi = require( '../objects/existingFunctionFromApi.js' );
const { createPinia } = require( 'pinia' );
const vueTestUtils = require( '@vue/test-utils' );

const initializeRootZObject =
	new ApiMock( apiGetMock.loadZObjectsRequest, apiGetMock.loadZObjectsResponse, apiGetMock.loadZObjectsMatcher );
const fetchZImplementations =
	new ApiMock( apiGetMock.fetchZImplementationsRequest,
		apiGetMock.zObjectSearchResponse, apiGetMock.zObjectSearchMatcher );
const fetchZTesters =
	new ApiMock( apiGetMock.fetchZTestersRequest, apiGetMock.zObjectSearchResponse, apiGetMock.zObjectSearchMatcher );
const performTest =
	new ApiMock( apiGetMock.performTestRequest, apiGetMock.performTestResponse, apiGetMock.actionMatcher );

const functionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];

const runSetup = function () {
	jest.useFakeTimers();

	Object.defineProperty( window, 'location', {
		value: {
			href: 'currentPage'
		}
	} );

	// Create a real Pinia store or a testing one
	global.store = createPinia();
	// Configure the Vue test utils to use our store
	vueTestUtils.config.global.plugins = [ global.store ];

	const apiPostWithEditTokenMock = jest.fn( () => Promise.resolve( {
		wikilambda_edit: {
			page: 'newPage'
		}
	} ) );
	mw.Api = jest.fn( () => ( {
		postWithEditToken: apiPostWithEditTokenMock,
		get: apiGetMock.createMockApi( [
			initializeRootZObject,
			fetchZImplementations,
			fetchZTesters,
			performTest
		] )
	} ) );

	window.mw.Uri.mockImplementation( () => ( {
		path: '/wiki/' + functionZid,
		query: {
			zid: Constants.Z_FUNCTION
		}
	} ) );

	global.mw.config.get = ( endpoint ) => {
		switch ( endpoint ) {
			case 'wgWikiLambda':
				return {
					createNewPage: false,
					viewmode: true,
					zId: functionZid,
					zlang: 'en',
					zlangZid: Constants.Z_NATURAL_LANGUAGE_ENGLISH
				};
			case 'wgExtensionAssetsPath':
				return '/w/extensions';
			default:
				return {};
		}
	};

	return {
		apiPostWithEditTokenMock: apiPostWithEditTokenMock
	};
};

const runTeardown = () => {
	jest.runOnlyPendingTimers();
	jest.useRealTimers();
};

// By default, `render` mounts the app on a <div> element which is a child of document.body. For some reason
// this causes CdxTabs to throw an error when a new tab is navigated to on the functon viewer page. To avoid this,
// we pass `render` a parentless <div> to mount on.
//
// TODO (T370509): fix the error ' [Vue warn]: App already provides property with key "store". It will be overwritten with the new value.
// because we already have a store in the global object in jest.config.js
const renderForFunctionViewer = () => render(
	App,
	{ container: document.createElement( 'div' ) }
);

module.exports = {
	runSetup: runSetup,
	runTeardown: runTeardown,
	renderForFunctionViewer: renderForFunctionViewer
};
