/* eslint-disable no-undef, compat/compat, no-restricted-syntax */
'use strict';

const mount = require( '@vue/test-utils' ).mount,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	store = require( '../../../../resources/ext.wikilambda.edit/store/index.js' ),
	App = require( '../../../../resources/ext.wikilambda.edit/components/App.vue' ),
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
	new ApiMock( apiGetMock.performTestRequest, apiGetMock.performTestResponse, apiGetMock.performTestMatcher );

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

	const wrapper = mount( App, { global: { plugins: [ store ] } } );

	return {
		wrapper: wrapper,
		apiPostWithEditTokenMock: apiPostWithEditTokenMock
	};
};

module.exports = {
	runSetup: runSetup
};
