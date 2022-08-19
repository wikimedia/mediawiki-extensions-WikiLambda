/*!
 * WikiLambda Vue tree manipulation utilities code
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
var Constants = require( '../Constants.js' ),
	typeUtils = require( './typeUtils.js' ).methods,
	normalize = require( './schemata.js' ).methods.normalizeZObject;

module.exports = exports = {
	methods: {
		convertZObjectToTree: function ( zObject, startingKey, startingId, startingParentId ) {

			var zObjectTree = [];

			function tranverseJson( value, key, parentId ) {
				var valueType = typeUtils.getZObjectType( value ),
					currentId = zObjectTree.length,
					type,
					objectKey;

				// When the node is terminal, push a new row with its final value as 'value'
				if ( typeof value === 'string' ) {
					zObjectTree.push( { id: currentId, key: key, value: value, parent: parentId } );
					return;
				}

				// Else, push a new row with its type (array or object) as 'value'
				type = valueType === Constants.Z_TYPED_LIST ? 'array' : 'object';
				zObjectTree.push( { id: currentId, key: key, value: type, parent: parentId } );

				// And for every child, perform the same operation
				for ( objectKey in value ) {
					tranverseJson( value[ objectKey ], objectKey, currentId );
				}
			}

			if ( startingId !== undefined ) {
				zObjectTree.length = startingId;
			}
			tranverseJson( normalize( zObject ), startingKey, startingParentId );

			if ( startingId !== undefined ) {
				zObjectTree.splice( 0, startingId );
			}
			return zObjectTree;
		},
		convertZObjectTreetoJson: function ( zObjectTree, parentId, rootIsArray ) {
			function reconstructJson( object, layer, isArrayChild ) {
				var json = {},
					value,
					currentElements = object.filter( function ( item ) {
						return item.parent === layer;
					} );

				if ( currentElements.length === 0 && !isArrayChild ) {
					return;
				}

				// if array children, we need to return an array not an object
				if ( isArrayChild ) {
					json = [];
				}

				currentElements.forEach( function ( currentElement ) {
					switch ( currentElement.value ) {
						case 'array':
							value = reconstructJson( object, currentElement.id, true );
							json[ currentElement.key ] = value;
							break;
						case 'object':
							if ( isArrayChild ) {
								json[ currentElement.key ] = reconstructJson( object, currentElement.id );
							} else if ( !currentElement.key ) {
								json = reconstructJson( object, currentElement.id );
							} else {
								json[ currentElement.key ] = reconstructJson( object, currentElement.id );
							}
							break;

						default:
							json[ currentElement.key ] = currentElement.value;
							break;
					}
				} );

				return json;
			}
			return reconstructJson( zObjectTree, parentId, rootIsArray );
		},
		getNextObjectId: function ( zObject ) {
			var highestObjectId = 0;

			if ( !zObject || zObject.length === 0 ) {
				return highestObjectId;
			}

			zObject.forEach( function ( item ) {
				if ( item.id > highestObjectId ) {
					highestObjectId = item.id;
				}
			} );
			return highestObjectId + 1;
		},
		findLatestKey: function ( zObject, zid ) {
			var
				keyRegex = new RegExp( '^' + zid + 'K([0-9]+)$' ),
				latestKey = 0;

			zObject.forEach( function ( item ) {
				var
					potentialKey,
					match = item.value && item.value.match( keyRegex );
				if ( match ) {
					potentialKey = parseInt( match[ 1 ], 10 );
					if ( potentialKey > latestKey ) {
						latestKey = potentialKey;
					}
				}
			} );

			return latestKey;
		}
	}
};
