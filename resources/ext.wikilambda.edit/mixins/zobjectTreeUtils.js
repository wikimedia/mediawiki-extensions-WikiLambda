/*!
 * WikiLambda Vue tree manipulation utilities code
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
var Constants = require( '../Constants.js' ),
	typeUtils = require( './typeUtils.js' ).methods,
	normalize = require( './schemata.js' ).methods.normalizeZObject;

module.exports = {
	methods: {
		convertZObjectToTree: function ( zObject, startingKey, startingId, startingParentId ) {

			var zObjectTree = [];

			function tranverseJson( value, key, parentId ) {
				var valueType = typeUtils.getZObjectType( value ),
					currentId = zObjectTree.length,
					type,
					objectKey;

				if ( typeof value === 'string' ) {
					zObjectTree.push( { id: currentId, key: key, value: value, parent: parentId } );
					return;
				}

				switch ( valueType ) {
					case Constants.Z_REFERENCE:
					case Constants.Z_STRING:
						zObjectTree.push( {
							id: currentId,
							key: key,
							value: 'object',
							parent: parentId
						} );
						for ( objectKey in value ) {
							tranverseJson( value[ objectKey ], objectKey, currentId );
						}
						break;
					default:
						type = valueType === Constants.Z_LIST ? 'array' : 'object';
						zObjectTree.push( { id: currentId, key: key, value: type, parent: parentId } );
						for ( objectKey in value ) {
							// We make sure that the current Key does not expect a raw string

							tranverseJson( value[ objectKey ], objectKey, currentId );
						}
						break;
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
			var higherstObejectId = 0;

			if ( !zObject || zObject.length === 0 ) {
				return higherstObejectId;
			}

			zObject.forEach( function ( item ) {
				if ( item.id > higherstObejectId ) {
					higherstObejectId = item.id;
				}
			} );
			return higherstObejectId + 1;
		},
		findLatestKey: function ( zObject, zid ) {
			var nextKey = 0,
				potentialKey = null;
			zObject.forEach( function ( item ) {
				if ( item.value && item.value.match( /^Z([0-9])+K([0-9])+$/g ) ) {
					potentialKey = item.value.replace( zid + 'K', '' );
					if ( potentialKey > nextKey ) {
						nextKey = potentialKey;
					}
				}
			} );
			return parseInt( nextKey, 10 );
		}
	}
};
