/*!
 * WikiLambda unit test suite for the root Vuex getters
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var getters = require( '../../../resources/ext.wikilambda.edit/store/getters.js' ),
	Z2Type = {
		Z1K1: 'Z2',
		Z2K1: 'Z2',
		Z2K2: {
			Z1K1: 'Z4',
			Z4K1: 'Z2',
			Z4K2: [
				{
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z2K1',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [
							{
								Z1K1: 'Z11',
								Z11K1: 'Z1002',
								Z11K2: 'id'
							}
						]
					}
				},
				{
					Z1K1: 'Z3',
					Z3K1: 'Z1',
					Z3K2: 'Z2K2',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [
							{
								Z1K1: 'Z11',
								Z11K1: 'Z1002',
								Z11K2: 'value'
							}
						]
					}
				},
				{
					Z1K1: 'Z3',
					Z3K1: 'Z12',
					Z3K2: 'Z2K3',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [
							{
								Z1K1: 'Z11',
								Z11K1: 'Z1002',
								Z11K2: 'label'
							}
						]
					}
				}
			],
			Z4K3: 'Z102'
		},
		Z2K3: {
			Z1K1: 'Z12',
			Z12K1: [
				{
					Z1K1: 'Z11',
					Z11K1: 'Z1002',
					Z11K2: 'Persistent object'
				}
			]
		}
	};

describe( 'Vuex root getters', function () {
	it( 'gets current view mode', function () {
		// Jest defaults viewmode to true
		expect( getters.getViewMode() ).toBe( true );
	} );

	it( 'gets the literal type of given keys', function () {
		var mockedGetters = {
			getZkeys: {
				Z2: Z2Type
			}
		};

		// Correctly return types of valid keys
		expect( getters.getZkeyLiteralType( undefined, mockedGetters )( 'Z2K1' ) ).toEqual( 'Z6' );
		expect( getters.getZkeyLiteralType( undefined, mockedGetters )( 'Z2K2' ) ).toEqual( 'Z1' );
		expect( getters.getZkeyLiteralType( undefined, mockedGetters )( 'Z2K3' ) ).toEqual( 'Z12' );

		// Return null if key is invalid
		expect( getters.getZkeyLiteralType( undefined, mockedGetters )( 'Z2K4' ) ).toEqual( null );
	} );
} );
