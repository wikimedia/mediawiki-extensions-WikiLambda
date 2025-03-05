/*!
 * WikiLambda unit test suite helper to set the store.zobject initial data.
 *
 * E.g. The following method transforms the given object into a table that can
 * be directly assigned to the store.zobject state variable:
 *
 * store.zobject = zobjectToRows( {
 *   Z1K1: "Z11",
 *   Z11K1: "Z1002",
 *   Z11K2: "example object"
 * } );
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { convertJsonToTable } = require( '../../../resources/ext.wikilambda.app/utils/zobjectUtils.js' );
const Row = require( '../../../resources/ext.wikilambda.app/store/classes/Row.js' );

const tableDataToRowObjects = function ( tableData ) {
	return tableData.map( ( rowData ) => new Row(
		rowData.id,
		rowData.key,
		rowData.value,
		rowData.parent
	) );
};

const zobjectToRows = function ( zobject ) {
	return convertJsonToTable( zobject );
};

module.exports = {
	tableDataToRowObjects,
	zobjectToRows
};
