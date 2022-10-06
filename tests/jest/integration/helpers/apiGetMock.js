/* eslint-disable no-undef, compat/compat, no-restricted-syntax */
'use strict';

const Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	fs = require( 'fs' ),
	path = require( 'path' ),
	existingFunctionFromApi = require( '../objects/existingFunctionFromApi.js' );

const existingFunctionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];

function createMockApi( apiMocks ) {
	return ( request ) => {
		var matchedMock = apiMocks.find( function ( mock ) {
			if ( mock.matcher ) {
				return mock.matcher.every( ( field ) => request[ field ] === mock.request[ field ] );
			} else if ( mock.request === request ) {
				return true;
			} else {
				return false;
			}
		} );
		if ( !matchedMock ) {
			throw new Error( 'Test does not support API call with args: ' + JSON.stringify( request ) );
		}
		var response = matchedMock.response;
		return Promise.resolve( { batchcomplete: '', query: response( request ) } );
	};
}

// Builders
const zObjectApiResponseBuilder = ( zids, language ) => {
	const response = { wikilambdaload_zobjects: {} };
	zids.split( '|' ).forEach( ( zid ) => {
		let data;
		if ( zid === existingFunctionZid ) {
			data = existingFunctionFromApi;
		} else {
			const json = fs.readFileSync( path.join(
				__dirname, '../../../../function-schemata/data/definitions/' + zid + '.json' ) );
			if ( !json ) {
				throw new Error( 'Definition not found to emulate API response for ZID: ' + zid );
			}
			data = JSON.parse( json );
		}

		if ( language === 'en' ) {
			// The backend is expected to filter out non-en persistent object labels.
			data[ Constants.Z_PERSISTENTOBJECT_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ] =
				data[ Constants.Z_PERSISTENTOBJECT_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ].filter( ( item ) =>
					!item[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] ||
					item[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] === Constants.Z_NATURAL_LANGUAGE_ENGLISH );
		} else if ( language ) {
			throw new Error( 'Test does not support API call with non-en language' );
		}

		response.wikilambdaload_zobjects[ zid ] = {
			success: '',
			data: data
		};
	} );
	return response;
};

const chineseLabelLookupApiResponse = {
	wikilambdasearch_labels: [
		{
			page_namespace: 0,
			page_title: Constants.Z_NATURAL_LANGUAGE_CHINESE,
			page_type: Constants.Z_NATURAL_LANGUAGE,
			return_type: null,
			label: 'Chinese',
			is_primary: '1',
			page_id: 0,
			page_content_model: 'zobject',
			page_lang: Constants.Z_NATURAL_LANGUAGE_ENGLISH
		},
		{
			page_namespace: 0,
			page_title: Constants.Z_NATURAL_LANGUAGE_CHINESE_TAIWAN,
			page_type: Constants.Z_NATURAL_LANGUAGE,
			return_type: null,
			label: 'Chinese (Taiwan)',
			is_primary: '1',
			page_id: 0,
			page_content_model: 'zobject',
			page_lang: Constants.Z_NATURAL_LANGUAGE_ENGLISH
		}
	]
};

const frenchLabelLookupApiResponse = {
	wikilambdasearch_labels: [
		{
			page_namespace: 0,
			page_title: Constants.Z_NATURAL_LANGUAGE_FRENCH,
			page_type: Constants.Z_NATURAL_LANGUAGE,
			return_type: null,
			label: 'French',
			is_primary: '1',
			page_id: 0,
			page_content_model: 'zobject',
			page_lang: Constants.Z_NATURAL_LANGUAGE_ENGLISH
		},
		{
			page_namespace: 0,
			page_title: Constants.Z_NATURAL_LANGUAGE_CANADIAN_FRENCH,
			page_type: Constants.Z_NATURAL_LANGUAGE,
			return_type: null,
			label: 'Canadian French',
			is_primary: '1',
			page_id: 0,
			page_content_model: 'zobject',
			page_lang: Constants.Z_NATURAL_LANGUAGE_ENGLISH
		}
	]
};

