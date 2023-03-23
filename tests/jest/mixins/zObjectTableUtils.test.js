/*!
 * WikiLambda unit test suite for the tableUtils mixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

var tableUtils = require( '../../../resources/ext.wikilambda.edit/mixins/zobjectTreeUtils.js' ).methods,
	Row = require( '../../../resources/ext.wikilambda.edit/store/classes/Row.js' ),
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	tableDataToRowObjects = require( '../helpers/zObjectTableHelpers.js' ).tableDataToRowObjects;

describe( 'tableUtils mixin', function () {

	describe( 'convertZObjectToRows', function () {
		describe( 'convertZObjectToRows with wrong parameters', function () {

			it( 'throws an exception when calling with parentRow but no nextAvailableId', function () {
				const zObject = 'the stringy one';
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_OBJECT, 9 );

				expect( function () {
					tableUtils.convertZObjectToRows( zObject, parentRow );
				} ).toThrow( Error );
			} );

			it( 'throws an exception when calling with appendToList but no parentRow', function () {
				const zObject = 'the stringy one';
				const parentRow = undefined;
				const nextAvailableId = 20;
				const appendToList = true;

				expect( function () {
					tableUtils.convertZObjectToRows( zObject, parentRow, nextAvailableId, appendToList );
				} ).toThrow( Error );
			} );
		} );

		describe( 'convertZObjectToRows without parent', function () {

			it( 'converts a terminal string', function () {
				const zObject = 'the stringy one';
				const rows = tableUtils.convertZObjectToRows( zObject );
				const expected = [
					{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
					{ id: 1, key: 'Z1K1', value: 'Z6', parent: 0 },
					{ id: 2, key: 'Z6K1', value: 'the stringy one', parent: 0 }
				];
				expect( rows ).toEqual( expected );
			} );

			it( 'converts a reference', function () {
				const zObject = 'Z12345';
				const rows = tableUtils.convertZObjectToRows( zObject );
				const expected = [
					{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
					{ id: 1, key: 'Z1K1', value: 'Z9', parent: 0 },
					{ id: 2, key: 'Z9K1', value: 'Z12345', parent: 0 }
				];
				expect( rows ).toEqual( expected );
			} );

			it( 'converts a typed list of strings', function () {
				const zObject = [ 'Z6', 'stringful', 'stringlord' ];
				const rows = tableUtils.convertZObjectToRows( zObject );
				const expected = [
					{ id: 0, key: undefined, value: Constants.ROW_VALUE_ARRAY, parent: undefined },
					{ id: 1, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 2, key: 'Z1K1', value: 'Z9', parent: 1 },
					{ id: 3, key: 'Z9K1', value: 'Z6', parent: 1 },
					{ id: 4, key: '1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 5, key: 'Z1K1', value: 'Z6', parent: 4 },
					{ id: 6, key: 'Z6K1', value: 'stringful', parent: 4 },
					{ id: 7, key: '2', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 8, key: 'Z1K1', value: 'Z6', parent: 7 },
					{ id: 9, key: 'Z6K1', value: 'stringlord', parent: 7 }
				];
				expect( rows ).toEqual( expected );
			} );

			it( 'converts a multilevel object', function () {
				const zObject = {
					Z1K1: 'Z11',
					Z11K1: {
						Z1K1: 'Z60',
						Z60K1: 'pang'
					},
					Z11K2: 'Gñeee'
				};
				const rows = tableUtils.convertZObjectToRows( zObject );
				const expected = [
					{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
					{ id: 1, key: 'Z1K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 2, key: 'Z1K1', value: 'Z9', parent: 1 },
					{ id: 3, key: 'Z9K1', value: 'Z11', parent: 1 },
					{ id: 4, key: 'Z11K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 5, key: 'Z1K1', value: Constants.ROW_VALUE_OBJECT, parent: 4 },
					{ id: 6, key: 'Z1K1', value: 'Z9', parent: 5 },
					{ id: 7, key: 'Z9K1', value: 'Z60', parent: 5 },
					{ id: 8, key: 'Z60K1', value: Constants.ROW_VALUE_OBJECT, parent: 4 },
					{ id: 9, key: 'Z1K1', value: 'Z6', parent: 8 },
					{ id: 10, key: 'Z6K1', value: 'pang', parent: 8 },
					{ id: 11, key: 'Z11K2', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 12, key: 'Z1K1', value: 'Z6', parent: 11 },
					{ id: 13, key: 'Z6K1', value: 'Gñeee', parent: 11 }
				];
				expect( rows ).toEqual( expected );
			} );
		} );

		describe( 'convertZObjectToRows with parent', function () {

			it( 'converts a terminal string', function () {
				const zObject = 'the stringy one';
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_OBJECT, 9 );
				const nextAvailableId = 20;

				const rows = tableUtils.convertZObjectToRows( zObject, parentRow, nextAvailableId );
				const expected = [
					{ id: 10, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 9 },
					{ id: 20, key: 'Z1K1', value: 'Z6', parent: 10 },
					{ id: 21, key: 'Z6K1', value: 'the stringy one', parent: 10 }
				];
				expect( rows ).toEqual( expected );
			} );

			it( 'converts a reference', function () {
				const zObject = 'Z12345';
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_OBJECT, 9 );
				const nextAvailableId = 20;

				const rows = tableUtils.convertZObjectToRows( zObject, parentRow, nextAvailableId );
				const expected = [
					{ id: 10, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 9 },
					{ id: 20, key: 'Z1K1', value: 'Z9', parent: 10 },
					{ id: 21, key: 'Z9K1', value: 'Z12345', parent: 10 }
				];
				expect( rows ).toEqual( expected );
			} );

			it( 'converts a typed list of strings', function () {
				const zObject = [ 'Z6', 'stringful', 'stringlord' ];
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_OBJECT, 9 );
				const nextAvailableId = 20;

				const rows = tableUtils.convertZObjectToRows( zObject, parentRow, nextAvailableId );
				const expected = [
					{ id: 10, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 9 },
					{ id: 20, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 10 },
					{ id: 21, key: 'Z1K1', value: 'Z9', parent: 20 },
					{ id: 22, key: 'Z9K1', value: 'Z6', parent: 20 },
					{ id: 23, key: '1', value: Constants.ROW_VALUE_OBJECT, parent: 10 },
					{ id: 24, key: 'Z1K1', value: 'Z6', parent: 23 },
					{ id: 25, key: 'Z6K1', value: 'stringful', parent: 23 },
					{ id: 26, key: '2', value: Constants.ROW_VALUE_OBJECT, parent: 10 },
					{ id: 27, key: 'Z1K1', value: 'Z6', parent: 26 },
					{ id: 28, key: 'Z6K1', value: 'stringlord', parent: 26 }
				];
				expect( rows ).toEqual( expected );
			} );

			it( 'converts a multilevel object', function () {
				const zObject = {
					Z1K1: 'Z11',
					Z11K1: {
						Z1K1: 'Z60',
						Z60K1: 'pang'
					},
					Z11K2: 'Gñeee'
				};
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_OBJECT, 9 );
				const nextAvailableId = 20;

				const rows = tableUtils.convertZObjectToRows( zObject, parentRow, nextAvailableId );

				const expected = [
					{ id: 10, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 9 },
					{ id: 20, key: 'Z1K1', value: Constants.ROW_VALUE_OBJECT, parent: 10 },
					{ id: 21, key: 'Z1K1', value: 'Z9', parent: 20 },
					{ id: 22, key: 'Z9K1', value: 'Z11', parent: 20 },
					{ id: 23, key: 'Z11K1', value: Constants.ROW_VALUE_OBJECT, parent: 10 },
					{ id: 24, key: 'Z1K1', value: Constants.ROW_VALUE_OBJECT, parent: 23 },
					{ id: 25, key: 'Z1K1', value: 'Z9', parent: 24 },
					{ id: 26, key: 'Z9K1', value: 'Z60', parent: 24 },
					{ id: 27, key: 'Z60K1', value: Constants.ROW_VALUE_OBJECT, parent: 23 },
					{ id: 28, key: 'Z1K1', value: 'Z6', parent: 27 },
					{ id: 29, key: 'Z6K1', value: 'pang', parent: 27 },
					{ id: 30, key: 'Z11K2', value: Constants.ROW_VALUE_OBJECT, parent: 10 },
					{ id: 31, key: 'Z1K1', value: 'Z6', parent: 30 },
					{ id: 32, key: 'Z6K1', value: 'Gñeee', parent: 30 }
				];
				expect( rows ).toEqual( expected );
			} );
		} );

		describe( 'convertZObjectToRows when parent is a list', function () {
			it( 'insert a string in a parent list from index 0', function () {
				const zObject = 'the stringy one';
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_ARRAY, 9 );
				const nextAvailableId = 20;
				const appendToList = true;

				const rows = tableUtils.convertZObjectToRows( zObject, parentRow, nextAvailableId, appendToList );
				const expected = [
					{ id: 10, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 9 },
					{ id: 20, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 10 },
					{ id: 21, key: 'Z1K1', value: 'Z6', parent: 20 },
					{ id: 22, key: 'Z6K1', value: 'the stringy one', parent: 20 }
				];
				expect( rows ).toEqual( expected );
			} );

			it( 'insert a string in a parent list from index 2', function () {
				const zObject = 'the stringy one';
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_ARRAY, 9 );
				const nextAvailableId = 20;
				const appendToList = true;
				const fromIndex = 2;

				const rows = tableUtils.convertZObjectToRows(
					zObject,
					parentRow,
					nextAvailableId,
					appendToList,
					fromIndex
				);
				const expected = [
					{ id: 10, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 9 },
					{ id: 20, key: '2', value: Constants.ROW_VALUE_OBJECT, parent: 10 },
					{ id: 21, key: 'Z1K1', value: 'Z6', parent: 20 },
					{ id: 22, key: 'Z6K1', value: 'the stringy one', parent: 20 }
				];
				expect( rows ).toEqual( expected );
			} );

			it( 'insert a list of strings in a parent list from index 0', function () {
				const zObject = [ 'the stringy one', 'the stringy two' ];
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_ARRAY, 9 );
				const nextAvailableId = 20;
				const appendToList = true;

				const rows = tableUtils.convertZObjectToRows( zObject, parentRow, nextAvailableId, appendToList );
				const expected = [
					{ id: 10, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 9 },
					{ id: 20, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 10 },
					{ id: 21, key: 'Z1K1', value: 'Z6', parent: 20 },
					{ id: 22, key: 'Z6K1', value: 'the stringy one', parent: 20 },
					{ id: 23, key: '1', value: Constants.ROW_VALUE_OBJECT, parent: 10 },
					{ id: 24, key: 'Z1K1', value: 'Z6', parent: 23 },
					{ id: 25, key: 'Z6K1', value: 'the stringy two', parent: 23 }
				];
				expect( rows ).toEqual( expected );
			} );

			it( 'insert a list of strings in a parent list from index 2', function () {
				const zObject = [ 'the stringy one', 'the stringy two' ];
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_ARRAY, 9 );
				const nextAvailableId = 20;
				const appendToList = true;
				const fromIndex = 2;

				const rows = tableUtils.convertZObjectToRows(
					zObject,
					parentRow,
					nextAvailableId,
					appendToList,
					fromIndex
				);
				const expected = [
					{ id: 10, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 9 },
					{ id: 20, key: '2', value: Constants.ROW_VALUE_OBJECT, parent: 10 },
					{ id: 21, key: 'Z1K1', value: 'Z6', parent: 20 },
					{ id: 22, key: 'Z6K1', value: 'the stringy one', parent: 20 },
					{ id: 23, key: '3', value: Constants.ROW_VALUE_OBJECT, parent: 10 },
					{ id: 24, key: 'Z1K1', value: 'Z6', parent: 23 },
					{ id: 25, key: 'Z6K1', value: 'the stringy two', parent: 23 }
				];
				expect( rows ).toEqual( expected );
			} );

			it( 'insert a list of lists in a parent list', function () {
				const zObject = [ [ 'first stringly list' ], [ 'second stringly list' ] ];
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_ARRAY, 9 );
				const nextAvailableId = 20;
				const appendToList = true;

				const rows = tableUtils.convertZObjectToRows( zObject, parentRow, nextAvailableId, appendToList );
				const expected = [
					{ id: 10, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 9 },
					{ id: 20, key: '0', value: Constants.ROW_VALUE_ARRAY, parent: 10 },
					{ id: 21, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 20 },
					{ id: 22, key: 'Z1K1', value: 'Z6', parent: 21 },
					{ id: 23, key: 'Z6K1', value: 'first stringly list', parent: 21 },
					{ id: 24, key: '1', value: Constants.ROW_VALUE_ARRAY, parent: 10 },
					{ id: 25, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 24 },
					{ id: 26, key: 'Z1K1', value: 'Z6', parent: 25 },
					{ id: 27, key: 'Z6K1', value: 'second stringly list', parent: 25 }
				];
				expect( rows ).toEqual( expected );
			} );

			it( 'insert a list of lists in a parent list from index 2', function () {
				const zObject = [ [ 'first stringly list' ], [ 'second stringly list' ] ];
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_ARRAY, 9 );
				const nextAvailableId = 20;
				const appendToList = true;
				const fromIndex = 2;

				const rows = tableUtils.convertZObjectToRows(
					zObject,
					parentRow,
					nextAvailableId,
					appendToList,
					fromIndex
				);
				const expected = [
					{ id: 10, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 9 },
					{ id: 20, key: '2', value: Constants.ROW_VALUE_ARRAY, parent: 10 },
					{ id: 21, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 20 },
					{ id: 22, key: 'Z1K1', value: 'Z6', parent: 21 },
					{ id: 23, key: 'Z6K1', value: 'first stringly list', parent: 21 },
					{ id: 24, key: '3', value: Constants.ROW_VALUE_ARRAY, parent: 10 },
					{ id: 25, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 24 },
					{ id: 26, key: 'Z1K1', value: 'Z6', parent: 25 },
					{ id: 27, key: 'Z6K1', value: 'second stringly list', parent: 25 }
				];
				expect( rows ).toEqual( expected );
			} );
		} );
	} );

	describe( 'convertZObjectTreetoJson', function () {
		describe( 'when zObjectTree does NOT contain any elements whose parent matches the parentId provided', function () {

			describe( 'when rootIsArray is false', function () {
				it( 'should return undefined', function () {
					const zObjectTree = tableDataToRowObjects( [
						{ id: 1, key: 'Z1K1', value: 'Z6', parent: 0 },
						{ id: 2, key: 'Z6K1', value: 'the stringy one', parent: 1 }
					] );
					const parentId = 3;
					const json = tableUtils.convertZObjectTreetoJson( zObjectTree, parentId );
					expect( json ).toBeUndefined();
				} );
			} );

			describe( 'when rootIsArray is true', function () {
				it( 'should return an empty array', function () {
					const zObjectTree = tableDataToRowObjects( [
						{ id: 1, key: 'Z1K1', value: Constants.Z_STRING, parent: 0 },
						{ id: 2, key: 'Z6K1', value: 'the stringy one', parent: 1 }
					] );
					const parentId = 3;
					const json = tableUtils.convertZObjectTreetoJson( zObjectTree, parentId, true );
					expect( json ).toEqual( [] );
				} );
			} );
		} );

		describe( 'when zObjectTree contains elements whose parent matches the parentId provided', function () {
			describe( 'when the zObjectTree contains a mix of array, object and arbitrary value elements', function () {
				it( 'should return a valid JSON object', function () {
					const zObjectTree = tableDataToRowObjects( [
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 2, key: 'Z1K1', value: Constants.Z_MULTILINGUALSTRING, parent: 1 },
						{ id: 3, key: 'Z12K1', value: Constants.ROW_VALUE_ARRAY, parent: 1 },
						{ id: 4, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 3 },
						{ id: 5, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 4 },
						{ id: 6, key: 'Z9K1', value: Constants.Z_MONOLINGUALSTRING, parent: 4 }
					] );

					const json = tableUtils.convertZObjectTreetoJson( zObjectTree, 0 );

					expect( json ).toEqual( {
						Z2K2: {
							Z1K1: Constants.Z_MULTILINGUALSTRING,
							Z12K1: [
								{ Z1K1: Constants.Z_REFERENCE, Z9K1: Constants.Z_MONOLINGUALSTRING }
							]
						}
					} );
				} );
			} );

			describe( 'when the zObjectTree contains an element that does not have a key', function () {
				it( 'should return a valid JSON object', function () {
					const zObjectTree = tableDataToRowObjects( [
						{ id: 1, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: 0 }
					] );

					const json = tableUtils.convertZObjectTreetoJson( zObjectTree, 0 );

					expect( json ).toBeUndefined();
				} );
			} );
		} );
	} );

	describe( 'getNextObjectId', function () {
		describe( 'when the zObject table is not initialized', function () {
			it( 'should return 0 when the zObject table is not initialized (null)', function () {
				const zObject = null;

				const nextObjectId = tableUtils.getNextObjectId( zObject );
				expect( nextObjectId ).toBe( 0 );
			} );

			it( 'should return 0 when the zObject table has no rows (empty array)', function () {
				const zObject = [];

				const nextObjectId = tableUtils.getNextObjectId( zObject );
				expect( nextObjectId ).toBe( 0 );
			} );
		} );

		describe( 'when the zObject table has content', function () {
			it( 'should return the next available id', function () {
				const zObject = tableDataToRowObjects( [
					{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 2, key: 'Z1K1', value: 'Z6', parent: 1 },
					{ id: 3, key: 'Z6K1', value: 'the stringy one', parent: 1 }
				] );

				const nextObjectId = tableUtils.getNextObjectId( zObject );
				expect( nextObjectId ).toBe( 4 );
			} );
		} );
	} );

	describe( 'findLatestKey', function () {
		describe( 'when a key is found for the provided zid', function () {

			it( 'should return the latest key', function () {
				const zObjectTree = tableDataToRowObjects( [
					{ id: 1, key: 'Z9K1', value: 'Z6K1', parent: 0 }
				] );

				const latestKey = tableUtils.findLatestKey( zObjectTree, Constants.Z_STRING );

				expect( latestKey ).toBe( 1 );
			} );
		} );

		describe( 'when a key is NOT found for the provided zid', function () {
			const zObjectTree = tableDataToRowObjects( [
				{ id: 2, key: 'Z1K1', value: Constants.Z_STRING, parent: 1 },
				{ id: 3, key: 'Z6K1', value: 'the stringy one', parent: 1 }
			] );

			const latestKey = tableUtils.findLatestKey( zObjectTree, Constants.Z_REFERENCE );

			expect( latestKey ).toBe( 0 );
		} );
	} );
} );
