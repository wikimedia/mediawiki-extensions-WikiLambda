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
						to: Constants.VIEWS.DEFAULT_VIEW
					};
					routerInstance.actions.navigate( context, payload );

					expect( context.commit ).toHaveBeenCalled();
					expect( context.commit ).toHaveBeenCalledWith(
						'CHANGE_CURRENT_VIEW',
						Constants.VIEWS.DEFAULT_VIEW
					);
				} );

				it( 'call window.history.pushState', function () {
					var payload = {
						to: Constants.VIEWS.DEFAULT_VIEW
					};
					routerInstance.actions.navigate( context, payload );

					expect( window.history.pushState ).toHaveBeenCalled();
				} );

				it( 'call window.history.pushState with path and query as state', function () {
					var payload = {
						to: Constants.VIEWS.DEFAULT_VIEW
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
						to: Constants.VIEWS.DEFAULT_VIEW
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
							to: Constants.VIEWS.DEFAULT_VIEW,
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
							query: {},
							path: new window.mw.Title( Constants.PATHS.CREATE_OBJECT_TITLE ).getUrl()
						};
					} );
				}
			);

			describe( 'Edit Function Route loads Function Editor', function () {
				describe( 'with URL Format One (/w/index.php)', function () {
					it( 'When action is edit and view is not passed', function () {
						context.rootGetters.getCurrentZObjectType = Constants.Z_FUNCTION;

						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: {
									action: Constants.ACTIONS.EDIT,
									title: 'Z0'
								},
								path: new window.mw.Title( 'Z0' ).getUrl( { title: 'Z0', action: Constants.ACTIONS.EDIT } )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_EDITOR );
					} );

					it( 'When action is edit and view is passed as function editor', function () {
						context.rootGetters.getCurrentZObjectType = Constants.Z_FUNCTION;
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0',
							view: Constants.VIEWS.FUNCTION_EDITOR
						};
						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: queryParams,
								path: new window.mw.Title( 'Z0' ).getUrl( queryParams )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_EDITOR );
					} );

					it( 'When action is edit, object is a function and view is passed as default view', function () {
						context.rootGetters.getCurrentZObjectType = Constants.Z_FUNCTION;
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT_VIEW
						};
						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: queryParams,
								path: new window.mw.Title( 'Z0' ).getUrl( queryParams )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_EDITOR );
					} );
				} );

				describe( 'with URL Format Two (/wiki/{{title}})', function () {
					it( 'When action is edit and view is not passed', function () {
						context.rootGetters.getCurrentZObjectType = Constants.Z_FUNCTION;

						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0'
						};

						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: queryParams,
								path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( queryParams )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_EDITOR );
					} );

					it( 'When action is edit and view is passed', function () {
						context.rootGetters.getCurrentZObjectType = Constants.Z_FUNCTION;
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0',
							view: Constants.VIEWS.FUNCTION_EDITOR
						};
						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: queryParams,
								path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( queryParams )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_EDITOR );
					} );

					it( 'When action is edit, object is a function and view is passed as default view', function () {
						context.rootGetters.getCurrentZObjectType = Constants.Z_FUNCTION;
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT_VIEW
						};
						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: queryParams,
								path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( queryParams )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_EDITOR );
					} );
				} );
			} );

			describe( 'Edit ZObject Route loads Default View', function () {
				describe( 'with URL Format One (/w/index.php)', function () {
					it( 'When action is edit and view is not passed', function () {
						window.mw.Uri.mockImplementationOnce( function () {
							const queryParams = {
								action: Constants.ACTIONS.EDIT,
								title: 'Z0'
							};
							return {
								query: queryParams,
								path: new window.mw.Title( 'Z0' ).getUrl( queryParams )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.DEFAULT_VIEW );
					} );

					it( 'When action is edit and view is passed as zoject editor', function () {
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT_VIEW
						};
						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: queryParams,
								path: new window.mw.Title( 'Z0' ).getUrl( queryParams )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.DEFAULT_VIEW );
					} );
				} );

				describe( 'with URL Format Two (/wiki/{{title}})', function () {
					it( 'When action is edit and view is not passed', function () {
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0'
						};

						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: queryParams,
								path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( queryParams )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.DEFAULT_VIEW );
					} );

					it( 'When action is edit and view is passed as zobject editor', function () {
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT_VIEW
						};
						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: queryParams,
								path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( queryParams )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.DEFAULT_VIEW );
					} );
				} );
			} );

			describe( 'View Function Route loads Function Viewer', function () {
				describe( 'with URL Format One (/w/index.php)', function () {
					it( 'When zobject is a function', function () {
						context.rootGetters.getCurrentZObjectType = Constants.Z_FUNCTION;

						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: {
									title: 'Z0'
								},
								path: new window.mw.Title( 'Z0' ).getUrl( { title: 'Z0' } )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_VIEWER );
					} );

					it( 'When zobject is a function and view is passed as function viewer', function () {
						context.rootGetters.getCurrentZObjectType = Constants.Z_FUNCTION;
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.FUNCTION_VIEWER
						};
						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: queryParams,
								path: new window.mw.Title( 'Z0' ).getUrl( queryParams )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_VIEWER );
					} );

					it( 'When zobject is a function and an invalid view is passed', function () {
						context.rootGetters.getCurrentZObjectType = Constants.Z_FUNCTION;
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.FUNCTION_EDITOR
						};
						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: queryParams,
								path: new window.mw.Title( 'Z0' ).getUrl( queryParams )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_VIEWER );
					} );

					it( 'When zobject is a function and default view is passed', function () {
						context.rootGetters.getCurrentZObjectType = Constants.Z_FUNCTION;
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT_VIEW
						};
						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: queryParams,
								path: new window.mw.Title( 'Z0' ).getUrl( queryParams )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_VIEWER );
					} );
				} );

				describe( 'with URL Format Two (/wiki/{{title}})', function () {
					it( 'When zobject is a function', function () {
						context.rootGetters.getCurrentZObjectType = Constants.Z_FUNCTION;

						const queryParams = {
							title: 'Z0'
						};
						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: queryParams,
								path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( queryParams )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_VIEWER );
					} );

					it( 'When zobject is a function and view is passed as function viewer', function () {
						context.rootGetters.getCurrentZObjectType = Constants.Z_FUNCTION;
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.FUNCTION_VIEWER
						};
						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: queryParams,
								path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( queryParams )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_VIEWER );
					} );

					it( 'When zobject is a function and an invalid view is passed', function () {
						context.rootGetters.getCurrentZObjectType = Constants.Z_FUNCTION;
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.FUNCTION_EDITOR
						};
						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: queryParams,
								path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( queryParams )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_VIEWER );
					} );

					it( 'When zobject is a function and default view is passed', function () {
						context.rootGetters.getCurrentZObjectType = Constants.Z_FUNCTION;
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT_VIEW
						};
						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: queryParams,
								path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( queryParams )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_VIEWER );
					} );
				} );
			} );

			describe( 'View ZObject Route loads ZObject Viewer', function () {
				describe( 'with URL Format One (/w/index.php)', function () {
					it( 'When view is not passed', function () {
						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: {
									title: 'Z0'
								},
								path: new window.mw.Title( 'Z0' ).getUrl( { title: 'Z0', action: Constants.ACTIONS.EDIT } )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.DEFAULT_VIEW );
					} );

					it( 'When view is passed as zoject viewer', function () {
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT_VIEW
						};
						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: queryParams,
								path: new window.mw.Title( 'Z0' ).getUrl( queryParams )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.DEFAULT_VIEW );
					} );
				} );

				describe( 'with URL Format Two (/wiki/{{title}})', function () {
					it( 'When view is not passed', function () {
						const queryParams = {
							title: 'Z0'
						};

						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: queryParams,
								path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( queryParams )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.DEFAULT_VIEW );
					} );

					it( 'When view is passed as zobject viewer', function () {
						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: {
									title: 'Z0',
									view: Constants.VIEWS.DEFAULT_VIEW
								},
								path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( { view: Constants.VIEWS.DEFAULT_VIEW } )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.DEFAULT_VIEW );
					} );
				} );
			} );

			describe( 'Create Function Route loads Function Editor', function () {
				describe( 'with URL Format One (/w/index.php)', function () {
					it( 'When zid is passed as Z8(Z_FUNCTION)', function () {
						const queryParams = {
							zid: Constants.Z_FUNCTION
						};
						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: queryParams,
								path: new window.mw.Title( Constants.PATHS.CREATE_OBJECT_TITLE ).getUrl( queryParams )
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_EDITOR );
					} );
				} );

				describe( 'with URL Format Two (/wiki/{{title}})', function () {
					it( 'When zid is passed as Z8(Z_FUNCTION)', function () {
						const queryParams = {
							zid: Constants.Z_FUNCTION
						};
						window.mw.Uri.mockImplementationOnce( function () {
							return {
								query: queryParams,
								path: new window.mw.Title( Constants.PATHS.CREATE_OBJECT_TITLE ).getUrl()
							};
						} );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_EDITOR );
					} );
				} );
			} );

			describe( 'Create ZObject Route loads ZObject Editor', function () {
				it( 'with URL Format One (/w/index.php)', function () {
					window.mw.Uri.mockImplementationOnce( function () {
						return {
							query: {
								title: Constants.PATHS.CREATE_OBJECT_TITLE,
								zid: Constants.Z_IMPLEMENTATION
							},
							path: new window.mw.Title( Constants.PATHS.CREATE_OBJECT_TITLE )
								.getUrl( { zid: Constants.Z_IMPLEMENTATION } )
						};
					} );

					routerInstance.actions.evaluateUri( context );

					expect( context.dispatch ).toHaveBeenCalled();
					expect( context.dispatch ).toHaveBeenCalledWith(
						'changeCurrentView', Constants.VIEWS.DEFAULT_VIEW );
				} );

				it( 'with URL Format Two (/wiki/{{title}})', function () {
					window.mw.Uri.mockImplementationOnce( function () {
						return {
							query: {},
							path: new window.mw.Title( Constants.PATHS.CREATE_OBJECT_TITLE ).getUrl()
						};
					} );

					routerInstance.actions.evaluateUri( context );

					expect( context.dispatch ).toHaveBeenCalled();
					expect( context.dispatch ).toHaveBeenCalledWith(
						'changeCurrentView', Constants.VIEWS.DEFAULT_VIEW );
				} );
			} );

			describe( 'Evaluate Function Route loads Function Evaluator view', function () {
				it( 'with URL Format One (/w/index.php)', function () {
					window.mw.Uri.mockImplementationOnce( function () {
						return {
							query: {
								title: Constants.PATHS.RUN_FUNCTION_TITLE
							},
							path: new window.mw.Title( Constants.PATHS.RUN_FUNCTION_TITLE )
								.getUrl( { title: Constants.PATHS.RUN_FUNCTION_TITLE } )
						};
					} );

					routerInstance.actions.evaluateUri( context );

					expect( context.dispatch ).toHaveBeenCalled();
					expect( context.dispatch ).toHaveBeenCalledWith(
						'changeCurrentView', Constants.VIEWS.FUNCTION_EVALUATOR );
				} );

				it( 'with URL Format Two (/wiki/{{title}})', function () {
					window.mw.Uri.mockImplementationOnce( function () {
						return {
							query: {},
							path: new window.mw.Title( Constants.PATHS.RUN_FUNCTION_TITLE ).getUrl()
						};
					} );

					routerInstance.actions.evaluateUri( context );

					expect( context.dispatch ).toHaveBeenCalled();
					expect( context.dispatch ).toHaveBeenCalledWith(
						'changeCurrentView', Constants.VIEWS.FUNCTION_EVALUATOR );
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
