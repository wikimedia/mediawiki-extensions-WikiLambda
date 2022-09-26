/* eslint-disable no-undef, compat/compat, no-restricted-syntax */
'use strict';

const Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	fs = require( 'fs' ),
	path = require( 'path' ),
	existingFunctionFromApi = require( '../objects/existingFunctionFromApi.js' );

const existingFunctionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];

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

const zObjectApiResponse = ( zids, language ) => {
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

const labelsApiResponse = ( type, search ) => {
	if ( type === Constants.Z_NATURAL_LANGUAGE && 'Chinese'.includes( search ) ) {
		return chineseLabelLookupApiResponse;
	} else if ( type === Constants.Z_NATURAL_LANGUAGE && 'French'.includes( search ) ) {
		return frenchLabelLookupApiResponse;
	} else if ( type === Constants.Z_TYPE && 'String'.includes( search ) ) {
		return stringLabelLookupApiResponse;
	}
};

const searchApiResponse = ( zfunctionId, type ) => {
	if ( zfunctionId === existingFunctionZid ) {
		if ( type === Constants.Z_IMPLEMENTATION ) {
			return { wikilambdafn_search: [] };
		} else if ( type === Constants.Z_TESTER ) {
			return { wikilambdafn_search: [] };
		}
	}
};

const performTestResponse = ( zfunction, zimplementations, ztesters ) => {
	if ( zfunction === JSON.stringify( existingFunctionFromApi ) &&
		zimplementations === '' &&
		ztesters === '' ) {
		return { wikilambda_perform_test: [] };
	}
};

const createResponse = ( args ) => {
	if ( args.list === 'wikilambdaload_zobjects' && args.wikilambdaload_zids ) {
		return zObjectApiResponse( args.wikilambdaload_zids, args.wikilambdaload_language );
	} else if ( args.list === 'wikilambdasearch_labels' &&
				args.wikilambdasearch_type &&
				args.wikilambdasearch_search ) {
		return labelsApiResponse( args.wikilambdasearch_type, args.wikilambdasearch_search );
	} else if ( args.list === 'wikilambdafn_search' &&
				args.wikilambdafn_zfunction_id &&
				args.wikilambdafn_type ) {
		return searchApiResponse( args.wikilambdafn_zfunction_id, args.wikilambdafn_type );
	} else if ( args.action === 'wikilambda_perform_test' &&
				args.wikilambda_perform_test_zfunction ) {
		return performTestResponse(
			args.wikilambda_perform_test_zfunction,
			args.wikilambda_perform_test_zimplementations,
			args.wikilambda_perform_test_ztesters );
	}
};

module.exports = ( args ) => {
	const response = createResponse( args );
	if ( !response ) {
		throw new Error( 'Test does not support API call with args: ' + JSON.stringify( args ) );
	}
	return Promise.resolve( { batchcomplete: '', query: response } );
};
