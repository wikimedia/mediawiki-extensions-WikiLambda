/*!
 * WikiLambda Vue tree manipulation utilities code
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
var Constants = require( '../Constants.js' ),
	typeUtils = require( './typeUtils.js' ).methods,
	Row = require( '../store/classes/Row.js' ),
	normalize = require( './schemata.js' ).methods.normalizeZObject;

module.exports = exports = {
	methods: {
		/**
		 * Convert a ZObject represented as a JS object into a flat array of
		 * rows, where each row represents a key-value. Every row has an ID,
		 * a key, a value and the row ID of its parent. Depending on the input
		 * parameters, the generated array of rows will be adapted to pend from
		 * a given parent row, or will be the whole ZObject to represent as the
		 * global state.
		 *
		 * @param {Object} zObject
		 * @param {Object} parentRow the row object from which the resulting object will pend
		 * @param {number} startingRowId the first available rowID in the global state table
		 * @param {boolean} appendToList whether to append item into parent list
		 * @param {number} appendFromIndex in the case of lists, specify the index from which
		 *        to append items, else will start from 0
		 * @param {boolean} returnParent whether to return the parent row in the row array
		 * @return {Array}
		 */
		convertZObjectToRows: function (
			zObject, parentRow, startingRowId, appendToList = false, appendFromIndex = 0, returnParent = true ) {

			// Raise an exception if parentRow is set and nextAvailableId is not to avoid overwriting IDs
			if ( parentRow && !startingRowId ) {
				throw new Error( 'The parameter startingRowId must be set when inserting a ZObject under a parentRow' );
			}

			// Raise an exception if appendToList is set and parentRow is not
			if ( !parentRow && appendToList ) {
				throw new Error( 'It is only possible to append to list when inserting a ZObject under a parentRow' );
			}

			const zObjectRows = [];
			let nextAvailableId = startingRowId || 0;

			function flattenZObject( value, key, parentRowId, isExistingParent = false, startingIndex = 0 ) {
				if ( typeof value === 'string' ) {
					// ROW IS TERMINAL
					// Push a new row with its final value as 'value'
					zObjectRows.push( new Row( nextAvailableId, key, value, parentRowId ) );
					nextAvailableId++;
				} else {
					// ROW IS NOT TERMINAL
					// Push a non-terminal row with value set to either array or object
					// We don't push the parent if it's already a row in the zObjectTable
					let rowId;
					const type = Array.isArray( value ) ? Constants.ROW_VALUE_ARRAY : Constants.ROW_VALUE_OBJECT;

					if ( isExistingParent ) {
						// We are inserting the already existing parent with its own id,
						// key and parent; the only thing that may change is the value.
						// The calling method will have to decide whether to insert it or replace it.
						rowId = parentRow.id;
						zObjectRows.push( new Row( rowId, key, type, parentRow.parent ) );
					} else {
						rowId = nextAvailableId;
						zObjectRows.push( new Row( rowId, key, type, parentRowId ) );
						nextAvailableId++;
					}

					// And for every child, recurse with current rowId as parentRowId
					for ( const objectKey in value ) {
						const rowKey = ( type === Constants.ROW_VALUE_ARRAY ) ?
							String( parseInt( objectKey ) + startingIndex ) :
							objectKey;
						flattenZObject( value[ objectKey ], rowKey, rowId );
					}
				}
			}

			// If we are to append the value to a parent list, wrap value in Array
			const childValue = appendToList ?
				Array.isArray( zObject ) ? zObject : [ zObject ] :
				zObject;

			// Initial call, if there's a parent, link with key and parent id, else undefined
			flattenZObject(
				normalize( childValue ),
				parentRow ? parentRow.key : undefined,
				parentRow ? parentRow.id : undefined,
				!!parentRow,
				appendFromIndex
			);

			if ( !returnParent ) {
				zObjectRows.shift();
			}

			return zObjectRows;
		},

		/**
		 * @param {Object} zObject
		 * @param {string} startingKey the row object from which the resulting object will pend
		 * @param {number} startingId the first available rowID in the global state table
		 * @param {number} startingParentId the first available rowID in the global state table
		 * @return {Array}
		 *
		 * TODO: Deprecate in favor of convertZObjectToRows
		 */
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

		/**
		 * Converts the zObject flattened table into a nested object starting
		 * from a given rowId
		 *
		 * @param {Array} zObjectTree array of Row objects
		 * @param {number} parentId starting rowId
		 * @param {boolean} rootIsArray
		 * @return {Object}
		 */
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
			if ( !zObject || zObject.length === 0 ) {
				return 0;
			}

			const highestObjectId = Math.max(
				...zObject.map( ( item ) => item.id )
			);
			return highestObjectId + 1;
		},
		findLatestKey: function ( zObject, zid ) {
			const keyRegex = new RegExp( '^' + zid + 'K([0-9]+)$' );
			const defaultKey = 0;

			return Math.max(
				defaultKey,
				...zObject.map( function ( item ) {
					const match = item.value && item.value.match( keyRegex );
					return match ? parseInt( match[ 1 ], 10 ) : -1;
				} )
			);
		}
	}
};
