/* eslint-disable no-undef, compat/compat, no-restricted-syntax */
'use strict';

const Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	fs = require( 'fs' ),
	path = require( 'path' );

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

const zObjectApiResponse = ( args ) => {
	const response = { wikilambdaload_zobjects: {} };
	args.wikilambdaload_zids.split( '|' ).forEach( ( zid ) => {
		const json = fs.readFileSync( path.join(
			__dirname, '../../../../function-schemata/data/definitions/' + zid + '.json' ) );
		if ( !json ) {
			throw new Error( 'Definition not found to emulate API response for ZID: ' + zid );
		}
		response.wikilambdaload_zobjects[ zid ] = {
			success: '',
			data: JSON.parse( json )
		};
	} );
	return response;
};

module.exports = ( args ) => {
	const response = { batchcomplete: '' };
	if ( args.list === 'wikilambdaload_zobjects' && args.wikilambdaload_zids ) {
		response.query = zObjectApiResponse( args );
	} else if ( args.list === 'wikilambdasearch_labels' &&
				args.wikilambdasearch_type === Constants.Z_NATURAL_LANGUAGE &&
				'Chinese'.includes( args.wikilambdasearch_search ) ) {
		response.query = chineseLabelLookupApiResponse;
	} else if ( args.list === 'wikilambdasearch_labels' &&
				args.wikilambdasearch_type === Constants.Z_NATURAL_LANGUAGE &&
				'French'.includes( args.wikilambdasearch_search ) ) {
		response.query = frenchLabelLookupApiResponse;
	} else if ( args.list === 'wikilambdasearch_labels' &&
				args.wikilambdasearch_type === Constants.Z_TYPE &&
				'String'.includes( args.wikilambdasearch_search ) ) {
		response.query = stringLabelLookupApiResponse;
	} else {
		throw new Error( 'Test does not support API call with args: ' + JSON.stringify( args ) );
	}
	return Promise.resolve( response );
};
