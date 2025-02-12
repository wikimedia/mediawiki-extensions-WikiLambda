/*!
 * WikiLambda Vue ZObject manipulation utilities. This mixin contains
 * the methods for transforming a ZObject from its JSON representation
 * into a table representation that can be stored in the global state,
 * and back from table to JSON.
 *
 * For more details on the ZObject table read:
 * https://www.mediawiki.org/wiki/Extension:WikiLambda/Frontend_Architecture#ZObject_Table
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
const Constants = require( '../Constants.js' );
const Row = require( '../store/classes/Row.js' );
const canonicalToHybrid = require( './schemata.js' ).methods.canonicalToHybrid;

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
		convertJsonToTable: function (
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
			const childValue = appendToList ? [ zObject ] : zObject;

			// Initial call, if there's a parent, link with key and parent id, else undefined
			flattenZObject(
				canonicalToHybrid( childValue ),
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
		 * Converts the zObject flattened table into a nested object starting
		 * from a given rowId
		 *
		 * @param {Array} zObjectTable array of Row objects
		 * @param {number} parentId starting rowId
		 * @param {boolean} rootIsArray
		 * @return {Object}
		 */
		convertTableToJson: function ( zObjectTable, parentId = 0, rootIsArray = false ) {
			function reconstructJson( table, rowId, isArrayChild ) {
				const rows = table.filter( ( item ) => item.parent === rowId );
				let json = {},
					value;

				if ( rows.length === 0 && !isArrayChild ) {
					return;
				}

				// if array children, we need to return an array not an object
				if ( isArrayChild ) {
					json = [];
				}

				rows.forEach( ( row ) => {
					if ( row.isArray() ) {
						// row is parent of array
						value = reconstructJson( table, row.id, true );
						json[ row.key ] = value;
					} else if ( row.isObject() ) {
						// row is parent of object
						if ( isArrayChild ) {
							json[ row.key ] = reconstructJson( table, row.id );
						} else if ( !row.key ) {
							json = reconstructJson( table, row.id );
						} else {
							json[ row.key ] = reconstructJson( table, row.id );
						}
					} else {
						// row is terminal
						json[ row.key ] = row.value;
					}
				} );

				return json;
			}
			return reconstructJson( zObjectTable, parentId, rootIsArray );
		}
	}
};
