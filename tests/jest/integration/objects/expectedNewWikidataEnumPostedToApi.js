/*!
 * WikiLambda integration test expected API posted object for a nnew Wikidata enum
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );

const wikidataEnumZObject = function ( wikidataType, entityIds ) {
	return {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_PERSISTENTOBJECT,
		[ Constants.Z_PERSISTENTOBJECT_ID ]: {
			[ Constants.Z_OBJECT_TYPE ]: Constants.Z_STRING,
			[ Constants.Z_STRING_VALUE ]: Constants.NEW_ZID_PLACEHOLDER
		},
		[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
			[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
			[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_WIKIDATA_ENUM,
			[ Constants.Z_WIKIDATA_ENUM_TYPE ]: wikidataType,
			[ Constants.Z_WIKIDATA_ENUM_KEYS ]: [
				wikidataType,
				...entityIds.map( ( id ) => ( {
					[ Constants.Z_OBJECT_TYPE ]: wikidataType,
					[ `${ wikidataType }K1` ]: id
				} ) )
			],
			[ Constants.Z_WIKIDATA_ENUM_IDENTITY ]: Constants.NEW_ZID_PLACEHOLDER
		},
		[ Constants.Z_PERSISTENTOBJECT_LABEL ]: {
			[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
			[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [ Constants.Z_MONOLINGUALSTRING ]
		},
		[ Constants.Z_PERSISTENTOBJECT_ALIASES ]: {
			[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRINGSET,
			[ Constants.Z_MULTILINGUALSTRINGSET_VALUE ]: [ Constants.Z_MONOLINGUALSTRINGSET ]
		},
		[ Constants.Z_PERSISTENTOBJECT_DESCRIPTION ]: {
			[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
			[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [ Constants.Z_MONOLINGUALSTRING ]
		}
	};
};

module.exports = { wikidataEnumZObject };
