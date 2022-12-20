var tableUtils = require( '../../../resources/ext.wikilambda.edit/mixins/zobjectTreeUtils.js' ).methods,
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' );

describe( 'tableUtils mixin', function () {

	describe( 'convertZObjectToRows without parent', function () {

		it( 'converts a terminal string', function () {
			const zObject = 'the stringy one';
			const rows = tableUtils.convertZObjectToRows( zObject );
			const expected = [
				{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
				{ id: 1, key: 'Z1K1', value: 'Z6', parent: 0 },
				{ id: 2, key: 'Z6K1', value: 'the stringy one', parent: 0 }
			];
			expect( rows ).toStrictEqual( expected );
		} );

		it( 'converts a reference', function () {
			const zObject = 'Z12345';
			const rows = tableUtils.convertZObjectToRows( zObject );
			const expected = [
				{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
				{ id: 1, key: 'Z1K1', value: 'Z9', parent: 0 },
				{ id: 2, key: 'Z9K1', value: 'Z12345', parent: 0 }
			];
			expect( rows ).toStrictEqual( expected );
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
			expect( rows ).toStrictEqual( expected );
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
			expect( rows ).toStrictEqual( expected );
		} );

	} );

	describe( 'convertZObjectToRows with parent', function () {

		it( 'converts a terminal string', function () {
			const zObject = 'the stringy one';
			const parentRow = { id: 10, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 9 };
			const nextAvailableId = 20;

			const rows = tableUtils.convertZObjectToRows( zObject, parentRow, nextAvailableId );
			const expected = [
				{ id: 10, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 9 },
				{ id: 20, key: 'Z1K1', value: 'Z6', parent: 10 },
				{ id: 21, key: 'Z6K1', value: 'the stringy one', parent: 10 }
			];
			expect( rows ).toStrictEqual( expected );
		} );

		it( 'converts a reference', function () {
			const zObject = 'Z12345';
			const parentRow = { id: 10, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 9 };
			const nextAvailableId = 20;

			const rows = tableUtils.convertZObjectToRows( zObject, parentRow, nextAvailableId );
			const expected = [
				{ id: 10, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 9 },
				{ id: 20, key: 'Z1K1', value: 'Z9', parent: 10 },
				{ id: 21, key: 'Z9K1', value: 'Z12345', parent: 10 }
			];
			expect( rows ).toStrictEqual( expected );
		} );

		it( 'converts a typed list of strings', function () {
			const zObject = [ 'Z6', 'stringful', 'stringlord' ];
			const parentRow = { id: 10, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 9 };
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
			expect( rows ).toStrictEqual( expected );
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
			const parentRow = { id: 10, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 9 };
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
			expect( rows ).toStrictEqual( expected );
		} );
	} );
} );
