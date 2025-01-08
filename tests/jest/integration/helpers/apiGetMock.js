/*!
 * WikiLambda unit test suite mock Api helper.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' ),
	fs = require( 'fs' ),
	path = require( 'path' ),
	existingFunctionFromApi = require( '../objects/existingFunctionFromApi.js' ),
	existingImplementationInCodeFromApi = require( '../objects/existingImplementationInCodeFromApi.js' ),
	existingImplementationByCompositionFromApi = require( '../objects/existingImplementationByCompositionFromApi.js' ),
	existingTesterFromApi = require( '../objects/existingTesterFromApi.js' );

const existingFunctionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];
const existingImplementationInCodeZid =
	existingImplementationInCodeFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];
const existingImplementationByCompositionZid =
	existingImplementationByCompositionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];

function createMockApi( apiMocks ) {
	return ( request ) => {
		const matchedMock = apiMocks.find( ( mock ) => {
			if ( mock.matcher ) {
				return mock.matcher( mock.request, request );
			} else if ( mock.request === request ) {
				return true;
			} else {
				return false;
			}
		} );
		if ( !matchedMock ) {
			throw new Error( 'Test does not support API call with args: ' + JSON.stringify( request ) );
		}
		const response = matchedMock.response;
		return Promise.resolve( { batchcomplete: '', query: response( request ) } );
	};
}

const zObjectResponses = {
	[ existingFunctionZid ]: existingFunctionFromApi,
	[ existingImplementationInCodeZid ]: existingImplementationInCodeFromApi,
	[ existingImplementationByCompositionZid ]: existingImplementationByCompositionFromApi,
	[ existingTesterFromApi.successTesterZid ]:
		existingTesterFromApi.testerZObject( existingTesterFromApi.successTesterZid ),
	[ existingTesterFromApi.failedTesterZid ]:
		existingTesterFromApi.testerZObject( existingTesterFromApi.failedTesterZid )
};

// Builders
const zObjectApiResponseBuilder = ( zids, language ) => {
	const response = { wikilambdaload_zobjects: {} };
	zids.split( '|' ).forEach( ( zid ) => {
		let data;
		if ( zObjectResponses[ zid ] ) {
			data = zObjectResponses[ zid ];
		} else {
			// eslint-disable-next-line security/detect-non-literal-fs-filename
			const json = fs.readFileSync( path.join(
				__dirname, '../../../../function-schemata/data/definitions/' + zid + '.json' ) );
			if ( !json ) {
				throw new Error( 'Definition not found to emulate API response for ZID: ' + zid );
			}
			data = JSON.parse( json );
		}

		if ( language === 'en' ) {
			// The backend is expected to only return English persistent object label, or the first label if
			// English not present.
			const labels =
				data[ Constants.Z_PERSISTENTOBJECT_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ].slice( 1 );
			let labelToReturn = labels.find( ( item ) => item[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] === Constants.Z_NATURAL_LANGUAGE_ENGLISH );
			if ( !labelToReturn ) {
				labelToReturn = labels[ 0 ];
			}
			data[ Constants.Z_PERSISTENTOBJECT_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ] =
				[ Constants.Z_MONOLINGUALSTRING ].concat( labelToReturn ? [ labelToReturn ] : [] );
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
			page_id: 0,
			page_namespace: 0,
			page_content_model: 'zobject',
			page_title: 'Z1006',
			page_type: 'Z60',
			return_type: null,
			match_label: 'Chinese',
			match_is_primary: '1',
			match_rate: 1,
			label: 'Chinese',
			type_label: ''
		},
		{
			page_id: 0,
			page_namespace: 0,
			page_content_model: 'zobject',
			page_title: 'Z1107',
			page_type: 'Z60',
			return_type: null,
			match_label: 'Chinese (Taiwan)',
			match_is_primary: '1',
			match_rate: 0.4375,
			label: 'Chinese (Taiwan)',
			type_label: ''
		}
	]
};

const frenchLabelLookupApiResponse = {
	wikilambdasearch_labels: [
		{
			page_id: 0,
			page_namespace: 0,
			page_content_model: 'zobject',
			page_title: 'Z1004',
			page_type: 'Z60',
			return_type: null,
			match_label: 'French',
			match_is_primary: '1',
			match_lang: 'Z1002',
			match_rate: 0.8333333333333334,
			label: 'French',
			type_label: ''
		},
		{
			page_id: 0,
			page_namespace: 0,
			page_content_model: 'zobject',
			page_title: 'Z1640',
			page_type: 'Z60',
			return_type: null,
			match_label: 'Canadian French',
			match_is_primary: '1',
			match_lang: 'Z1002',
			match_rate: 0.3333333333333333,
			label: 'Canadian French',
			type_label: ''
		}
	]
};

const genericTypesLookupApiResponse = {
	wikilambdasearch_labels: [
		{
			page_id: 0,
			page_namespace: 0,
			page_content_model: 'zobject',
			page_title: 'Z883',
			page_type: 'Z8',
			return_type: 'Z4',
			match_label: 'Typed Map',
			match_is_primary: '1',
			match_lang: 'Z1002',
			match_rate: 0.3333333333333333,
			label: 'Typed Map',
			type_label: ''
		},
		{
			page_id: 0,
			page_namespace: 0,
			page_content_model: 'zobject',
			page_title: 'Z881',
			page_type: 'Z8',
			return_type: 'Z4',
			match_label: 'Typed list',
			match_is_primary: '1',
			match_lang: 'Z1002',
			match_rate: 0.3,
			label: 'Typed list',
			type_label: ''
		},
		{
			page_id: 0,
			page_namespace: 0,
			page_content_model: 'zobject',
			page_title: 'Z882',
			page_type: 'Z8',
			return_type: 'Z4',
			match_label: 'Typed pair',
			match_is_primary: '1',
			match_lang: 'Z1002',
			match_rate: 0.3,
			label: 'Typed pair',
			type_label: ''
		}
	]
};

const stringLabelLookupApiResponse = {
	wikilambdasearch_labels: [
		{
			page_id: 0,
			page_namespace: 0,
			page_content_model: 'zobject',
			page_title: 'Z6',
			page_type: 'Z4',
			return_type: null,
			match_label: 'String',
			match_is_primary: '1',
			match_lang: 'Z1002',
			match_rate: 1,
			label: 'String',
			type_label: ''
		},
		{
			page_id: 0,
			page_namespace: 0,
			page_content_model: 'zobject',
			page_title: 'Z31',
			page_type: 'Z4',
			return_type: null,
			match_label: 'Monolingual stringset',
			match_is_primary: '1',
			match_lang: 'Z1002',
			match_rate: 0.09523809523809523,
			label: 'Monolingual stringset',
			type_label: ''
		}
	]
};

const stringEqualityLabelLookupApiResponse = {
	wikilambdasearch_labels: [
		{
			page_id: 0,
			page_namespace: 0,
			page_content_model: 'zobject',
			page_title: 'Z866',
			page_type: 'Z8',
			return_type: 'Z40',
			match_label: 'String equality',
			match_is_primary: '1',
			match_lang: 'Z1002',
			match_rate: 0.4666666666666667,
			label: 'String equality',
			type_label: ''
		},
		{
			page_id: 0,
			page_namespace: 0,
			page_content_model: 'zobject',
			page_title: 'Z844',
			page_type: 'Z8',
			return_type: 'Z40',
			match_label: 'Boolean equality',
			match_is_primary: '1',
			match_lang: 'Z1002',
			match_rate: 0.4,
			label: 'Boolean equality',
			type_label: ''
		}
	]
};

const functionLabelLookupApiResponse = {
	wikilambdasearch_labels: [
		{
			page_id: 0,
			page_namespace: 0,
			page_content_model: 'zobject',
			page_title: existingFunctionZid,
			page_type: 'Z8',
			return_type: 'Z40',
			match_label: 'function name, in Chinese',
			match_is_primary: '1',
			match_lang: 'Z1002',
			match_rate: 1,
			label: 'function name, in Chinese',
			type_label: ''
		},
		{
			page_id: 0,
			page_namespace: 0,
			page_content_model: 'zobject',
			page_title: 'Z801',
			page_type: 'Z8',
			return_type: 'Z40',
			match_label: 'another function name, in Chinese',
			match_is_primary: '0.4',
			match_lang: 'Z1002',
			match_rate: 1,
			label: 'another function name, in Chinese',
			type_label: ''
		}
	]
};

const associatedImplementationsSearchResponse = {
	wikilambdafn_search: [
		{ page_namespace: 0,
			zid: existingImplementationByCompositionZid
		},
		{ page_namespace: 0,
			zid: existingImplementationInCodeZid
		}
	]
};

const associatedTestersSearchResponse = {
	wikilambdafn_search: [
		{ page_namespace: 0,
			zid: existingTesterFromApi.successTesterZid
		},
		{ page_namespace: 0,
			zid: existingTesterFromApi.failedTesterZid
		}
	]
};

const performTestResponseResults = ( zFunctionId, zimplementationIds, ztesterId, isSuccess ) => {
	const testResults = [];
	zimplementationIds.split( '|' ).forEach( ( zimplementation ) => {
		const validateStatus = isSuccess ? Constants.Z_BOOLEAN_TRUE : Constants.Z_BOOLEAN_FALSE;
		testResults.push( {
			zFunctionId: zFunctionId,
			zImplementationId: zimplementation,
			zTesterId: ztesterId,
			testMetadata: JSON.stringify( {} ),
			validateStatus: `"${ validateStatus }"`
		} );
	} );
	return testResults;
};

const labelsApiResponseBuilder = ( type, search ) => {
	if ( type === Constants.Z_NATURAL_LANGUAGE && 'Chinese'.includes( search ) ) {
		return chineseLabelLookupApiResponse;
	} else if ( type === Constants.Z_NATURAL_LANGUAGE && 'French'.includes( search ) ) {
		return frenchLabelLookupApiResponse;
	} else if ( type === Constants.Z_TYPE && 'String'.includes( search ) ) {
		return stringLabelLookupApiResponse;
	} else if ( type === Constants.Z_TYPE && 'Typed'.includes( search ) ) {
		return genericTypesLookupApiResponse;
	} else if ( type === Constants.Z_FUNCTION && 'String equality'.includes( search ) ) {
		return stringEqualityLabelLookupApiResponse;
	} else if ( type === Constants.Z_FUNCTION && 'function name, in Chinese'.includes( search ) ) {
		return functionLabelLookupApiResponse;
	}
};

const searchApiResponseBuilder = ( zfunctionId, type ) => {
	if ( zfunctionId === existingFunctionZid ) {
		if ( type === Constants.Z_IMPLEMENTATION ) {
			return associatedImplementationsSearchResponse;
		} else if ( type === Constants.Z_TESTER ) {
			return associatedTestersSearchResponse;
		}
	}
};

function isRequestMatchingZFunction( requestZfunction, zfunction ) {
	const zfunctionId = zfunction[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];
	return requestZfunction === zfunctionId ||
		requestZfunction === JSON.stringify( zfunction ) ||
		JSON.parse( requestZfunction )[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ] === zfunctionId;
}

const performTestResponseBuilder = ( zfunction, zimplementations, ztesters ) => {
	if ( isRequestMatchingZFunction( zfunction, existingFunctionFromApi ) ) {
		const zFunctionId = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];
		let successTestResults = [];
		let failedTestResults = [];
		ztesters.split( '|' ).forEach( ( ztester ) => {
			let jsonTester;
			try {
				jsonTester = JSON.parse( ztester );
			} catch ( e ) {}
			if ( ztester === existingTesterFromApi.successTesterZid ) {
				successTestResults = [ ...successTestResults,
					...performTestResponseResults( zFunctionId, zimplementations, ztester, true ) ];
			} else if ( ztester === existingTesterFromApi.failedTesterZid || jsonTester ) {
				failedTestResults = [ ...failedTestResults,
					...performTestResponseResults( zFunctionId, zimplementations, ztester, false ) ];
			} else {
				throw new Error( 'Success or failure response not found for ztester: ' + ztester );
			}
		} );
		return {
			wikilambda_perform_test: [ ...successTestResults, ...failedTestResults ]
		};
	} else {
		throw new Error( 'Test does not support PerformTest response for zfunction: ' + zfunction );
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
const functionLabelsRequest = {
	action: 'query',
	list: 'wikilambdasearch_labels',
	wikilambdasearch_type: Constants.Z_FUNCTION
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
const basicFieldMatcher =
	( expectedRequest, actualRequest, fields ) => fields.every( ( field ) => expectedRequest[ field ] === actualRequest[ field ] );
const labelsMatcher = ( expectedRequest, actualRequest ) => basicFieldMatcher( expectedRequest, actualRequest, [ 'action', 'list', 'wikilambdasearch_type' ] );
const loadZObjectsMatcher = ( expectedRequest, actualRequest ) => basicFieldMatcher( expectedRequest, actualRequest, [ 'action', 'list' ] );
const zObjectSearchMatcher = ( expectedRequest, actualRequest ) => basicFieldMatcher( expectedRequest, actualRequest, [ 'action', 'list', 'wikilambdafn_zfunction_id', 'wikilambdafn_type' ] );
const actionMatcher = ( expectedRequest, actualRequest ) => basicFieldMatcher( expectedRequest, actualRequest, [ 'action' ] );

// Responses
const labelsResponse = ( request ) => labelsApiResponseBuilder( request.wikilambdasearch_type, request.wikilambdasearch_search );
const loadZObjectsResponse = ( request ) => zObjectApiResponseBuilder( request.wikilambdaload_zids, request.wikilambdaload_language );
const zObjectSearchResponse = ( request ) => searchApiResponseBuilder( request.wikilambdafn_zfunction_id, request.wikilambdafn_type );
const performTestResponse = ( request ) => performTestResponseBuilder( request.wikilambda_perform_test_zfunction,
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
	actionMatcher,
	functionLabelsRequest
};
