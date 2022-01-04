/* eslint-disable compat/compat */
/*!
 * WikiLambda unit test suite for the zKeys Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var zkeysModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zKeys.js' ),
	mockApiReponse = {
		batchcomplete: '',
		query: {
			// eslint-disable-next-line camelcase
			wikilambdaload_zobjects: {
				Z1: {
					success: '',
					data: {
						Z1K1: 'Z2',
						Z2K1: {
							Z1K1: 'Z9',
							Z9K1: 'Z1'
						},
						Z2K2: {
							Z1K1: 'Z4',
							Z4K1: {
								Z1K1: 'Z9',
								Z9K1: 'Z1'
							},
							Z4K2: [
								{
									Z1K1: 'Z3',
									Z3K1: {
										Z1K1: 'Z9',
										Z9K1: 'Z4'
									},
									Z3K2: {
										Z1K1: 'Z6',
										Z6K1: 'Z1K1'
									},
									Z3K3: {
										Z1K1: 'Z12',
										Z12K1: [
											{
												Z1K1: 'Z11',
												Z11K1: 'en',
												Z11K2: 'type'
											}
										]
									}
								}
							],
							Z4K3: {
								Z1K1: 'Z9',
								Z9K1: 'Z101'
							}
						},
						Z2K3: {
							Z1K1: 'Z12',
							Z12K1: [
								{
									Z1K1: 'Z11',
									Z11K1: 'en',
									Z11K2: 'Object'
								}
							]
						}
					}
				},
				Z2: {
					success: '',
					data: {
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
					}
				},
				Z6: {
					success: '',
					data: {
						Z1K1: 'Z2',
						Z2K1: {
							Z1K1: 'Z9',
							Z9K1: 'Z6'
						},
						Z2K2: {
							Z1K1: 'Z4',
							Z4K1: {
								Z1K1: 'Z9',
								Z9K1: 'Z6'
							},
							Z4K2: [
								{
									Z1K1: 'Z3',
									Z3K1: {
										Z1K1: 'Z9',
										Z9K1: 'Z6'
									},
									Z3K2: {
										Z1K1: 'Z6',
										Z6K1: 'Z6K1'
									},
									Z3K3: {
										Z1K1: 'Z12',
										Z12K1: [
											{
												Z1K1: 'Z11',
												Z11K1: 'en',
												Z11K2: 'value'
											}
										]
									}
								}
							],
							Z4K3: {
								Z1K1: 'Z9',
								Z9K1: 'Z101'
							}
						},
						Z2K3: {
							Z1K1: 'Z12',
							Z12K1: [
								{
									Z1K1: 'Z11',
									Z11K1: 'en',
									Z11K2: 'String'
								}
							]
						}
					}
				}
			}
		}
	},
	mockApiZkeys = {
		Z1: { Z1K1: 'Z2', Z2K1: { Z1K1: 'Z9', Z9K1: 'Z1' }, Z2K2: { Z1K1: 'Z4', Z4K1: { Z1K1: 'Z9', Z9K1: 'Z1' }, Z4K2: [ { Z1K1: 'Z3', Z3K1: { Z1K1: 'Z9', Z9K1: 'Z4' }, Z3K2: { Z1K1: 'Z6', Z6K1: 'Z1K1' }, Z3K3: { Z1K1: 'Z12', Z12K1: [ { Z1K1: 'Z11', Z11K1: 'en', Z11K2: 'type' } ] } } ], Z4K3: { Z1K1: 'Z9', Z9K1: 'Z101' } }, Z2K3: { Z1K1: 'Z12', Z12K1: [ { Z1K1: 'Z11', Z11K1: 'en', Z11K2: 'Object' } ] } },
		Z6: { Z1K1: 'Z2', Z2K1: { Z1K1: 'Z9', Z9K1: 'Z6' }, Z2K2: { Z1K1: 'Z4', Z4K1: { Z1K1: 'Z9', Z9K1: 'Z6' }, Z4K2: [ { Z1K1: 'Z3', Z3K1: { Z1K1: 'Z9', Z9K1: 'Z6' }, Z3K2: { Z1K1: 'Z6', Z6K1: 'Z6K1' }, Z3K3: { Z1K1: 'Z12', Z12K1: [ { Z1K1: 'Z11', Z11K1: 'en', Z11K2: 'value' } ] } } ], Z4K3: { Z1K1: 'Z9', Z9K1: 'Z101' } }, Z2K3: { Z1K1: 'Z12', Z12K1: [ { Z1K1: 'Z11', Z11K1: 'en', Z11K2: 'String' } ] } }
	},
	mockZKeyLabels = { Z1: 'Object', Z1K1: 'type', Z2: 'Persistent object', Z2K1: 'id', Z2K2: 'value', Z2K3: 'label', Z12: 'Multilingual text', Z12K1: 'texts', Z3: 'Key', Z3K1: 'value type', Z3K2: 'key id', Z3K3: 'label', Z4: 'Type', Z4K1: 'identity', Z4K2: 'keys', Z4K3: 'validator', Z6: 'String', Z6K1: 'value', Z8: 'Function', Z8K1: 'arguments', Z8K2: 'return type', Z8K3: 'testers', Z8K4: 'implementations', Z8K5: 'identity', Z7: 'Function call', Z7K1: 'function', Z9: 'Reference', Z9K1: 'reference id', Z10: 'List', Z10K1: 'head', Z10K2: 'tail' },
	mockZArguments = { Z10024K1: { label: 'word', zid: 'Z10024K1', key: 'word: ', type: 'String' } },
	state,
	context,
	getMock,
	getResolveMock;

describe( 'zkeys Vuex module', function () {
	beforeEach( function () {
		getResolveMock = jest.fn( function ( thenFunction ) {
			return thenFunction( mockApiReponse );
		} );
		getMock = jest.fn( function () {
			return {
				then: getResolveMock
			};
		} );
		state = JSON.parse( JSON.stringify( zkeysModule.state ) );
		context = $.extend( {}, {
			commit: jest.fn( function ( mutationType, payload ) {
				return zkeysModule.mutations[ mutationType ]( state, payload );
			} ),
			getters: {},
			state: state,
			rootGetters: [ 'en' ]
		} );

		mw.Api = jest.fn( function () {
			return {
				get: getMock
			};
		} );
	} );

	describe( 'Getters', function () {

		describe( 'getZkeys', function () {
			it( 'Returns empty object if no zKeys are defined in the state', function () {
				expect( zkeysModule.getters.getZkeys( state ) ).toEqual( {} );
			} );

			it( 'Returns the zKeys defined in the state', function () {
				state.zKeys = mockApiZkeys;
				expect( zkeysModule.getters.getZkeys( state ) ).toEqual( mockApiZkeys );
			} );
		} );

		describe( 'getZkeyLabels', function () {
			it( 'Returns empty object if no zKeyLabels are defined in the state', function () {
				expect( zkeysModule.getters.getZkeyLabels( state ) ).toEqual( {} );
			} );

			it( 'Returns the zKeys defined in the state', function () {
				state.zKeyLabels = mockZKeyLabels;
				expect( zkeysModule.getters.getZkeyLabels( state ) ).toEqual( mockZKeyLabels );
			} );
		} );

		describe( 'getZarguments', function () {
			it( 'Returns empty object if no zArguments are defined in the state', function () {
				expect( zkeysModule.getters.getZarguments( state ) ).toEqual( {} );
			} );
			it( 'Returns the zArguments defined in the state', function () {
				state.zArguments = mockZArguments;
				expect( zkeysModule.getters.getZarguments( state ) ).toEqual( mockZArguments );
			} );
		} );
	} );

	describe( 'Actions', function () {
		describe( 'fetchZKeys', function () {
			beforeEach( function () {
				context.dispatch = jest.fn( function ( key, payload ) {
					return new Promise( function ( resolve ) {
						zkeysModule.actions.performZKeyFetch( context, payload );
						resolve();
					} );
				} );
			} );

			it( 'Call api.get if the zId is not already in the state', function () {
				var zIdsToSearch = [ 'Z1' ];
				return zkeysModule.actions.fetchZKeys( context, zIdsToSearch ).then( function () {
					expect( mw.Api ).toHaveBeenCalledTimes( 1 );
					expect( getMock ).toHaveBeenCalledWith( {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						// eslint-disable-next-line camelcase
						wikilambdaload_zids: 'Z1',
						// eslint-disable-next-line camelcase
						wikilambdaload_language: context.rootGetters.zLang,
						// eslint-disable-next-line camelcase
						wikilambdaload_canonical: 'true'
					} );
				} );
			} );
			it( 'Call api.get with multiple Zids as a string separated by | ', function () {
				var zIdsToSearch = [ 'Z1', 'Z6' ],
					expectedWikilambdaloadZids = 'Z1|Z6';
				return zkeysModule.actions.fetchZKeys( context, zIdsToSearch ).then( function () {
					expect( mw.Api ).toHaveBeenCalledTimes( 1 );
					expect( getMock ).toHaveBeenCalledWith( {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						// eslint-disable-next-line camelcase
						wikilambdaload_zids: expectedWikilambdaloadZids,
						// eslint-disable-next-line camelcase
						wikilambdaload_language: context.rootGetters.zLang,
						// eslint-disable-next-line camelcase
						wikilambdaload_canonical: 'true'
					} );
				} );
			} );
			it( 'Will NOT call the APi if the Zids is already part of the zKeys', function () {
				var zIdsToSearch = [ 'Z1' ];
				context.state.zKeys = mockApiZkeys;

				zkeysModule.actions.fetchZKeys( context, zIdsToSearch );

				expect( mw.Api ).toHaveBeenCalledTimes( 0 );
				expect( getMock ).toHaveBeenCalledTimes( 0 );
			} );
			it( 'Will call the APi only with the Zids that are not already in zKeys', function () {
				var zIdsToSearch = [ 'Z1', 'Z2', 'Z6' ],
					expectedWikilambdaloadZids = 'Z2|Z6';
				context.state.zKeys = {
					Z1: mockApiZkeys.Z1
				};

				return zkeysModule.actions.fetchZKeys( context, zIdsToSearch ).then( function () {
					expect( mw.Api ).toHaveBeenCalledTimes( 1 );
					expect( getMock ).toHaveBeenCalledTimes( 1 );
					expect( getMock ).toHaveBeenCalledWith( {
						action: 'query',
						list: 'wikilambdaload_zobjects',
						format: 'json',
						// eslint-disable-next-line camelcase
						wikilambdaload_zids: expectedWikilambdaloadZids,
						// eslint-disable-next-line camelcase
						wikilambdaload_language: context.rootGetters.zLang,
						// eslint-disable-next-line camelcase
						wikilambdaload_canonical: 'true'
					} );

					Promise.resolve();
				} );
			} );
			it( 'Will Update the ZKeys with the API response', function () {
				var zIdsToSearch = [ 'Z1', 'Z6' ],
					expectedAddZKeyInfoCall = expect.objectContaining( {
						zid: expect.any( String ),
						info: expect.any( Object )
					} ),
					expecteaddZKeyLabelInfoCall = expect.objectContaining( {
						key: expect.any( String ),
						label: expect.any( String )
					} );

				zkeysModule.actions.performZKeyFetch( context, zIdsToSearch );

				return new Promise( function ( resolve ) {
					expect( mw.Api ).toHaveBeenCalledTimes( 1 );
					expect( getMock ).toHaveBeenCalledTimes( 1 );

					expect( getResolveMock ).toHaveBeenCalledTimes( 1 );
					expect( context.commit ).toHaveBeenCalledTimes( 6 );
					expect( context.commit ).toHaveBeenCalledWith( 'addZKeyInfo', expectedAddZKeyInfoCall );
					expect( context.commit ).toHaveBeenCalledWith( 'addZKeyLabel', expecteaddZKeyLabelInfoCall );

					resolve();
				}, 1000 );
			} );
			it( 'Will set the stored ZArguments', function () {
				context.getters.getZkeys = {
					Z10033: {
						Z1K1: 'Z2',
						Z2K1: 'Z10033',
						Z2K2: {
							Z1K1: 'Z8',
							Z8K1: [
								{
									Z1K1: 'Z17',
									Z17K1: 'Z40',
									Z17K2: {
										Z1K1: 'Z6',
										Z6K1: 'Z10033K1'
									},
									Z17K3: {
										Z1K1: 'Z12',
										Z12K1: [
											{
												Z1K1: 'Z11',
												Z11K1: 'Z1002',
												Z11K2: 'left'
											}
										]
									}
								},
								{
									Z1K1: 'Z17',
									Z17K1: 'Z40',
									Z17K2: {
										Z1K1: 'Z6',
										Z6K1: 'Z10033K2'
									},
									Z17K3: {
										Z1K1: 'Z12',
										Z12K1: [
											{
												Z1K1: 'Z11',
												Z11K1: 'Z1002',
												Z11K2: 'right'
											}
										]
									}
								}
							],
							Z8K2: 'Z40',
							Z8K3: [],
							Z8K4: [
								'Z10034'
							],
							Z8K5: 'Z10033'
						},
						Z2K3: {
							Z1K1: 'Z12',
							Z12K1: [
								{
									Z1K1: 'Z11',
									Z11K1: 'Z1002',
									Z11K2: 'Nand'
								}
							]
						}
					},
					Z40: {
						Z1K1: 'Z2',
						Z2K1: 'Z40',
						Z2K2: {
							Z1K1: 'Z4',
							Z4K1: 'Z40',
							Z4K2: [
								{
									Z1K1: 'Z3',
									Z3K1: 'Z40',
									Z3K2: 'Z40K1',
									Z3K3: {
										Z1K1: 'Z12',
										Z12K1: [
											{
												Z1K1: 'Z11',
												Z11K1: 'Z1002',
												Z11K2: 'identity'
											}
										]
									}
								}
							],
							Z4K3: 'Z140'
						},
						Z2K3: {
							Z1K1: 'Z12',
							Z12K1: [
								{
									Z1K1: 'Z11',
									Z11K1: 'Z1002',
									Z11K2: 'Boolean'
								}
							]
						}
					}
				};
				context.getters.getZkeyLabels = {
					Z40: 'Boolean'
				};

				context.getters.getZObjectAsJson = jest.fn( function () {
					return true;
				} );

				var zArguments = [
					{ label: 'left', zid: 'Z10033K1', key: 'left: ', type: 'Boolean' },
					{ label: 'right', zid: 'Z10033K2', key: 'right: ', type: 'Boolean' }
				];

				zkeysModule.actions.setAvailableZArguments( context, 'Z10033' );

				expect( context.commit ).toHaveBeenCalledTimes( 3 );
				expect( context.commit ).toHaveBeenNthCalledWith( 1, 'resetZArgumentInfo' );
				expect( context.commit ).toHaveBeenNthCalledWith( 2, 'addZArgumentInfo', zArguments[ 0 ] );
				expect( context.commit ).toHaveBeenNthCalledWith( 3, 'addZArgumentInfo', zArguments[ 1 ] );
			} );
		} );
	} );
} );