const stringLabelLookupApiResponse = {
	wikilambdasearch_labels: [
		{
			page_namespace: 0,
			page_title: Constants.Z_STRING,
			page_type: Constants.Z_TYPE,
			return_type: null,
			label: 'String',
			is_primary: '1',
			page_id: 0,
			page_content_model: 'zobject',
			page_lang: Constants.Z_NATURAL_LANGUAGE_ENGLISH
		},
		{
			page_namespace: 0,
			page_title: Constants.Z_MONOLINGUALSTRINGSET,
			page_type: Constants.Z_TYPE,
			return_type: null,
			label: 'Monolingual stringset',
			is_primary: '1',
			page_id: 0,
			page_content_model: 'zobject',
			page_lang: Constants.Z_NATURAL_LANGUAGE_ENGLISH
		}
	]
};

const labelsApiResponseBuilder = ( type, search ) => {
	if ( type === Constants.Z_NATURAL_LANGUAGE && 'Chinese'.includes( search ) ) {
		return chineseLabelLookupApiResponse;
	} else if ( type === Constants.Z_NATURAL_LANGUAGE && 'French'.includes( search ) ) {
		return frenchLabelLookupApiResponse;
	} else if ( type === Constants.Z_TYPE && 'String'.includes( search ) ) {
		return stringLabelLookupApiResponse;
	}
};

const searchApiResponseBuilder = ( zfunctionId, type ) => {
	if ( zfunctionId === existingFunctionZid ) {
		if ( type === Constants.Z_IMPLEMENTATION ) {
			return { wikilambdafn_search: [] };
		} else if ( type === Constants.Z_TESTER ) {
			return { wikilambdafn_search: [] };
		}
	}
};
const performTestResponseBuilder = ( zfunction, zimplementations, ztesters ) => {
	if ( zfunction === JSON.stringify( existingFunctionFromApi ) &&
		zimplementations === '' &&
		ztesters === '' ) {
		return { wikilambda_perform_test: [] };
	}
};

// Requests
const languageLabelsRequest = {
	action: 'query',
	list: 'wikilambdasearch_labels',
	wikilambdasearch_type: Constants.Z_NATURAL_LANGUAGE
};
const typeLabelsRequest = {
	action: 'query',
	list: 'wikilambdasearch_labels',
	wikilambdasearch_type: Constants.Z_TYPE
};
const loadZObjectsRequest = {
	action: 'query',
	list: 'wikilambdaload_zobjects'
};
const fetchZImplementationsRequest = {
	action: 'query',
	list: 'wikilambdafn_search',
	wikilambdafn_zfunction_id: existingFunctionZid,
	wikilambdafn_type: Constants.Z_IMPLEMENTATION
};
const fetchZTestersRequest = {
	action: 'query',
	list: 'wikilambdafn_search',
	wikilambdafn_zfunction_id: existingFunctionZid,
	wikilambdafn_type: Constants.Z_TESTER
};
const performTestRequest = {
	action: 'wikilambda_perform_test'
};

// Matchers
const labelsMatcher = [ 'action', 'list', 'wikilambdasearch_type' ];
const loadZObjectsMatcher = [ 'action', 'list' ];
const zObjectSearchMatcher = [ 'action', 'list', 'wikilambdafn_zfunction_id', 'wikilambdafn_type' ];
const performTestMatcher = [ 'action' ];

// Responses
const labelsResponse = ( request ) =>
	labelsApiResponseBuilder( request.wikilambdasearch_type, request.wikilambdasearch_search );
const loadZObjectsResponse = ( request ) =>
	zObjectApiResponseBuilder( request.wikilambdaload_zids, request.wikilambdaload_language );
const zObjectSearchResponse = ( request ) =>
	searchApiResponseBuilder( request.wikilambdafn_zfunction_id, request.wikilambdafn_type );
const performTestResponse = ( request ) =>
	performTestResponseBuilder( request.wikilambda_perform_test_zfunction,
		request.wikilambda_perform_test_zimplementations,
		request.wikilambda_perform_test_ztesters );

module.exports = exports = {
	createMockApi,
	labelsMatcher,
	labelsResponse,
	typeLabelsRequest,
	languageLabelsRequest,
	loadZObjectsMatcher,
	loadZObjectsResponse,
	loadZObjectsRequest,
	fetchZImplementationsRequest,
	fetchZTestersRequest,
	zObjectSearchMatcher,
	zObjectSearchResponse,
	performTestRequest,
	performTestResponse,
	performTestMatcher
};
