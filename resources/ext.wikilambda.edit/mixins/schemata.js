/**
 * WikiLambda Vue editor: schemata mixin
 * Mixin with functions to canonicalize and normalize ZObjects.
 * This is distinct from the function-schemata as the UI
 * relies of slightly different requirements for normalization.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var Constants = require( '../Constants.js' ),
	typeUtils = require( './typeUtils.js' ).methods;

var referenceRe = /^Z[0-9]+(K[0-9]+)?$/;

function canonicalizeZ6OrZ9( zobject ) {
	var objectType = zobject[ Constants.Z_OBJECT_TYPE ];

	if ( objectType === Constants.Z_STRING ) {
		var Z6 = zobject[ Constants.Z_STRING_VALUE ];
		if ( Z6 && typeof Z6.match === 'function' && Z6.match( referenceRe ) ) {
			return zobject;
		}
		return Z6 || '';
	}

	var Z9 = zobject[ Constants.Z_REFERENCE_ID ];
	if ( Z9 && typeof Z9.match === 'function' && Z9.match( referenceRe ) ) {
		return Z9;
	}

	return '';
}

function filterUndefinedLabels( allLabels ) {
	return allLabels.filter( function ( label ) {
		return label[ Constants.Z_OBJECT_TYPE ] !== Constants.Z_MONOLINGUALSTRING ||
		!!label[ Constants.Z_MONOLINGUALSTRING_VALUE ];
	} );
}

function canonicalize( zobject ) {
	function listifyArray( zlist, arr ) {
		var head = zlist[ Constants.Z_TYPED_OBJECT_ELEMENT_1 ],
			tail = zlist[ Constants.Z_TYPED_OBJECT_ELEMENT_2 ];

		if ( typeof arr === 'undefined' ) {
			arr = [];
		}

		if ( head ) {
			arr.push( canonicalize( head ) );
		}

		if ( tail ) {
			return listifyArray( tail, arr );
		} else {
			return arr;
		}
	}

	var canon = {};

	if ( typeof zobject === 'undefined' ) {
		return undefined;
	} else if ( typeof zobject === 'string' ) {
		canon = zobject;
	} else if ( Array.isArray( zobject ) ) {
		canon = zobject.map( function ( element ) {
			return canonicalize( element );
		} );
	} else if (
		[ Constants.Z_REFERENCE, Constants.Z_STRING ].indexOf( zobject[ Constants.Z_OBJECT_TYPE ] ) > -1
	) {
		canon = canonicalizeZ6OrZ9( zobject );
	} else if ( zobject[ Constants.Z_OBJECT_TYPE ] &&
		zobject[ Constants.Z_OBJECT_TYPE ][ Constants.Z_REFERENCE_ID ] === Constants.Z_TYPED_LIST
	) {
		canon = canonicalize( listifyArray( zobject ) );
	} else {
		// remove any 'undefined' labels
		if ( zobject[ Constants.Z_MULTILINGUALSTRING_VALUE ] ) {
			zobject[ Constants.Z_MULTILINGUALSTRING_VALUE ] = filterUndefinedLabels(
				zobject[ Constants.Z_MULTILINGUALSTRING_VALUE ]
			);
		}

		Object.keys( zobject ).forEach( function ( key ) {
			canon[ key ] = canonicalize( zobject[ key ] );
		} );
	}
	return canon;
}

function isString( s ) {
	return typeof s === 'string' || s instanceof String;
}

function normalize( zobject ) {
	var normal = {},
		keys;

	if ( typeof zobject === 'undefined' ) {
		return undefined;
	} else if ( typeof zobject === 'string' ) {
		if ( typeUtils.getZObjectType( zobject ) === Constants.Z_REFERENCE ) {
			normal = {
				Z1K1: Constants.Z_REFERENCE,
				Z9K1: zobject
			};
		} else {
			normal = {
				Z1K1: Constants.Z_STRING,
				Z6K1: zobject
			};
		}
	} else if ( Array.isArray( zobject ) ) {
		normal = zobject.map( function ( element ) {
			return normalize( element );
		} );
	} else {
		keys = Object.keys( zobject );
		for ( var i = 0; i < keys.length; i++ ) {
			if ( keys[ i ] === Constants.Z_OBJECT_TYPE && (
				zobject.Z1K1 === Constants.Z_STRING || zobject.Z1K1 === Constants.Z_REFERENCE ) ) {
				normal.Z1K1 = zobject.Z1K1;
				continue;
			}
			if ( keys[ i ] === Constants.Z_PERSISTENTOBJECT_ID && isString( zobject.Z2K1 ) ) {
				normal.Z2K1 = {
					Z1K1: Constants.Z_STRING,
					Z6K1: zobject.Z2K1
				};
				continue;
			}
			if ( keys[ i ] === Constants.Z_STRING_VALUE && isString( zobject.Z6K1 ) ) {
				normal.Z6K1 = zobject.Z6K1;
				continue;
			}
			if ( keys[ i ] === Constants.Z_REFERENCE_ID && isString( zobject.Z9K1 ) ) {
				normal.Z9K1 = zobject.Z9K1;
				continue;
			}
			normal[ keys[ i ] ] = normalize( zobject[ keys[ i ] ] );
		}
	}
	return normal;
}

/**
 * Return the ZMap value corresponding to the given key, if present.
 * TODO (T302015) When ZMap keys are extended beyond Z6/Z39, update accordingly
 *
 * @param {Object} zMap a Z883/Typed map, in canonical form
 * @param {Object} key a Z6 or Z39 instance, in canonical form
 * @return {Object|undefined} a Z1/Object, the value of the map entry with the given key,
 * or undefined if there is no such entry
 */
function getValueFromCanonicalZMap( zMap, key ) {
	const K1Array = zMap[ Constants.Z_TYPED_OBJECT_ELEMENT_1 ];
	// Ignore first item in the canonical form array; this is a string representing the type
	for ( let i = 1; i < K1Array.length; i++ ) {
		const entry = K1Array[ i ];
		// To accommodate our current programming practices, we need to allow for either key here:
		const currentKey = entry[ Constants.Z_TYPED_OBJECT_ELEMENT_1 ] || entry[ Constants.Z_TYPED_PAIR_TYPE1 ];
		if ( ( currentKey === key ) ||
			( currentKey[ Constants.Z_OBJECT_TYPE ] === Constants.Z_STRING &&
				key[ Constants.Z_OBJECT_TYPE ] === Constants.Z_STRING &&
				currentKey[ Constants.Z_STRING_VALUE ] === key[ Constants.Z_STRING_VALUE ] ) ||
			( currentKey[ Constants.Z_OBJECT_TYPE ] === Constants.Z_KEY_REFERENCE &&
				key[ Constants.Z_OBJECT_TYPE ] === Constants.Z_KEY_REFERENCE &&
				currentKey[ Constants.Z_KEY_REFERENCE_ID ] === key[ Constants.Z_KEY_REFERENCE_ID ] ) ) {
			// To accommodate our current programming practices, we need to allow for either key here:
			return entry[ Constants.Z_TYPED_OBJECT_ELEMENT_2 ] || entry[ Constants.Z_TYPED_PAIR_TYPE2 ];
		}
	}
}

module.exports = exports = {
	methods: {
		canonicalizeZObject: canonicalize,
		normalizeZObject: normalize,
		getValueFromCanonicalZMap: getValueFromCanonicalZMap
	}
};
