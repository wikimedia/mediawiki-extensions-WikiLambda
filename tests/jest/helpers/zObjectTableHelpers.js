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
const Row = require( '../../../resources/ext.wikilambda.edit/store/classes/Row.js' ),
	zobjectUtils = require( '../../../resources/ext.wikilambda.edit/mixins/zobjectUtils.js' ).methods;

const tableDataToRowObjects = function ( tableData ) {
	return tableData.map( function ( rowData ) {
		return new Row(
			rowData.id,
			rowData.key,
			rowData.value,
			rowData.parent
		);
	} );
};

const zobjectToRows = function ( zobject ) {
	return zobjectUtils.convertJsonToTable( zobject );
};

module.exports = {
	tableDataToRowObjects,
	zobjectToRows
};
