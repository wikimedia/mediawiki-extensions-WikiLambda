/*!
 * WikiLambda Row class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );

/**
 * Row class represents one table entry or row in the ZObject
 * flat table representation in the store. The root zobject being
 * viewed or altered is flattened into a table on initialization
 * and represented as an array of Row objects.
 *
 * @class
 * @property {number} id Numerical unique row identifier;
 * @property {string} key String value of the key that identifies this node, string
 *     value of the numerical index if this row represents a list item;
 * @property {string} value String value if the node is terminal or type of value
 *     this node is the parent of if not terminal;
 * @property {number} parentId The row identifier of this row's parent
 */
class Row {
	constructor( id, key, value, parent ) {
		this.id = id;
		this.key = key;
		this.parent = parent;
		this.value = value;
	}

	/**
	 * Returns whether the row represents a terminal node.
	 *
	 * @return {boolean}
	 */
	isTerminal() {
		return ( ( typeof this.value === 'string' ) &&
			( this.value !== Constants.ROW_VALUE_OBJECT ) &&
			( this.value !== Constants.ROW_VALUE_ARRAY ) );
	}

	/**
	 * Returns whether the row represents the parent node
	 * of an array.
	 *
	 * @return {boolean}
	 */
	isArray() {
		return ( this.value === Constants.ROW_VALUE_ARRAY );
	}

	/**
	 * Returns whether the row represents the parent node
	 * of an object.
	 *
	 * @return {boolean}
	 */
	isObject() {
		return ( this.value === Constants.ROW_VALUE_OBJECT );
	}
}

module.exports = exports = Row;
