/*!
 * WikiLambda unit test suite for the zKeys Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var argumentsModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/arguments.js' ),
	mockZArguments = { Z10024K1: { labels: [ { key: 'word: ', label: 'word', lang: 'Z1002' } ], zid: 'Z10024K1', type: 'String' } },
	state,
	context;

describe( 'arguments Vuex module', function () {
	beforeEach( function () {
		state = JSON.parse( JSON.stringify( argumentsModule.state ) );
		context = $.extend( {}, {
			commit: jest.fn( function ( mutationType, payload ) {
				return argumentsModule.mutations[ mutationType ]( state, payload );
			} ),
			getters: {},
			state: state,
			rootGetters: [ 'en' ]
		} );
	} );

	describe( 'Getters', function () {

		describe( 'getZarguments', function () {
			it( 'Returns empty object if no zArguments are defined in the state', function () {
				expect( argumentsModule.getters.getZarguments( state ) ).toEqual( {} );
			} );
			it( 'Returns the zArguments defined in the state', function () {
				state.zArguments = mockZArguments;
				expect( argumentsModule.getters.getZarguments( state ) ).toEqual( mockZArguments );
			} );
		} );
	} );

	describe( 'Actions', function () {
		describe( 'setAvailableZArguments', function () {
			beforeEach( function () {
				context.dispatch = jest.fn( function ( key, payload ) {
					return new Promise( function ( resolve ) {
						argumentsModule.actions.performZKeyFetch( context, payload );
						resolve();
					} );
				} );
			} );
			it( 'Will set the stored ZArguments', function () {
				context.getters.getStoredObject = ( zid ) => {
					const objects = {
						Z10033: {
							Z2K2: {
								Z1K1: 'Z8',
								Z8K1: [
									'Z17',
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
												'Z11',
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
												'Z11',
												{
													Z1K1: 'Z11',
													Z11K1: 'Z1002',
													Z11K2: 'right'
												}
											]
										}
									}
								]
							}
						}
					};
					return objects[ zid ];
				};
				context.getters.getLabel = jest.fn( () => 'Boolean' );
				context.getters.getZObjectAsJson = jest.fn( function () {
					return true;
				} );

				var zArguments = [
					{ labels: [ { key: 'left: ', label: 'left', lang: 'Z1002' } ], zid: 'Z10033K1', type: {
						label: 'Boolean',
						zid: 'Z40'
					} },
					{ labels: [ { key: 'right: ', label: 'right', lang: 'Z1002' } ], zid: 'Z10033K2', type: {
						label: 'Boolean',
						zid: 'Z40'
					} }
				];

				argumentsModule.actions.setAvailableZArguments( context, 'Z10033' );

				expect( context.commit ).toHaveBeenCalledTimes( 3 );
				expect( context.commit ).toHaveBeenNthCalledWith( 1, 'resetZArgumentInfo' );
				expect( context.commit ).toHaveBeenNthCalledWith( 2, 'addZArgumentInfo', zArguments[ 0 ] );
				expect( context.commit ).toHaveBeenNthCalledWith( 3, 'addZArgumentInfo', zArguments[ 1 ] );
			} );
		} );
	} );
} );
