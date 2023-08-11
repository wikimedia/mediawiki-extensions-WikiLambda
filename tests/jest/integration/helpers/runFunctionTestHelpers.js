/*!
 * WikiLambda unit test suite run function page helper.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const functionCallResultFromApi = require( '../objects/functionCallResultFromApi.js' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	apiGetMock = require( './apiGetMock.js' ),
	ApiMock = require( './apiMock.js' );

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
	window.mw.Uri = jest.fn( () => {
		return {
			path: new window.mw.Title( Constants.PATHS.RUN_FUNCTION_TITLE ).getUrl(),
			query: {}
		};
	} );

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
		query: {
			wikilambda_function_call: {
				success: '',
				data: JSON.stringify( functionCallResultFromApi )
			}
		}
	} ) );
	mw.Api = jest.fn( () => {
		return {
			post: apiPostWithFunctionCallMock,
			get: apiGetMock.createMockApi( [
				lookupZObjectTypeLabels,
				initializeRootZObject
			] )
		};
	} );

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
