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

			it( 'default current view to zObject viewer', function () {

				routerInstance.actions.evaluateUri( context );

				expect( context.dispatch ).toHaveBeenCalled();
				expect( context.dispatch ).toHaveBeenCalledWith(
					'changeCurrentView', Constants.VIEWS.Z_OBJECT_VIEWER );
			} );

			describe( 'when mw.Uri includes a value for "view"', function () {
				it( 'changes the current view', function () {
					var fakeView = 'zobject-viewer',
						fakeParams = 'fakeParameter';
					window.mw.Uri.mockImplementationOnce( function () {
						return {
							query: {
								view: fakeView,
								fakeParams: fakeParams
							}
						};
					} );

					routerInstance.actions.evaluateUri( context );

					expect( context.dispatch ).toHaveBeenCalled();
					expect( context.dispatch ).toHaveBeenNthCalledWith( 1, 'changeCurrentView', fakeView );
				} );

				it( 'renders VIEW_Z_OBJECT when the view passed is equal to Z_OBJECT_VIEWER and ZID is Z_FUNCTION', function () {
					window.mw.Uri.mockImplementationOnce( function () {
						return {
							query: {
								zid: Constants.Z_FUNCTION,
								view: Constants.VIEWS.Z_OBJECT_VIEWER
							},
							path: Constants.PATHS.VIEW_Z_OBJECT
						};
					} );

					routerInstance.actions.evaluateUri( context );

					expect( context.dispatch ).toHaveBeenCalled();
					expect( context.dispatch ).toHaveBeenCalledWith(
						'changeCurrentView', Constants.VIEWS.Z_OBJECT_VIEWER );
				} );

			} );

			describe( 'changes current view to Function Editor', function () {
				it( 'when query zid is equal to Z_FUNCTION', function () {
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
				it( 'when view is FUNCTION_EDITOR and it is a new zObject page', function () {
					context.rootGetters.getCurrentZObjectType = Constants.Z_FUNCTION;
					window.mw.Uri.mockImplementationOnce( function () {
						return {
							query: {
								zid: Constants.Z_FUNCTION,
								view: Constants.VIEWS.FUNCTION_EDITOR
							},
							path: Constants.PATHS.CREATE_Z_OBJECT
						};
					} );

					mw.Title = jest.fn( function ( title ) {
						return {
							getUrl: jest.fn( function () {
								return '/wiki/' + title;
							} )
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
							path: Constants.PATHS.EVALUATE_FUNCTION_CALL,
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

				it( 'when uri path is edit zObject(function) and the view passed is equal to zObject editor', function () {
					window.mw.Uri.mockImplementationOnce( function () {
						return {
							query: {
								zid: Constants.Z_FUNCTION,
								view: Constants.VIEWS.Z_OBJECT_EDITOR
							},
							path: Constants.PATHS.EDIT_Z_OBJECT
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
			it( 'does not replace history state if view is not set in query param', function () {
				var dummyView = 'dummyView';
				routerInstance.actions.changeCurrentView( context, dummyView );

				expect( window.history.replaceState ).not.toHaveBeenCalled();
			} );
			it( 'does not replace history state if view set in query param is the view passed', function () {
				var dummyView = 'dummyView';
				routerInstance.actions.changeCurrentView( context, dummyView );

				expect( window.history.replaceState ).not.toHaveBeenCalled();
			} );
			it( 'replace history state with current view', function () {
				var dummyView = 'dummyView',
					fakePath = 'fakePath',
					fakeExistingValue = 'fakeValue';
				window.mw.Uri.mockImplementation( function () {
					return {
						query: {
							view: 'initialDummyView',
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
		} );
	} );
} );
