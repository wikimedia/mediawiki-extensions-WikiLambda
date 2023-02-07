var Row = require( '../../../resources/ext.wikilambda.edit/store/classes/Row.js' );

var tableDataToRowObjects = function ( tableData ) {
	return tableData.map( function ( rowData ) {
		return new Row(
			rowData.id,
			rowData.key,
			rowData.value,
			rowData.parent
		);
	} );
};

module.exports = { tableDataToRowObjects };
