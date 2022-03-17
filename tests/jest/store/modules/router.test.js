/*!
 * WikiLambda unit test suite for the router Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' );

describe( 'router Vuex module', function () {

	var routerInstance;

	beforeEach( function () {
		jest.resetModules();
		routerInstance = require( '../../../../resources/ext.wikilambda.edit/store/modules/router.js' );
	} );

	afterEach( function () {
		routerInstance = null;
	} );

	describe( 'Getters', function () {
		describe( 'getCurrentView', function () {
			it( 'Returns the current view', function () {

				routerInstance.state.currentView = 'DummyView';
				var getCurrentView = routerInstance.getters.getCurrentView;

				expect( getCurrentView( routerInstance.state ) ).toBe( routerInstance.state.currentView );
			} );
		} );
		describe( 'getQueryParams', function () {
			it( 'Returns the current queryParams', function () {

				routerInstance.state.queryParams = 'DummyQueryParams';
				var getQueryParams = routerInstance.getters.getQueryParams;

				expect( getQueryParams( routerInstance.state ) ).toBe( routerInstance.state.queryParams );
			} );
		} );
	} );

	describe( 'Mutations', function () {
		describe( 'CHANGE_CURRENT_VIEW', function () {
			it( 'Updates the current View', function () {
				var dummyView = 'DummyView';

				expect( routerInstance.state.currentView ).toBe( routerInstance.state.currentView );
				routerInstance.mutations.CHANGE_CURRENT_VIEW( routerInstance.state, dummyView );

				expect( routerInstance.state.currentView ).toBe( dummyView );
			} );
		} );
		describe( 'CHANGE_QUERY_PARAMS', function () {
			it( 'Updates the current View', function () {
				var dummyParams = 'DummyParams';

				expect( routerInstance.state.queryParams ).toBe( routerInstance.state.queryParams );
				routerInstance.mutations.CHANGE_QUERY_PARAMS( routerInstance.state, dummyParams );

				expect( routerInstance.state.queryParams ).toBe( dummyParams );
			} );
		} );
	} );

	describe( 'Actions', function () {
		var context;

		beforeEach( function () {
			context = $.extend( {}, {
				commit: jest.fn(),
				dispatch: jest.fn(),
				state: $.extend( {}, routerInstance.state ),
				rootGetters: jest.fn()
			} );

			window.history.pushState = jest.fn();
			window.history.replaceState = jest.fn();
		} );

		describe( 'navigate', function () {
			it( 'does not trigger navigation when view is invalid', function () {
				var payload = {
					to: 'InvalidValidation'
				};
				routerInstance.actions.navigate( context, payload );

				expect( context.commit ).not.toHaveBeenCalled();
			} );

			describe( 'when view is valid', function () {
				it( 'triggers a CHANGE_CURRENT_VIEW mutation', function () {
					var payload = {
						to: Constants.VIEWS.Z_OBJECT_VIEWER
					};
					routerInstance.actions.navigate( context, payload );

					expect( context.commit ).toHaveBeenCalled();
					expect( context.commit ).toHaveBeenCalledWith(
						'CHANGE_CURRENT_VIEW', Constants.VIEWS.Z_OBJECT_VIEWER );
				} );
				it( 'call window.history.pushState', function () {
					var payload = {
						to: Constants.VIEWS.Z_OBJECT_VIEWER
					};
					routerInstance.actions.navigate( context, payload );

					expect( window.history.pushState ).toHaveBeenCalled();
				} );
				it( 'call window.history.pushState with path and query as state', function () {
					var payload = {
						to: Constants.VIEWS.Z_OBJECT_VIEWER
					};
					var expectedObject = {
						path: 'dummyPath',
						query: {
							dummyParams: 'dummyValue',
							view: 'dummyView'
						}
					};
					context.state.currentPath = 'dummyPath';
					context.state.currentView = 'dummyView';
					context.state.queryParams = { dummyParams: 'dummyValue' };
					routerInstance.actions.navigate( context, payload );

					expect( window.history.pushState.mock.calls[ 0 ][ 0 ] ).toMatchObject( expectedObject );
				} );
				it( 'call window.history.pushState with argument as query string', function () {
					var payload = {
						to: Constants.VIEWS.Z_OBJECT_VIEWER
					};
					var expectedQueryString = 'dummyPath?dummyParams=dummyValue&view=dummyView';

					context.state.currentPath = 'dummyPath';
					context.state.currentView = 'dummyView';
					context.state.queryParams = { dummyParams: 'dummyValue' };
					routerInstance.actions.navigate( context, payload );

					expect( window.history.pushState.mock.calls[ 0 ][ 2 ] ).toBe( expectedQueryString );
				} );

				describe( 'when params are passed', function () {
					it( 'calls CHANGE_QUERY_PARAMS mutation', function () {
						var payload = {
							to: Constants.VIEWS.Z_OBJECT_VIEWER,
							params: { dummyParams: 'dummyValue' }
						};
						var expectedParams = {
							dummyParams: 'dummyValue',
							existingParams: 'existingValue'
						};

						context.state.queryParams = { existingParams: 'existingValue' };
						routerInstance.mutations.CHANGE_QUERY_PARAMS = jest.fn();
						routerInstance.actions.navigate( context, payload );

						expect( context.commit ).toHaveBeenCalled();
						expect( context.commit ).toHaveBeenNthCalledWith( 2,
							'CHANGE_QUERY_PARAMS', expectedParams );
					} );
				} );
			} );
		} );

		describe( 'evaluateUri', function () {
			beforeEach(
				function () {
					window.mw.Uri.mockImplementation( function () {
						return {
							query: {}
						};
					} );
				}
			);

			it( 'default current view to Function viewer', function () {

				routerInstance.actions.evaluateUri( context );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch ).toHaveBeenCalledWith(
					'changeCurrentView', Constants.VIEWS.Z_OBJECT_VIEWER );
			} );

			describe( 'when mw.Uri includes a value for "view"', function () {
				var fakeView = 'dummyView',
					fakeParams = 'fakeParameter';
				beforeEach(
					function () {
						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: {
									view: fakeView,
									fakeParams: fakeParams
								}
							};
						} );
					}
				);

				it( 'changes the current view', function () {

					routerInstance.actions.evaluateUri( context );

					expect( context.commit ).toHaveBeenCalled();
					expect( context.commit ).toHaveBeenNthCalledWith( 1,
						'CHANGE_CURRENT_VIEW', fakeView );
				} );

				it( 'changes the query params', function () {

					routerInstance.actions.evaluateUri( context );

					expect( context.commit ).toHaveBeenCalled();
					expect( context.commit ).toHaveBeenNthCalledWith( 2,
						'CHANGE_QUERY_PARAMS', { fakeParams: fakeParams } );
				} );

			} );

			describe( 'changes current view to Function Editor', function () {
				it( 'when query zid is equal tp Z_FUNCTION', function () {
					window.mw.Uri.mockImplementationOnce( function () {
						return {
							query: {
								zid: Constants.Z_FUNCTION
							},
							path: Constants.PATHS.EDIT_Z_OBJECT
						};
					} );

					routerInstance.actions.evaluateUri( context );

					expect( context.dispatch ).toHaveBeenCalled();
					expect( context.dispatch ).toHaveBeenCalledWith(
						'changeCurrentView', Constants.VIEWS.FUNCTION_EDITOR );
				} );
				it( 'when getCurrentZObjectType is equal to Z_FUNCTION', function () {
					context.rootGetters.getCurrentZObjectType = Constants.Z_FUNCTION;
					window.mw.Uri.mockImplementationOnce( function () {
						return {
							path: Constants.PATHS.EDIT_Z_OBJECT,
							query: {}
						};
					} );

					routerInstance.actions.evaluateUri( context );

					expect( context.dispatch ).toHaveBeenCalled();
					expect( context.dispatch ).toHaveBeenCalledWith(
						'changeCurrentView', Constants.VIEWS.FUNCTION_EDITOR );
				} );
			} );

			describe( 'changes current view to Function Viewer', function () {
				it( 'when query zid is equal to Z_FUNCTION', function () {
					window.mw.Uri.mockImplementationOnce( function () {
						return {
							query: {
								zid: Constants.Z_FUNCTION
							}
						};
					} );

					routerInstance.actions.evaluateUri( context );

					expect( context.dispatch ).toHaveBeenCalled();
					expect( context.dispatch ).toHaveBeenCalledWith(
						'changeCurrentView', Constants.VIEWS.FUNCTION_VIEWER );
				} );
				it( 'when getCurrentZObjectType is equal tp Z_FUNCTION', function () {
					context.rootGetters.getCurrentZObjectType = Constants.Z_FUNCTION;

					routerInstance.actions.evaluateUri( context );

					expect( context.dispatch ).toHaveBeenCalled();
					expect( context.dispatch ).toHaveBeenCalledWith(
						'changeCurrentView', Constants.VIEWS.FUNCTION_VIEWER );
				} );
			} );

			describe( 'changes current view to zObject Editor', function () {
				it( 'when uri path is Evaluate function call', function () {
					window.mw.Uri.mockImplementationOnce( function () {
						return {
							path: Constants.PATHS.EVALUTATE_FUNCTION_CALL,
							query: {}
						};
					} );

					routerInstance.actions.evaluateUri( context );

					expect( context.dispatch ).toHaveBeenCalled();
					expect( context.dispatch ).toHaveBeenCalledWith(
						'changeCurrentView', Constants.VIEWS.Z_OBJECT_EDITOR );
				} );
				it( 'when uri path is Create zObject', function () {
					window.mw.Uri.mockImplementationOnce( function () {
						return {
							path: Constants.PATHS.CREATE_Z_OBJECT,
							query: {}
						};
					} );

					routerInstance.actions.evaluateUri( context );

					expect( context.dispatch ).toHaveBeenCalled();
					expect( context.dispatch ).toHaveBeenCalledWith(
						'changeCurrentView', Constants.VIEWS.Z_OBJECT_EDITOR );
				} );
				it( 'when uri path is edit zObject', function () {
					window.mw.Uri.mockImplementationOnce( function () {
						return {
							path: Constants.PATHS.EDIT_Z_OBJECT,
							query: {}
						};
					} );

					routerInstance.actions.evaluateUri( context );

					expect( context.dispatch ).toHaveBeenCalled();
					expect( context.dispatch ).toHaveBeenCalledWith(
						'changeCurrentView', Constants.VIEWS.Z_OBJECT_EDITOR );
				} );
			} );
		} );

		describe( 'changeCurrentView', function () {
			beforeEach( function () {
				window.mw.Uri.mockImplementation( function () {
					return {
						query: {}
					};
				} );
			} );
			it( 'changes the current view with the value provided', function () {
				var dummyView = 'dummyView';
				routerInstance.actions.changeCurrentView( context, dummyView );

				expect( context.commit ).toHaveBeenCalled();
				expect( context.commit ).toHaveBeenCalledWith( 'CHANGE_CURRENT_VIEW', dummyView );
			} );
			it( 'replace history state', function () {
				var dummyView = 'dummyView';
				routerInstance.actions.changeCurrentView( context, dummyView );

				expect( window.history.replaceState ).toHaveBeenCalled();
			} );
			it( 'replace history state with current path', function () {
				var dummyView = 'dummyView',
					fakePath = 'fakePath',
					fakeExistingValue = 'fakeValue';
				window.mw.Uri.mockImplementation( function () {
					return {
						query: {
							existingDummyParams: fakeExistingValue
						},
						path: fakePath
					};
				} );
				routerInstance.actions.changeCurrentView( context, dummyView );

				expect( window.history.replaceState.mock.calls[ 0 ][ 0 ] ).toMatchObject(
					{
						path: fakePath,
						query: {
							existingDummyParams: fakeExistingValue,
							view: dummyView
						}
					}
				);
			} );
			it( 'replace history state with query including new view', function () {
				var dummyView = 'dummyView';
				var expectedQuery = 'fakePath?existingDummyParams=fakeValue&view=dummyView';
				window.mw.Uri.mockImplementation( function () {
					return {
						query: {
							existingDummyParams: 'fakeValue'
						},
						path: 'fakePath'
					};
				} );
				routerInstance.actions.changeCurrentView( context, dummyView );

				expect( window.history.replaceState.mock.calls[ 0 ][ 2 ] ).toBe( expectedQuery );
			} );
		} );
	} );
} );
