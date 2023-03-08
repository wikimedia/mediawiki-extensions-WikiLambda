/*!
 * WikiLambda unit test suite implementation editor helper.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	ApiMock = require( './apiMock.js' ),
	apiGetMock = require( './apiGetMock.js' ),
	existingFunctionFromApi = require( '../objects/existingFunctionFromApi.js' );

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
			href: '/w/index.php?title=Special:CreateZObject&zid=Z14&Z14K1=' + functionZid
		}
	} );
	const queryParams = {
		title: Constants.PATHS.CREATE_Z_OBJECT_TITLE,
		zid: Constants.Z_IMPLEMENTATION,
		[ Constants.Z_IMPLEMENTATION_FUNCTION ]: functionZid
	};
	window.mw.Uri.mockImplementation( function () {
		return {
			query: queryParams,
			path: new window.mw.Title( Constants.PATHS.CREATE_Z_OBJECT_TITLE ).getUrl( queryParams )
		};
	} );
	global.mw.config.get = ( endpoint ) => {
		switch ( endpoint ) {
			case 'wgWikiLambda':
				return {
					zlangZid: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
					createNewPage: true,
					zId: Constants.Z_IMPLEMENTATION
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
	mw.Api = jest.fn( () => {
		return {
			postWithEditToken: apiPostWithEditTokenMock,
			get: apiGetMock.createMockApi( [
				initializeRootZObject,
				lookupZObjectTypeLabels,
				performTest
			] )
		};
	} );

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
