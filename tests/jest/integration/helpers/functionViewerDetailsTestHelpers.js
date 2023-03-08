/*!
 * WikiLambda unit test suite function viewer helper.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { render } = require( '@testing-library/vue' ),
	store = require( '../../../../resources/ext.wikilambda.edit/store/index.js' ),
	App = require( '../../../../resources/ext.wikilambda.edit/components/App.vue' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	apiGetMock = require( './apiGetMock.js' ),
	ApiMock = require( './apiMock.js' ),
	existingFunctionFromApi = require( '../objects/existingFunctionFromApi.js' );

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

	global.window = Object.create( window );
	Object.defineProperty( window, 'location', {
		value: {
			href: 'currentPage'
		}
	} );

	const apiPostWithEditTokenMock = jest.fn( () => Promise.resolve( {
		wikilambda_edit: {
			page: 'newPage'
		}
	} ) );
	mw.Api = jest.fn( () => {
		return {
			postWithEditToken: apiPostWithEditTokenMock,
			get: apiGetMock.createMockApi( [
				initializeRootZObject,
				fetchZImplementations,
				fetchZTesters,
				performTest ] )
		};
	} );

	window.mw.Uri.mockImplementation( () => {
		return {
			path: '/wiki/' + functionZid,
			query: {
				zid: Constants.Z_FUNCTION
			}
		};
	} );
	global.mw.config.get = ( endpoint ) => {
		switch ( endpoint ) {
			case 'wgWikiLambda':
				return {
					zlangZid: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
					zId: functionZid
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

const renderForFunctionViewer = () =>
	// By default, `render` mounts the app on a <div> element which is a child of document.body. For some reason
	// this causes CdxTabs to throw an error when a new tab is navigated to on the functon viewer page. To avoid this,
	// we pass `render` a parentless <div> to mount on.
	render( App, { container: document.createElement( 'div' ), global: { plugins: [ store ] } } );

module.exports = {
	runSetup: runSetup,
	runTeardown: runTeardown,
	renderForFunctionViewer: renderForFunctionViewer
};
