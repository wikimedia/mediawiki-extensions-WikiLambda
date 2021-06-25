var Constants = require( '../Constants.js' ),
	typeUtils = require( './typeUtils.js' ).methods;

var referenceRe = /^Z[0-9]+(K[0-9]+)?$/;

function canonicalizeZ6OrZ9( zobject ) {
	var objectType = zobject[ Constants.Z_OBJECT_TYPE ];

	if ( objectType === Constants.Z_STRING ) {
		var Z6 = zobject[ Constants.Z_STRING_VALUE ];
		if ( !Z6 ) {
			return '';
		} else if ( Z6.match( referenceRe ) ) {
			return zobject;
		}
		return Z6;
	}

	var Z9 = zobject[ Constants.Z_REFERENCE_ID ];
	if ( Z9.match( referenceRe ) ) {
		return Z9;
	}

	return '';
}

function canonicalize( zobject ) {
	function listifyArray( zlist, arr ) {
		var head = zlist[ Constants.Z_LIST_HEAD ],
			tail = zlist[ Constants.Z_LIST_TAIL ];

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
		[ Constants.Z_REFERENCE, Constants.Z_STRING ]
			.indexOf( zobject[ Constants.Z_OBJECT_TYPE ] ) > -1
	) {
		canon = canonicalizeZ6OrZ9( zobject );
	} else if ( zobject[ Constants.Z_OBJECT_TYPE ] &&
		zobject[ Constants.Z_OBJECT_TYPE ][ Constants.Z_REFERENCE_ID ] === Constants.Z_LIST
	) {
		canon = canonicalize( listifyArray( zobject ) );
	} else {
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
				Z1K1: 'Z9',
				Z9K1: zobject
			};
		} else {
			normal = {
				Z1K1: 'Z6',
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
			if ( keys[ i ] === 'Z1K1' && ( zobject.Z1K1 === 'Z6' || zobject.Z1K1 === 'Z9' ) ) {
				normal.Z1K1 = zobject.Z1K1;
				continue;
			}
			if ( keys[ i ] === 'Z6K1' && isString( zobject.Z6K1 ) ) {
				normal.Z6K1 = zobject.Z6K1;
				continue;
			}
			if ( keys[ i ] === 'Z9K1' && isString( zobject.Z9K1 ) ) {
				normal.Z9K1 = zobject.Z9K1;
				continue;
			}
			if ( keys[ i ] === 'Z10K1' && keys.indexOf( 'Z10K2' ) === -1 ) {
				normal.Z10K2 = normalize( [] );
			}
			normal[ keys[ i ] ] = normalize( zobject[ keys[ i ] ] );
		}
	}
	return normal;
}

module.exports = {
	methods: {
		canonicalizeZObject: canonicalize,
		normalizeZObject: normalize
	}
};
