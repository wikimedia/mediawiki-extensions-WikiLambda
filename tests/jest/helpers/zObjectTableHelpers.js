/*!
 * WikiLambda unit test suite tableDataToRowObjects helper.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
const Row = require( '../../../resources/ext.wikilambda.edit/store/classes/Row.js' ),
	zobjectRowUtils = require( '../../../resources/ext.wikilambda.edit/mixins/zobjectTreeUtils.js' ).methods;

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
	return zobjectRowUtils.convertZObjectToRows( zobject );
};

module.exports = {
	tableDataToRowObjects,
	zobjectToRows
};
