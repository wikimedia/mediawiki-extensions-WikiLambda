/*!
 * WikiLambda unit test suite for the router Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' );

describe( 'router Vuex module', () => {

	let routerInstance;

	beforeEach( () => {
		jest.resetModules();
		routerInstance = require( '../../../../resources/ext.wikilambda.edit/store/modules/router.js' );
	} );

	afterEach( () => {
		routerInstance = null;
	} );

	describe( 'Getters', () => {
		describe( 'getCurrentView', () => {
			it( 'Returns the current view', () => {
				routerInstance.state.currentView = 'DummyView';
				const getCurrentView = routerInstance.getters.getCurrentView;

				expect( getCurrentView( routerInstance.state ) ).toBe( routerInstance.state.currentView );
			} );
		} );

		describe( 'getQueryParams', () => {
			it( 'Returns the current queryParams', () => {
				routerInstance.state.queryParams = 'DummyQueryParams';
				const getQueryParams = routerInstance.getters.getQueryParams;

				expect( getQueryParams( routerInstance.state ) ).toBe( routerInstance.state.queryParams );
			} );
		} );

		describe( 'getViewMode', () => {
			it( 'gets current view mode', () => {
				window.mw.config = {
					get: jest.fn( () => ( {
						viewmode: true
					} ) )
				};
				expect( routerInstance.getters.getViewMode( routerInstance.state ) ).toBe( true );
			} );
		} );
	} );

	describe( 'Mutations', () => {
		describe( 'CHANGE_CURRENT_VIEW', () => {
			it( 'Updates the current View', () => {
				const dummyView = 'DummyView';

				expect( routerInstance.state.currentView ).toBe( routerInstance.state.currentView );
				routerInstance.mutations.CHANGE_CURRENT_VIEW( routerInstance.state, dummyView );

				expect( routerInstance.state.currentView ).toBe( dummyView );
			} );
		} );

		describe( 'CHANGE_QUERY_PARAMS', () => {
			it( 'Updates the current View', () => {
				const dummyParams = 'DummyParams';

				expect( routerInstance.state.queryParams ).toBe( routerInstance.state.queryParams );
				routerInstance.mutations.CHANGE_QUERY_PARAMS( routerInstance.state, dummyParams );

				expect( routerInstance.state.queryParams ).toBe( dummyParams );
			} );
		} );
	} );

	describe( 'Actions', () => {
		let context;

		beforeEach( () => {
			context = Object.assign( {}, {
				commit: jest.fn(),
				dispatch: jest.fn(),
				state: Object.assign( {}, routerInstance.state ),
				getters: {
					getViewMode: true,
					getCurrentZObjectType: true
				}
			} );

			window.history.pushState = jest.fn();
			window.history.replaceState = jest.fn();
		} );

		describe( 'navigate', () => {
			it( 'does not trigger navigation when view is invalid', () => {
				const payload = {
					to: 'InvalidValidation'
				};
				routerInstance.actions.navigate( context, payload );

				expect( context.commit ).not.toHaveBeenCalled();
			} );

			describe( 'when view is valid', () => {
				it( 'triggers a CHANGE_CURRENT_VIEW mutation', () => {
					const payload = {
						to: Constants.VIEWS.DEFAULT_VIEW
					};
					routerInstance.actions.navigate( context, payload );

					expect( context.commit ).toHaveBeenCalled();
					expect( context.commit ).toHaveBeenCalledWith(
						'CHANGE_CURRENT_VIEW',
						Constants.VIEWS.DEFAULT_VIEW
					);
				} );

				it( 'call window.history.pushState', () => {
					const payload = {
						to: Constants.VIEWS.DEFAULT_VIEW
					};
					routerInstance.actions.navigate( context, payload );

					expect( window.history.pushState ).toHaveBeenCalled();
				} );

				it( 'call window.history.pushState with path and query as state', () => {
					const payload = {
						to: Constants.VIEWS.DEFAULT_VIEW
					};
					const expectedObject = {
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

				it( 'call window.history.pushState with argument as query string', () => {
					const payload = {
						to: Constants.VIEWS.DEFAULT_VIEW
					};
					const expectedQueryString = 'dummyPath?dummyParams=dummyValue&view=dummyView';

					context.state.currentPath = 'dummyPath';
					context.state.currentView = 'dummyView';
					context.state.queryParams = { dummyParams: 'dummyValue' };
					routerInstance.actions.navigate( context, payload );

					expect( window.history.pushState.mock.calls[ 0 ][ 2 ] ).toBe( expectedQueryString );
				} );

				describe( 'when params are passed', () => {
					it( 'calls CHANGE_QUERY_PARAMS mutation', () => {
						const payload = {
							to: Constants.VIEWS.DEFAULT_VIEW,
							params: { dummyParams: 'dummyValue' }
						};
						const expectedParams = {
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

		describe( 'evaluateUri', () => {

			describe( 'Edit Function Route loads Function Editor', () => {
				beforeEach( () => {
					// Mock function edit config
					context.getters.getViewMode = false;
					window.mw.config = {
						get: jest.fn( () => ( {
							createNewPage: false,
							viewmode: false,
							title: 'Z0',
							zId: 'Z0'
						} ) )
					};
				} );

				describe( 'with URL Format One (/w/index.php)', () => {
					it( 'When action is edit and view is not passed', () => {
						context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;

						window.mw.Uri.mockImplementationOnce( () => ( {
							query: {
								action: Constants.ACTIONS.EDIT,
								title: 'Z0'
							},
							path: new window.mw.Title( 'Z0' ).getUrl( { title: 'Z0', action: Constants.ACTIONS.EDIT } )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_EDITOR );
					} );

					it( 'When action is edit and view is passed as function editor', () => {
						context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0',
							view: Constants.VIEWS.FUNCTION_EDITOR
						};
						window.mw.Uri.mockImplementationOnce( () => ( {
							query: queryParams,
							path: new window.mw.Title( 'Z0' ).getUrl( queryParams )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_EDITOR );
					} );

					it( 'When action is edit, object is a function and view is passed as default view', () => {
						context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT_VIEW
						};
						window.mw.Uri.mockImplementationOnce( () => ( {
							query: queryParams,
							path: new window.mw.Title( 'Z0' ).getUrl( queryParams )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_EDITOR );
					} );
				} );

				describe( 'with URL Format Two (/wiki/{{title}})', () => {
					it( 'When action is edit and view is not passed', () => {
						context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;

						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0'
						};

						window.mw.Uri.mockImplementationOnce( () => ( {
							query: queryParams,
							path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( queryParams )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_EDITOR );
					} );

					it( 'When action is edit and view is passed', () => {
						context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0',
							view: Constants.VIEWS.FUNCTION_EDITOR
						};
						window.mw.Uri.mockImplementationOnce( () => ( {
							query: queryParams,
							path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( queryParams )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_EDITOR );
					} );

					it( 'When action is edit, object is a function and view is passed as default view', () => {
						context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT_VIEW
						};
						window.mw.Uri.mockImplementationOnce( () => ( {
							query: queryParams,
							path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( queryParams )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_EDITOR );
					} );
				} );
			} );

			describe( 'Edit ZObject Route loads Default View', () => {
				beforeEach( () => {
					// Mock non-function edit config
					context.getters.getViewMode = false;
					window.mw.config = {
						get: jest.fn( () => ( {
							createNewPage: false,
							viewmode: false,
							title: 'Z0',
							zId: 'Z0'
						} ) )
					};
				} );

				describe( 'with URL Format One (/w/index.php)', () => {
					it( 'When action is edit and view is not passed', () => {
						window.mw.Uri.mockImplementationOnce( () => {
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

					it( 'When action is edit and view is passed as zoject editor', () => {
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT_VIEW
						};
						window.mw.Uri.mockImplementationOnce( () => ( {
							query: queryParams,
							path: new window.mw.Title( 'Z0' ).getUrl( queryParams )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.DEFAULT_VIEW );
					} );
				} );

				describe( 'with URL Format Two (/wiki/{{title}})', () => {
					it( 'When action is edit and view is not passed', () => {
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0'
						};

						window.mw.Uri.mockImplementationOnce( () => ( {
							query: queryParams,
							path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( queryParams )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.DEFAULT_VIEW );
					} );

					it( 'When action is edit and view is passed as zobject editor', () => {
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT_VIEW
						};
						window.mw.Uri.mockImplementationOnce( () => ( {
							query: queryParams,
							path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( queryParams )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.DEFAULT_VIEW );
					} );
				} );
			} );

			describe( 'View Function Route loads Function Viewer', () => {
				beforeEach( () => {
					// Mock function view config
					context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;
					window.mw.config = {
						get: jest.fn( () => ( {
							createNewPage: false,
							viewmode: true,
							title: 'Z0',
							zId: 'Z0'
						} ) )
					};
				} );

				describe( 'with URL Format One (/w/index.php)', () => {
					it( 'When zobject is a function', () => {
						context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;

						window.mw.Uri.mockImplementationOnce( () => ( {
							query: {
								title: 'Z0'
							},
							path: new window.mw.Title( 'Z0' ).getUrl( { title: 'Z0' } )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_VIEWER );
					} );

					it( 'When zobject is a function and view is passed as function viewer', () => {
						context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.FUNCTION_VIEWER
						};
						window.mw.Uri.mockImplementationOnce( () => ( {
							query: queryParams,
							path: new window.mw.Title( 'Z0' ).getUrl( queryParams )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_VIEWER );
					} );

					it( 'When zobject is a function and an invalid view is passed', () => {
						context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.FUNCTION_EDITOR
						};
						window.mw.Uri.mockImplementationOnce( () => ( {
							query: queryParams,
							path: new window.mw.Title( 'Z0' ).getUrl( queryParams )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_VIEWER );
					} );

					it( 'When zobject is a function and default view is passed', () => {
						context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT_VIEW
						};
						window.mw.Uri.mockImplementationOnce( () => ( {
							query: queryParams,
							path: new window.mw.Title( 'Z0' ).getUrl( queryParams )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_VIEWER );
					} );
				} );

				describe( 'with URL Format Two (/wiki/{{title}})', () => {
					it( 'When zobject is a function', () => {
						context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;

						const queryParams = {
							title: 'Z0'
						};
						window.mw.Uri.mockImplementationOnce( () => ( {
							query: queryParams,
							path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( queryParams )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_VIEWER );
					} );

					it( 'When zobject is a function and view is passed as function viewer', () => {
						context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.FUNCTION_VIEWER
						};
						window.mw.Uri.mockImplementationOnce( () => ( {
							query: queryParams,
							path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( queryParams )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_VIEWER );
					} );

					it( 'When zobject is a function and an invalid view is passed', () => {
						context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.FUNCTION_EDITOR
						};
						window.mw.Uri.mockImplementationOnce( () => ( {
							query: queryParams,
							path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( queryParams )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_VIEWER );
					} );

					it( 'When zobject is a function and default view is passed', () => {
						context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT_VIEW
						};
						window.mw.Uri.mockImplementationOnce( () => ( {
							query: queryParams,
							path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( queryParams )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_VIEWER );
					} );
				} );
			} );

			describe( 'View ZObject Route loads ZObject Viewer', () => {
				beforeEach( () => {
					// Mock non-function view config
					window.mw.config = {
						get: jest.fn( () => ( {
							createNewPage: true,
							viewmode: true,
							title: 'Z0',
							zId: 'Z0'
						} ) )
					};
				} );

				describe( 'with URL Format One (/w/index.php)', () => {
					it( 'When view is not passed', () => {
						window.mw.Uri.mockImplementationOnce( () => ( {
							query: {
								title: 'Z0'
							},
							path: new window.mw.Title( 'Z0' ).getUrl( { title: 'Z0', action: Constants.ACTIONS.EDIT } )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.DEFAULT_VIEW );
					} );

					it( 'When view is passed as zoject viewer', () => {
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT_VIEW
						};
						window.mw.Uri.mockImplementationOnce( () => ( {
							query: queryParams,
							path: new window.mw.Title( 'Z0' ).getUrl( queryParams )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.DEFAULT_VIEW );
					} );
				} );

				describe( 'with URL Format Two (/wiki/{{title}})', () => {
					it( 'When view is not passed', () => {
						const queryParams = {
							title: 'Z0'
						};

						window.mw.Uri.mockImplementationOnce( () => ( {
							query: queryParams,
							path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( queryParams )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.DEFAULT_VIEW );
					} );

					it( 'When view is passed as zobject viewer', () => {
						window.mw.Uri.mockImplementationOnce( () => ( {
							query: {
								title: 'Z0',
								view: Constants.VIEWS.DEFAULT_VIEW
							},
							path: new window.mw.Title( 'Z0' ).getUrl() + '?' + global.toQueryParam( { view: Constants.VIEWS.DEFAULT_VIEW } )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.DEFAULT_VIEW );
					} );
				} );
			} );

			describe( 'Create Function Route loads Function Editor', () => {
				beforeEach( () => {
					// Mock function create config
					context.getters.getViewMode = false;
					window.mw.config = {
						get: jest.fn( () => ( {
							createNewPage: true,
							viewmode: false,
							title: 'Z0',
							zId: 'Z0'
						} ) )
					};
				} );

				describe( 'with URL Format One (/w/index.php)', () => {
					it( 'When zid is passed as Z8(Z_FUNCTION)', () => {
						const queryParams = {
							zid: Constants.Z_FUNCTION
						};
						window.mw.Uri.mockImplementationOnce( () => ( {
							query: queryParams,
							path: new window.mw.Title( Constants.PATHS.CREATE_OBJECT_TITLE ).getUrl( queryParams )
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_EDITOR );
					} );
				} );

				describe( 'with URL Format Two (/wiki/{{title}})', () => {
					it( 'When zid is passed as Z8(Z_FUNCTION)', () => {
						const queryParams = {
							zid: Constants.Z_FUNCTION
						};
						window.mw.Uri.mockImplementationOnce( () => ( {
							query: queryParams,
							path: new window.mw.Title( Constants.PATHS.CREATE_OBJECT_TITLE ).getUrl()
						} ) );

						routerInstance.actions.evaluateUri( context );

						expect( context.dispatch ).toHaveBeenCalled();
						expect( context.dispatch ).toHaveBeenCalledWith(
							'changeCurrentView', Constants.VIEWS.FUNCTION_EDITOR );
					} );
				} );
			} );

			describe( 'Create ZObject Route loads ZObject Editor', () => {
				beforeEach( () => {
					// Mock non-function create config
					context.getters.getViewMode = false;
					window.mw.config = {
						get: jest.fn( () => ( {
							createNewPage: true,
							viewmode: false,
							title: 'Z0',
							zId: 'Z0'
						} ) )
					};
				} );

				it( 'with URL Format One (/w/index.php)', () => {
					window.mw.Uri.mockImplementationOnce( () => ( {
						query: {
							title: Constants.PATHS.CREATE_OBJECT_TITLE,
							zid: Constants.Z_IMPLEMENTATION
						},
						path: new window.mw.Title( Constants.PATHS.CREATE_OBJECT_TITLE )
							.getUrl( { zid: Constants.Z_IMPLEMENTATION } )
					} ) );

					routerInstance.actions.evaluateUri( context );

					expect( context.dispatch ).toHaveBeenCalled();
					expect( context.dispatch ).toHaveBeenCalledWith(
						'changeCurrentView', Constants.VIEWS.DEFAULT_VIEW );
				} );

				it( 'with URL Format Two (/wiki/{{title}})', () => {
					window.mw.Uri.mockImplementationOnce( () => ( {
						query: {},
						path: new window.mw.Title( Constants.PATHS.CREATE_OBJECT_TITLE ).getUrl()
					} ) );

					routerInstance.actions.evaluateUri( context );

					expect( context.dispatch ).toHaveBeenCalled();
					expect( context.dispatch ).toHaveBeenCalledWith(
						'changeCurrentView', Constants.VIEWS.DEFAULT_VIEW );
				} );
			} );

			describe( 'Evaluate Function Route loads Function Evaluator view', () => {
				beforeEach( () => {
					// Mock function create config
					context.getters.getViewMode = false;
					window.mw.config = {
						get: jest.fn( () => ( {
							createNewPage: false,
							viewmode: false,
							runFunction: true
						} ) )
					};
				} );

				it( 'with URL Format One (/w/index.php)', () => {
					window.mw.Uri.mockImplementationOnce( () => ( {
						query: {
							title: Constants.PATHS.RUN_FUNCTION_TITLE
						},
						path: new window.mw.Title( Constants.PATHS.RUN_FUNCTION_TITLE )
							.getUrl( { title: Constants.PATHS.RUN_FUNCTION_TITLE } )
					} ) );

					routerInstance.actions.evaluateUri( context );

					expect( context.dispatch ).toHaveBeenCalled();
					expect( context.dispatch ).toHaveBeenCalledWith(
						'changeCurrentView', Constants.VIEWS.FUNCTION_EVALUATOR );
				} );

				it( 'with URL Format Two (/wiki/{{title}})', () => {
					window.mw.Uri.mockImplementationOnce( () => ( {
						query: {},
						path: new window.mw.Title( Constants.PATHS.RUN_FUNCTION_TITLE ).getUrl()
					} ) );

					routerInstance.actions.evaluateUri( context );

					expect( context.dispatch ).toHaveBeenCalled();
					expect( context.dispatch ).toHaveBeenCalledWith(
						'changeCurrentView', Constants.VIEWS.FUNCTION_EVALUATOR );
				} );
			} );
		} );

		describe( 'changeCurrentView', () => {
			beforeEach( () => {
				window.mw.Uri.mockImplementation( () => ( {
					query: {}
				} ) );
			} );

			it( 'changes the current view with the value provided', () => {
				const dummyView = 'dummyView';
				routerInstance.actions.changeCurrentView( context, dummyView );

				expect( context.commit ).toHaveBeenCalled();
				expect( context.commit ).toHaveBeenCalledWith( 'CHANGE_CURRENT_VIEW', dummyView );
			} );

			it( 'does not replace history state if view is not set in query param', () => {
				const dummyView = 'dummyView';
				routerInstance.actions.changeCurrentView( context, dummyView );

				expect( window.history.replaceState ).not.toHaveBeenCalled();
			} );

			it( 'does not replace history state if view set in query param is the view passed', () => {
				const dummyView = 'dummyView';
				routerInstance.actions.changeCurrentView( context, dummyView );

				expect( window.history.replaceState ).not.toHaveBeenCalled();
			} );

			it( 'replace history state with current view', () => {
				const dummyView = 'dummyView',
					fakePath = 'fakePath',
					fakeExistingValue = 'fakeValue';
				window.mw.Uri.mockImplementation( () => ( {
					query: {
						view: 'initialDummyView',
						existingDummyParams: fakeExistingValue
					},
					path: fakePath
				} ) );
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
