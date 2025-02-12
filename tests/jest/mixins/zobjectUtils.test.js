/*!
 * WikiLambda unit test suite for the zobjectUtils mixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );
const Row = require( '../../../resources/ext.wikilambda.app/store/classes/Row.js' );
const { tableDataToRowObjects } = require( '../helpers/zObjectTableHelpers.js' );
const { methods: zobjectUtils } = require( '../../../resources/ext.wikilambda.app/mixins/zobjectUtils.js' );

describe( 'zobjectUtils mixin', () => {

	describe( 'convertJsonToTable', () => {
		describe( 'convertJsonToTable with wrong parameters', () => {

			it( 'throws an exception when calling with parentRow but no nextAvailableId', () => {
				const zObject = 'the stringy one';
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_OBJECT, 9 );

				expect( () => {
					zobjectUtils.convertJsonToTable( zObject, parentRow );
				} ).toThrow( Error );
			} );

			it( 'throws an exception when calling with appendToList but no parentRow', () => {
				const zObject = 'the stringy one';
				const parentRow = undefined;
				const nextAvailableId = 20;
				const appendToList = true;

				expect( () => {
					zobjectUtils.convertJsonToTable( zObject, parentRow, nextAvailableId, appendToList );
				} ).toThrow( Error );
			} );
		} );

		describe( 'convertJsonToTable without parent', () => {

			it( 'converts a terminal string', () => {
				const zObject = 'the stringy one';
				const rows = zobjectUtils.convertJsonToTable( zObject );
				const expected = [
					{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
					{ id: 1, key: 'Z1K1', value: 'Z6', parent: 0 },
					{ id: 2, key: 'Z6K1', value: 'the stringy one', parent: 0 }
				];
				expect( rows ).toEqual( expected );
			} );

			it( 'converts a reference', () => {
				const zObject = 'Z12345';
				const rows = zobjectUtils.convertJsonToTable( zObject );
				const expected = [
					{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
					{ id: 1, key: 'Z1K1', value: 'Z9', parent: 0 },
					{ id: 2, key: 'Z9K1', value: 'Z12345', parent: 0 }
				];
				expect( rows ).toEqual( expected );
			} );

			it( 'converts a typed list of strings', () => {
				const zObject = [ 'Z6', 'stringful', 'stringlord' ];
				const rows = zobjectUtils.convertJsonToTable( zObject );
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

			it( 'converts a multilevel object', () => {
				const zObject = {
					Z1K1: 'Z11',
					Z11K1: {
						Z1K1: 'Z60',
						Z60K1: 'pang'
					},
					Z11K2: 'Gñeee'
				};
				const rows = zobjectUtils.convertJsonToTable( zObject );
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

		describe( 'convertJsonToTable with parent', () => {

			it( 'converts a terminal string', () => {
				const zObject = 'the stringy one';
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_OBJECT, 9 );
				const nextAvailableId = 20;

				const rows = zobjectUtils.convertJsonToTable( zObject, parentRow, nextAvailableId );
				const expected = [
					{ id: 10, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 9 },
					{ id: 20, key: 'Z1K1', value: 'Z6', parent: 10 },
					{ id: 21, key: 'Z6K1', value: 'the stringy one', parent: 10 }
				];
				expect( rows ).toEqual( expected );
			} );

			it( 'converts a reference', () => {
				const zObject = 'Z12345';
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_OBJECT, 9 );
				const nextAvailableId = 20;

				const rows = zobjectUtils.convertJsonToTable( zObject, parentRow, nextAvailableId );
				const expected = [
					{ id: 10, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 9 },
					{ id: 20, key: 'Z1K1', value: 'Z9', parent: 10 },
					{ id: 21, key: 'Z9K1', value: 'Z12345', parent: 10 }
				];
				expect( rows ).toEqual( expected );
			} );

			it( 'converts a typed list of strings', () => {
				const zObject = [ 'Z6', 'stringful', 'stringlord' ];
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_OBJECT, 9 );
				const nextAvailableId = 20;

				const rows = zobjectUtils.convertJsonToTable( zObject, parentRow, nextAvailableId );
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

			it( 'converts a multilevel object', () => {
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

				const rows = zobjectUtils.convertJsonToTable( zObject, parentRow, nextAvailableId );

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

		describe( 'convertJsonToTable when parent is a list', () => {
			it( 'insert a string in a parent list from index 0', () => {
				const zObject = 'the stringy one';
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_ARRAY, 9 );
				const nextAvailableId = 20;
				const appendToList = true;

				const rows = zobjectUtils.convertJsonToTable( zObject, parentRow, nextAvailableId, appendToList );
				const expected = [
					{ id: 10, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 9 },
					{ id: 20, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 10 },
					{ id: 21, key: 'Z1K1', value: 'Z6', parent: 20 },
					{ id: 22, key: 'Z6K1', value: 'the stringy one', parent: 20 }
				];
				expect( rows ).toEqual( expected );
			} );

			it( 'insert a string in a parent list from index 2', () => {
				const zObject = 'the stringy one';
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_ARRAY, 9 );
				const nextAvailableId = 20;
				const appendToList = true;
				const fromIndex = 2;

				const rows = zobjectUtils.convertJsonToTable(
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

			it( 'insert a list of strings in a parent list from index 0', () => {
				const zObject = [ 'the stringy one', 'the stringy two' ];
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_ARRAY, 9 );
				const nextAvailableId = 20;
				const appendToList = true;

				const rows = zobjectUtils.convertJsonToTable( zObject, parentRow, nextAvailableId, appendToList );
				const expected = [
					{ id: 10, key: 'Z2K2', parent: 9, value: Constants.ROW_VALUE_ARRAY },
					{ id: 20, key: '0', parent: 10, value: Constants.ROW_VALUE_ARRAY },
					{ id: 21, key: '0', parent: 20, value: Constants.ROW_VALUE_OBJECT },
					{ id: 22, key: 'Z1K1', parent: 21, value: 'Z6' },
					{ id: 23, key: 'Z6K1', parent: 21, value: 'the stringy one' },
					{ id: 24, key: '1', parent: 20, value: Constants.ROW_VALUE_OBJECT },
					{ id: 25, key: 'Z1K1', parent: 24, value: 'Z6' },
					{ id: 26, key: 'Z6K1', parent: 24, value: 'the stringy two' }
				];
				expect( rows ).toEqual( expected );
			} );

			it( 'insert a list of strings in a parent list from index 2', () => {
				const zObject = [ 'the stringy one', 'the stringy two' ];
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_ARRAY, 9 );
				const nextAvailableId = 20;
				const appendToList = true;
				const fromIndex = 2;

				const rows = zobjectUtils.convertJsonToTable(
					zObject,
					parentRow,
					nextAvailableId,
					appendToList,
					fromIndex
				);
				const expected = [
					{ id: 10, key: 'Z2K2', parent: 9, value: Constants.ROW_VALUE_ARRAY },
					{ id: 20, key: '2', parent: 10, value: Constants.ROW_VALUE_ARRAY },
					{ id: 21, key: '0', parent: 20, value: Constants.ROW_VALUE_OBJECT },
					{ id: 22, key: 'Z1K1', parent: 21, value: 'Z6' },
					{ id: 23, key: 'Z6K1', parent: 21, value: 'the stringy one' },
					{ id: 24, key: '1', parent: 20, value: Constants.ROW_VALUE_OBJECT },
					{ id: 25, key: 'Z1K1', parent: 24, value: 'Z6' },
					{ id: 26, key: 'Z6K1', parent: 24, value: 'the stringy two' }
				];
				expect( rows ).toEqual( expected );
			} );

			it( 'insert a list of lists in a parent list', () => {
				const zObject = [ [ 'first stringly list' ], [ 'second stringly list' ] ];
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_ARRAY, 9 );
				const nextAvailableId = 20;
				const appendToList = true;

				const rows = zobjectUtils.convertJsonToTable( zObject, parentRow, nextAvailableId, appendToList );
				const expected = [
					{ id: 10, key: 'Z2K2', parent: 9, value: Constants.ROW_VALUE_ARRAY },
					{ id: 20, key: '0', parent: 10, value: Constants.ROW_VALUE_ARRAY },
					{ id: 21, key: '0', parent: 20, value: Constants.ROW_VALUE_ARRAY },
					{ id: 22, key: '0', parent: 21, value: Constants.ROW_VALUE_OBJECT },
					{ id: 23, key: 'Z1K1', parent: 22, value: 'Z6' },
					{ id: 24, key: 'Z6K1', parent: 22, value: 'first stringly list' },
					{ id: 25, key: '1', parent: 20, value: Constants.ROW_VALUE_ARRAY },
					{ id: 26, key: '0', parent: 25, value: Constants.ROW_VALUE_OBJECT },
					{ id: 27, key: 'Z1K1', parent: 26, value: 'Z6' },
					{ id: 28, key: 'Z6K1', parent: 26, value: 'second stringly list' }
				];
				expect( rows ).toEqual( expected );
			} );

			it( 'insert a list of lists in a parent list from index 2', () => {
				const zObject = [ [ 'first stringly list' ], [ 'second stringly list' ] ];
				const parentRow = new Row( 10, 'Z2K2', Constants.ROW_VALUE_ARRAY, 9 );
				const nextAvailableId = 20;
				const appendToList = true;
				const fromIndex = 2;

				const rows = zobjectUtils.convertJsonToTable(
					zObject,
					parentRow,
					nextAvailableId,
					appendToList,
					fromIndex
				);
				const expected = [
					{ id: 10, key: 'Z2K2', parent: 9, value: Constants.ROW_VALUE_ARRAY },
					{ id: 20, key: '2', parent: 10, value: Constants.ROW_VALUE_ARRAY },
					{ id: 21, key: '0', parent: 20, value: Constants.ROW_VALUE_ARRAY },
					{ id: 22, key: '0', parent: 21, value: Constants.ROW_VALUE_OBJECT },
					{ id: 23, key: 'Z1K1', parent: 22, value: 'Z6' },
					{ id: 24, key: 'Z6K1', parent: 22, value: 'first stringly list' },
					{ id: 25, key: '1', parent: 20, value: Constants.ROW_VALUE_ARRAY },
					{ id: 26, key: '0', parent: 25, value: Constants.ROW_VALUE_OBJECT },
					{ id: 27, key: 'Z1K1', parent: 26, value: 'Z6' },
					{ id: 28, key: 'Z6K1', parent: 26, value: 'second stringly list' }
				];
				expect( rows ).toEqual( expected );
			} );
		} );
	} );

	describe( 'convertTableToJson', () => {
		describe( 'when zObjectTree does NOT contain any elements whose parent matches the parentId provided', () => {

			describe( 'when rootIsArray is false', () => {
				it( 'should return undefined', () => {
					const zObjectTree = tableDataToRowObjects( [
						{ id: 1, key: 'Z1K1', value: 'Z6', parent: 0 },
						{ id: 2, key: 'Z6K1', value: 'the stringy one', parent: 1 }
					] );
					const parentId = 3;
					const json = zobjectUtils.convertTableToJson( zObjectTree, parentId );
					expect( json ).toBeUndefined();
				} );
			} );

			describe( 'when rootIsArray is true', () => {
				it( 'should return an empty array', () => {
					const zObjectTree = tableDataToRowObjects( [
						{ id: 1, key: 'Z1K1', value: Constants.Z_STRING, parent: 0 },
						{ id: 2, key: 'Z6K1', value: 'the stringy one', parent: 1 }
					] );
					const parentId = 3;
					const json = zobjectUtils.convertTableToJson( zObjectTree, parentId, true );
					expect( json ).toEqual( [] );
				} );
			} );
		} );

		describe( 'when zObjectTree contains elements whose parent matches the parentId provided', () => {
			describe( 'when the zObjectTree contains a mix of array, object and arbitrary value elements', () => {
				it( 'should return a valid JSON object', () => {
					const zObjectTree = tableDataToRowObjects( [
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 2, key: 'Z1K1', value: Constants.Z_MULTILINGUALSTRING, parent: 1 },
						{ id: 3, key: 'Z12K1', value: Constants.ROW_VALUE_ARRAY, parent: 1 },
						{ id: 4, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 3 },
						{ id: 5, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 4 },
						{ id: 6, key: 'Z9K1', value: Constants.Z_MONOLINGUALSTRING, parent: 4 }
					] );

					const json = zobjectUtils.convertTableToJson( zObjectTree, 0 );

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

			describe( 'when the zObjectTree contains an element that does not have a key', () => {
				it( 'should return a valid JSON object', () => {
					const zObjectTree = tableDataToRowObjects( [
						{ id: 1, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: 0 }
					] );

					const json = zobjectUtils.convertTableToJson( zObjectTree, 0 );

					expect( json ).toBeUndefined();
				} );
			} );

			describe( 'when there are detached zobject trees in the table', () => {
				it( 'should return a valid JSON object', () => {
					const zObjectTree = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 2, key: 'Z1K1', value: Constants.Z_STRING, parent: 1 },
						{ id: 3, key: 'Z6K1', value: 'good string', parent: 1 },
						{ id: 4, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 5, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 4 },
						{ id: 6, key: 'Z1K1', value: Constants.Z_STRING, parent: 5 },
						{ id: 7, key: 'Z6K1', value: 'detached string', parent: 5 }
					] );

					let json;
					json = zobjectUtils.convertTableToJson( zObjectTree );
					expect( json ).toEqual( {
						Z2K2: {
							Z1K1: Constants.Z_STRING,
							Z6K1: 'good string'
						}
					} );

					json = zobjectUtils.convertTableToJson( zObjectTree, 0 );
					expect( json ).toEqual( {
						Z2K2: {
							Z1K1: Constants.Z_STRING,
							Z6K1: 'good string'
						}
					} );

					json = zobjectUtils.convertTableToJson( zObjectTree, 4 );
					expect( json ).toEqual( {
						Z2K2: {
							Z1K1: Constants.Z_STRING,
							Z6K1: 'detached string'
						}
					} );
				} );
			} );
		} );
	} );
} );
