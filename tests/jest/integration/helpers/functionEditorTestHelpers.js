/*!
 * WikiLambda unit test suite function editor helper.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' ),
	apiGetMock = require( './apiGetMock.js' ),
	ApiMock = require( './apiMock.js' );

const lookupZObjectTypeLabels = new ApiMock(
	apiGetMock.typeLabelsRequest,
	apiGetMock.labelsResponse,
	apiGetMock.labelsMatcher
);
const lookupZObjectLanguageLabels = new ApiMock(
	apiGetMock.languageLabelsRequest,
	apiGetMock.labelsResponse,
	apiGetMock.labelsMatcher
);
const initializeRootZObject = new ApiMock(
	apiGetMock.loadZObjectsRequest,
	apiGetMock.loadZObjectsResponse,
	apiGetMock.loadZObjectsMatcher
);
const fetchZImplementations = new ApiMock(
	apiGetMock.fetchZImplementationsRequest,
	apiGetMock.zObjectSearchResponse,
	apiGetMock.zObjectSearchMatcher
);
const fetchZTesters = new ApiMock(
	apiGetMock.fetchZTestersRequest,
	apiGetMock.zObjectSearchResponse,
	apiGetMock.zObjectSearchMatcher
);
const performTest = new ApiMock(
	apiGetMock.performTestRequest,
	apiGetMock.performTestResponse,
	apiGetMock.performTestMatcher
);

const runSetup = function ( pageConfig ) {
	// Needed because of the Teleported component.
	const el = document.createElement( 'div' );
	el.id = 'ext-wikilambda-app';
	document.body.appendChild( el );

	jest.useFakeTimers();

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

	mw.Api = jest.fn( () => ( {
		postWithEditToken: apiPostWithEditTokenMock,
		get: apiGetMock.createMockApi( [
			lookupZObjectLanguageLabels,
			lookupZObjectTypeLabels,
			initializeRootZObject,
			fetchZImplementations,
			fetchZTesters,
			performTest
		] )
	} ) );

	window.mw.Uri = jest.fn( () => ( {
		query: pageConfig.queryParams,
		path: new window.mw.Title( pageConfig.title ).getUrl( pageConfig.queryParams )
	} ) );

	global.mw.config.get = ( endpoint ) => {
		switch ( endpoint ) {
			case 'wgWikiLambda':
				return {
					createNewPage: pageConfig.createNewPage,
					viemode: false,
					zlang: 'en',
					zlangZid: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
					zId: pageConfig.createNewPage ? 'Z0' : pageConfig.title
				};
			default:
				return {};
		}
	};

	return {
		apiPostWithEditTokenMock: apiPostWithEditTokenMock
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
