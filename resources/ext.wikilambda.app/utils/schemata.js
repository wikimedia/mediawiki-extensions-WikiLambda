/**
 * WikiLambda Vue editor: schemata utilities
 * Util with functions to convert zobjects between hybrid and canonical forms.
 * Thsse conversions are distinct from canonicalize and normalize of function-schemata; hybrid form
 * meets slightly different representational requirements of the UI layer.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../Constants.js' );
const { isTruthyOrEqual, getZObjectType } = require( './typeUtils.js' );

// Note: This is intentionally "wrong" in that it allows for Z0.
// It excludes letters so as not to apply to keys (containing a 'K').
const referenceRe = /^Z0*[1-9]*\d*$/;
const errorTypeReferenceRe = /^Z5\d{2}$/;

const schemataUtils = {
	/**
	 * Transform a ZObject from hybrid form to canonical form.  In hybrid form, strings and references are in normal
	 * form, but lists are in canonical form. If called on a ZObject already in canonical form, returns the ZObject
	 * unchanged.
	 *
	 * This also handles lists in normal form; this is done defensively,
	 * because the orchestrator can still return normal
	 * form sometimes (T354917). Normal forms are not handled as thoroughly as function-schemata's canonicalize.
	 *
	 * @param {Object | Array | string | undefined} zobject
	 * @return {Object | Array | string | undefined}
	 */
	hybridToCanonical: function ( zobject ) {
		function canonicalizeZ6OrZ9( targetZObject ) {
			const objectType = targetZObject[ Constants.Z_OBJECT_TYPE ];

			if ( objectType === Constants.Z_STRING ) {
				const Z6 = targetZObject[ Constants.Z_STRING_VALUE ];
				if ( Z6 && typeof Z6.match === 'function' && Z6.match( referenceRe ) ) {
					return targetZObject;
				}
				return Z6 || '';
			}

			const Z9 = targetZObject[ Constants.Z_REFERENCE_ID ];
			if ( Z9 && typeof Z9.match === 'function' && Z9.match( referenceRe ) ) {
				return Z9;
			}

			return '';
		}

		// Given a typed list in normal form, convert its elements to canonical and return them in an array
		// (while ignoring its Z1K1)
		function zlistToArray( zlist, arr ) {
			const head = zlist[ Constants.Z_TYPED_OBJECT_ELEMENT_1 ],
				tail = zlist[ Constants.Z_TYPED_OBJECT_ELEMENT_2 ];

			if ( typeof arr === 'undefined' ) {
				arr = [];
			}

			if ( head ) {
				arr.push( schemataUtils.hybridToCanonical( head ) );
			}

			if ( tail ) {
				return zlistToArray( tail, arr );
			} else {
				return arr;
			}
		}

		let canon = {};

		if ( typeof zobject === 'undefined' ) {
			return undefined;
		} else if ( typeof zobject === 'string' ) {
			canon = zobject;
		} else if ( Array.isArray( zobject ) ) {
			canon = zobject.map( ( element ) => schemataUtils.hybridToCanonical( element ) );
		} else if (
			[ Constants.Z_REFERENCE, Constants.Z_STRING ].includes( zobject[ Constants.Z_OBJECT_TYPE ] )
		) {
			canon = canonicalizeZ6OrZ9( zobject );
		} else if (
			// Allow for typed lists in normal form, where the list's Z_OBJECT_TYPE is a function call.
			// See also the header comments for this function.
			isTruthyOrEqual( zobject, [
				Constants.Z_OBJECT_TYPE,
				Constants.Z_FUNCTION_CALL_FUNCTION,
				Constants.Z_REFERENCE_ID
			], Constants.Z_TYPED_LIST )
		) {
			const itemType = zobject[ Constants.Z_OBJECT_TYPE ][ Constants.Z_TYPED_LIST_TYPE ];
			canon = [
				schemataUtils.hybridToCanonical( itemType ),
				...schemataUtils.hybridToCanonical( zlistToArray( zobject ) )
			];
		} else if ( zobject[ Constants.Z_OBJECT_TYPE ] &&
			// Accommodate both hybrid form and canonical
			( zobject[ Constants.Z_OBJECT_TYPE ][ Constants.Z_REFERENCE_ID ] === Constants.Z_QUOTE ||
				zobject[ Constants.Z_OBJECT_TYPE ] === Constants.Z_QUOTE )
		) {
			canon[ Constants.Z_OBJECT_TYPE ] = Constants.Z_QUOTE;
			canon[ Constants.Z_QUOTE_VALUE ] = zobject[ Constants.Z_QUOTE_VALUE ];
		} else {
			Object.keys( zobject ).forEach( ( key ) => {
				canon[ key ] = schemataUtils.hybridToCanonical( zobject[ key ] );
			} );
		}
		return canon;
	},

	isString: function ( s ) {
		return typeof s === 'string' || s instanceof String;
	},

	isZid: function ( k ) {
		return k.match( /^Z[1-9]\d*$/ ) !== null;
	},

	/**
	 * Transform a ZObject from canonical form to hybrid form.  In hybrid form, strings and references are in normal
	 * form, but lists remain in canonical form. If called on a ZObject already in hybrid form, returns the ZObject
	 * unchanged.
	 *
	 * @param {Object | Array | string} zobject
	 * @return {Object|Array|undefined}
	 */
	canonicalToHybrid: function ( zobject ) {
		let hybrid = {},
			keys;

		if ( typeof zobject === 'undefined' ) {
			return undefined;
		} else if ( typeof zobject === 'string' ) {
			if ( getZObjectType( zobject ) === Constants.Z_REFERENCE ) {
				hybrid = {
					Z1K1: Constants.Z_REFERENCE,
					Z9K1: zobject
				};
			} else {
				hybrid = {
					Z1K1: Constants.Z_STRING,
					Z6K1: zobject
				};
			}
		} else if ( Array.isArray( zobject ) ) {
			hybrid = zobject.map( ( element ) => schemataUtils.canonicalToHybrid( element ) );
		} else if ( zobject[ Constants.Z_OBJECT_TYPE ] &&
			// Accommodate both hybrid form and canonical
			( zobject[ Constants.Z_OBJECT_TYPE ][ Constants.Z_REFERENCE_ID ] === Constants.Z_QUOTE ||
				zobject[ Constants.Z_OBJECT_TYPE ] === Constants.Z_QUOTE )
		) {
			const normalType = {
				Z1K1: Constants.Z_REFERENCE,
				Z9K1: Constants.Z_QUOTE
			};
			hybrid[ Constants.Z_OBJECT_TYPE ] = normalType;
			hybrid[ Constants.Z_QUOTE_VALUE ] = zobject[ Constants.Z_QUOTE_VALUE ];
		} else {
			keys = Object.keys( zobject );
			for ( let i = 0; i < keys.length; i++ ) {
				if ( keys[ i ] === Constants.Z_OBJECT_TYPE && (
					zobject.Z1K1 === Constants.Z_STRING || zobject.Z1K1 === Constants.Z_REFERENCE ) ) {
					hybrid.Z1K1 = zobject.Z1K1;
					continue;
				}
				if ( keys[ i ] === Constants.Z_PERSISTENTOBJECT_ID && schemataUtils.isString( zobject.Z2K1 ) ) {
					hybrid.Z2K1 = {
						Z1K1: Constants.Z_STRING,
						Z6K1: zobject.Z2K1
					};
					continue;
				}
				if ( keys[ i ] === Constants.Z_STRING_VALUE && schemataUtils.isString( zobject.Z6K1 ) ) {
					hybrid.Z6K1 = zobject.Z6K1;
					continue;
				}
				if ( keys[ i ] === Constants.Z_REFERENCE_ID && schemataUtils.isString( zobject.Z9K1 ) ) {
					hybrid.Z9K1 = zobject.Z9K1;
					continue;
				}
				hybrid[ keys[ i ] ] = schemataUtils.canonicalToHybrid( zobject[ keys[ i ] ] );
			}
		}
		return hybrid;
	},

	/**
	 * Return the ZMap value corresponding to the given key, if present.
	 * TODO (T302015) When ZMap keys are extended beyond Z6/Z39, update accordingly
	 *
	 * @param {Object} zMap a Z883/Typed map, in canonical form
	 * @param {Object} key a Z6 or Z39 instance, in canonical form
	 * @return {Object|undefined} a Z1/Object, the value of the map entry with the given key,
	 * or undefined if there is no such entry
	 */
	getValueFromCanonicalZMap: function ( zMap, key ) {
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
	},

	/**
	 * Finds all of the ZIDs appearing in an arbitrary ZObject.
	 *
	 * @param {Object|string} zobject a Z1/Object
	 * @param {boolean} returnKeys if set to true, return both matching Zids and matching Keys
	 * @return {Set} Set of (string) ZIDs
	 */
	extractZIDs: function ( zobject, returnKeys = false ) {
		const str = JSON.stringify( zobject );
		const regexp = /(Z[1-9]\d*)(K[1-9]\d*)?/g;
		const matches = [ ...str.matchAll( regexp ) ];
		const allMatches = returnKeys ?
			matches.map( ( groups ) => groups[ 0 ] ) :
			matches.map( ( groups ) => groups[ 1 ] );
		const uniqueMatches = [ ...new Set( allMatches ) ];
		// sort so that keys are returned before zids
		return uniqueMatches.sort( ( a, b ) => ( a.includes( 'K' ) ? ( b.includes( 'K' ) ? 0 : -1 ) : 1 ) );
	},

	// These error types have no keys whose values contain nested error content.  If a error type ZID
	// appears here, extractErrorStructure will not search through any children of a zobject of that type.
	errorTypesNotToTraverse: new Set( [ 'Z501', 'Z505', 'Z508', 'Z511', 'Z512', 'Z513', 'Z516',
		'Z531', 'Z532', 'Z533', 'Z534', 'Z535', 'Z536', 'Z537', 'Z542', 'Z547', 'Z548', 'Z551', 'Z553' ] ),

	/**
	 * Traverses a ZObject to find all the suberrors.  (A suberror is a zobject
	 * whose type is an instance of Z50/'Error type'). Example:
	 *   { Z1K1: 'Z500', Z500K1: 'Could not find argument Z811K1' }
	 * For each suberror found, the result includes a JS object with properties
	 * 'errorType', 'children', and (optionally) 'explanation'.  Example:
	 *   { errorType: 'Z500', explanation: 'Could not find argument Z811K1', children: [] }
	 *
	 * The 'children', if any, are additional suberrors found within the nested ZObjects of
	 * this suberror.
	 *
	 * zobject is normally a Z5 in the top level call, but doesn't have to be.
	 *
	 * @param {Object} zobject
	 * @return {Array} of objects
	 */
	extractErrorStructure: function ( zobject ) {

		/**
		 * Checks if a given zobject is a suberror (a zobject whose type is an instance of Z50/'Error type').
		 * If so, returns a JS object with keys errorType and (optionally) explanation.  If not, returns null.
		 *
		 * The 'explanation' is an explanatory string for this suberror.
		 * Such strings are expected for Z500, but are also generated in the orchestrator for
		 * some other error types. In addition to explanatory strings, a few other useful keys
		 * with string values will show up here, e.g. Z503K1/'feature name' and Z504K1/ZID.
		 *
		 * Allows for the more relaxed Z5/Error format from the orchestrator, in which the suberror's
		 * type appears directly as the value of Z1K1/type, and also the stricter format, in which
		 * it appears in a function call to Z885/'Errortype to type'.  Z885K1 is the 'errortype' key of Z885.
		 *
		 * @param {Object} targetZObject
		 * @return {Array|undefined} of objects
		 */
		function checkIfSuberror( targetZObject ) {
			if (
				typeof targetZObject === 'object' && targetZObject.Z1K1 &&
				typeof targetZObject.Z1K1 === 'string' && targetZObject.Z1K1.match( errorTypeReferenceRe )
			) {
				// Handle the relaxed Z5/Error format from the orchestrator
				const suberror = {};
				suberror.errorType = targetZObject.Z1K1;
				const stringKey = suberror.errorType + 'K1';
				const k1String = targetZObject[ stringKey ];
				if ( k1String && schemataUtils.isString( k1String ) && !schemataUtils.isZid( k1String ) ) {
					suberror.explanation = k1String;
				}
				return suberror;
			} else if (
				typeof targetZObject === 'object' && targetZObject.Z1K1 && typeof targetZObject.Z1K1 === 'object' &&
				targetZObject.Z1K1.Z885K1 && typeof targetZObject.Z1K1.Z885K1 === 'string' &&
				targetZObject.Z1K1.Z885K1.match( errorTypeReferenceRe )
			) {
				const suberror = {};
				suberror.errorType = targetZObject.Z1K1.Z885K1;
				const stringKey = 'K1';
				const k1String = targetZObject[ stringKey ];
				if ( k1String && schemataUtils.isString( k1String ) && !schemataUtils.isZid( k1String ) ) {
					suberror.explanation = k1String;
				}
				return suberror;
			}
			return undefined;
		}

		const subError = checkIfSuberror( zobject );
		if ( subError ) {
			if ( subError.explanation ) {
				// In this special case, there won't be any nested suberrors; look no further
				subError.children = [];
			} else if ( schemataUtils.errorTypesNotToTraverse.has( subError.errorType ) ) {
				// Also in this case, there won't be any nested suberrors; look no further
				subError.children = [];
			} else {
				subError.children = schemataUtils.extractNestedSuberrors( zobject, subError.errorType );
			}
			return [ subError ];
		}
		return schemataUtils.extractNestedSuberrors( zobject, null );
	},

	errorKeysToTraverse: new Map( [
		[ 'Z502', new Set( [ 'Z502K2', 'K2' ] ) ], // Not wellformed, [value]
		[ 'Z506', new Set( [ 'Z506K4', 'K4' ] ) ], // Argument type mismatch, [propagated error]
		[ 'Z507', new Set( [ 'Z507K2', 'K2' ] ) ], // Error in evaluation, [propagated error]
		[ 'Z517', new Set( [ 'Z517K4', 'K4' ] ) ], // Return type mismatch, [propagated error]
		[ 'Z518', new Set( [ 'Z518K3', 'K3' ] ) ] // Object type mismatch, [propagated error]
	] ),

	extractNestedSuberrors: function ( zobject, errorType ) {
		const nested = [];
		if ( zobject !== null && typeof zobject === 'object' ) {
			const keysToTraverse = schemataUtils.errorKeysToTraverse.get( errorType );
			Object.entries( zobject ).forEach( ( [ key, value ] ) => {
				// We've already looked inside Z1K1/type; no need to look again
				if ( key !== Constants.Z_OBJECT_TYPE &&
					( keysToTraverse === undefined || keysToTraverse.has( key ) ) ) {
					nested.push( ...schemataUtils.extractErrorStructure( value ) );
				}
			} );
		}
		return nested;
	}
};

module.exports = schemataUtils;
