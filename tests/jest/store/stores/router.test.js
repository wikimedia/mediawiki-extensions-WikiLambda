/*!
 * WikiLambda unit test suite for the router Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { createPinia, setActivePinia } = require( 'pinia' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const { buildUrl } = require( '../../helpers/urlHelpers.js' );
const { mockWindowLocation, restoreWindowLocation } = require( '../../fixtures/location.js' );

describe( 'Router Pinia store', () => {
	let store;
	const dummyView = 'DummyView';
	const dummyQueryParams = 'DummyQueryParams';

	beforeEach( () => {
		mockWindowLocation( buildUrl( Constants.PATHS.ROUTE_FORMAT_ONE ) );
		setActivePinia( createPinia() );
		store = useMainStore();

		store.currentPath = window.location.pathname;
		store.currentView = Constants.VIEWS.Z_OBJECT_VIEWER;
		store.queryParams = {};
	} );

	afterEach( () => {
		restoreWindowLocation();
		jest.resetModules();
	} );

	describe( 'Getters', () => {
		describe( 'getCurrentView', () => {
			it( 'Returns the current view', () => {
				store.currentView = dummyView;
				expect( store.getCurrentView ).toBe( dummyView );
			} );
		} );

		describe( 'getQueryParams', () => {
			it( 'Returns the current queryParams', () => {
				store.queryParams = dummyQueryParams;
				expect( store.getQueryParams ).toBe( dummyQueryParams );
			} );
		} );

		describe( 'getViewMode', () => {
			it( 'gets current view mode', () => {
				window.mw.config = {
					get: jest.fn( () => ( {
						viewmode: true
					} ) )
				};
				expect( store.getViewMode ).toBe( true );
			} );
		} );

		describe( 'getWikilambdaConfig', () => {
			it( 'Returns the WikiLambda configuration', () => {
				const mockConfig = { someKey: 'someValue' };
				window.mw.config = {
					get: jest.fn( () => mockConfig )
				};

				expect( store.getWikilambdaConfig ).toEqual( mockConfig );
			} );
		} );
	} );

	describe( 'Actions', () => {
		describe( 'navigate', () => {
			it( 'does not change view when view is invalid', () => {
				const payload = {
					to: 'InvalidValidation'
				};
				store.navigate( payload );

				expect( store.currentView ).toBe( Constants.VIEWS.Z_OBJECT_VIEWER );
				expect( window.history.pushState ).not.toHaveBeenCalled();
			} );

			describe( 'when view is valid', () => {
				it( 'changes the view', () => {
					const payload = {
						to: Constants.VIEWS.DEFAULT
					};
					store.navigate( payload );

					expect( store.currentView ).toBe( Constants.VIEWS.DEFAULT );
				} );

				it( 'call window.history.pushState', () => {
					const payload = {
						to: Constants.VIEWS.DEFAULT
					};
					store.navigate( payload );

					expect( window.history.pushState ).toHaveBeenCalled();
				} );

				it( 'call window.history.pushState with path and query as state', () => {
					store.currentPath = 'dummyPath';
					store.queryParams = { dummyParams: 'dummyValue' };

					const payload = {
						to: Constants.VIEWS.DEFAULT
					};
					const expectedObject = {
						path: '/dummyPath',
						query: {
							dummyParams: 'dummyValue',
							view: Constants.VIEWS.DEFAULT
						}
					};

					store.navigate( payload );

					expect( window.history.pushState.mock.calls[ 0 ][ 0 ] ).toMatchObject( expectedObject );
				} );

				it( 'call window.history.pushState with argument as query string', () => {
					store.currentPath = 'dummyPath';
					store.queryParams = { dummyParams: 'dummyValue' };

					const payload = {
						to: Constants.VIEWS.DEFAULT
					};
					const expectedQueryString = 'http://localhost/dummyPath?dummyParams=dummyValue&view=default-view';

					store.navigate( payload );

					expect( window.history.pushState.mock.calls[ 0 ][ 2 ] ).toBe( expectedQueryString );
				} );

				describe( 'when params are passed', () => {
					it( 'sets the queryParams', () => {
						const payload = {
							to: Constants.VIEWS.DEFAULT,
							params: { dummyParams: 'dummyValue' }
						};
						const expectedParams = {
							dummyParams: 'dummyValue',
							existingParams: 'existingValue'
						};

						store.queryParams = { existingParams: 'existingValue' };

						store.navigate( payload );

						expect( store.queryParams ).toEqual( expectedParams );
					} );
				} );
			} );
		} );

		describe( 'evaluateUri', () => {

			describe( 'Edit Function Route loads Function Editor', () => {
				beforeEach( () => {
					Object.defineProperty( store, 'getCurrentZObjectType', {
						value: Constants.Z_FUNCTION
					} );
					store.changeCurrentView = jest.fn();
					// Mock function edit config
					Object.defineProperty( store, 'getViewMode', {
						value: false
					} );
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
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0'
						};
						mockWindowLocation( buildUrl( Constants.PATHS.ROUTE_FORMAT_ONE, queryParams ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.FUNCTION_EDITOR );
					} );

					it( 'When action is edit and view is passed as function editor', () => {
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0',
							view: Constants.VIEWS.FUNCTION_EDITOR
						};
						mockWindowLocation( buildUrl( Constants.PATHS.ROUTE_FORMAT_ONE, queryParams ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.FUNCTION_EDITOR );
					} );

					it( 'When action is edit, object is a function and view is passed as default view', () => {
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT
						};
						mockWindowLocation( buildUrl( Constants.PATHS.ROUTE_FORMAT_ONE, queryParams ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.FUNCTION_EDITOR );
					} );
				} );

				describe( 'with URL Format Two (/wiki/{{title}})', () => {
					it( 'When action is edit and view is not passed', () => {
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0'
						};
						const baseUrl = `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ queryParams.title }`;
						mockWindowLocation( buildUrl( baseUrl, { action: queryParams.action } ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.FUNCTION_EDITOR );
					} );

					it( 'When action is edit and view is passed as function editor', () => {
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0',
							view: Constants.VIEWS.FUNCTION_EDITOR
						};
						const baseUrl = `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ queryParams.title }`;
						mockWindowLocation( buildUrl( baseUrl, { action: queryParams.action, view: queryParams.view } ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.FUNCTION_EDITOR );
					} );

					it( 'When action is edit, object is a function and view is passed as default view', () => {
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT
						};
						const baseUrl = `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ queryParams.title }`;
						mockWindowLocation( buildUrl( baseUrl, { action: queryParams.action, view: queryParams.view } ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.FUNCTION_EDITOR );
					} );
				} );
			} );

			describe( 'Edit ZObject Route loads Default View', () => {
				beforeEach( () => {
					store.changeCurrentView = jest.fn();
					// Mock non-function edit config
					Object.defineProperty( store, 'getViewMode', {
						value: false
					} );
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
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0'
						};
						mockWindowLocation( buildUrl( Constants.PATHS.ROUTE_FORMAT_ONE, queryParams ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.DEFAULT );
					} );

					it( 'When action is edit and view is passed as zoject editor', () => {
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT
						};
						mockWindowLocation( buildUrl( Constants.PATHS.ROUTE_FORMAT_ONE, queryParams ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.DEFAULT );
					} );
				} );

				describe( 'with URL Format Two (/wiki/{{title}})', () => {
					beforeEach( () => {
						store.changeCurrentView = jest.fn();
					} );

					it( 'When action is edit and view is not passed', () => {
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0'
						};
						const baseUrl = `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ queryParams.title }`;
						mockWindowLocation( buildUrl( baseUrl, { action: queryParams.action } ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.DEFAULT );
					} );

					it( 'When action is edit and view is passed as zobject editor', () => {
						const queryParams = {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT
						};
						const baseUrl = `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ queryParams.title }`;
						mockWindowLocation( buildUrl( baseUrl, { action: queryParams.action, view: queryParams.view } ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.DEFAULT );
					} );
				} );
			} );

			describe( 'View Function Route loads Function Viewer', () => {
				beforeEach( () => {
					store.changeCurrentView = jest.fn();
					// Mock function view config
					Object.defineProperty( store, 'getCurrentZObjectType', {
						value: Constants.Z_FUNCTION
					} );

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
						const queryParams = {
							title: 'Z0'
						};
						mockWindowLocation( buildUrl( Constants.PATHS.ROUTE_FORMAT_ONE, queryParams ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.FUNCTION_VIEWER );
					} );

					it( 'When zobject is a function and view is passed as function viewer', () => {
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.FUNCTION_VIEWER
						};
						mockWindowLocation( buildUrl( Constants.PATHS.ROUTE_FORMAT_ONE, queryParams ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.FUNCTION_VIEWER );
					} );

					it( 'When zobject is a function and an invalid view is passed', () => {
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.FUNCTION_EDITOR
						};
						mockWindowLocation( buildUrl( Constants.PATHS.ROUTE_FORMAT_ONE, queryParams ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.FUNCTION_VIEWER );
					} );

					it( 'When zobject is a function and default view is passed', () => {
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT
						};
						mockWindowLocation( buildUrl( Constants.PATHS.ROUTE_FORMAT_ONE, queryParams ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.FUNCTION_VIEWER );
					} );
				} );

				describe( 'with URL Format Two (/wiki/{{title}})', () => {
					it( 'When zobject is a function', () => {
						const queryParams = {
							title: 'Z0'
						};
						const baseUrl = `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ queryParams.title }`;
						mockWindowLocation( buildUrl( baseUrl ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.FUNCTION_VIEWER );
					} );

					it( 'When zobject is a function and view is passed as function viewer', () => {
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.FUNCTION_VIEWER
						};
						const baseUrl = `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ queryParams.title }`;
						mockWindowLocation( buildUrl( baseUrl, { view: queryParams.view } ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.FUNCTION_VIEWER );
					} );

					it( 'When zobject is a function and an invalid view is passed', () => {
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.FUNCTION_EDITOR
						};
						const baseUrl = `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ queryParams.title }`;
						mockWindowLocation( buildUrl( baseUrl, { view: queryParams.view } ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.FUNCTION_VIEWER );
					} );

					it( 'When zobject is a function and default view is passed', () => {
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT
						};
						const baseUrl = `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ queryParams.title }`;
						mockWindowLocation( buildUrl( baseUrl, { view: queryParams.view } ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.FUNCTION_VIEWER );
					} );
				} );
			} );

			describe( 'View ZObject Route loads ZObject Viewer', () => {
				beforeEach( () => {
					store.changeCurrentView = jest.fn();
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
						const queryParams = {
							title: 'Z0',
							action: Constants.ACTIONS.EDIT
						};
						mockWindowLocation( buildUrl( Constants.PATHS.ROUTE_FORMAT_ONE, queryParams ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.DEFAULT );
					} );

					it( 'When view is passed as zoject viewer', () => {
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT
						};
						mockWindowLocation( buildUrl( Constants.PATHS.ROUTE_FORMAT_ONE, queryParams ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.DEFAULT );
					} );
				} );

				describe( 'with URL Format Two (/wiki/{{title}})', () => {
					it( 'When view is not passed', () => {
						const queryParams = {
							title: 'Z0'
						};
						const baseUrl = `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ queryParams.title }`;
						mockWindowLocation( buildUrl( baseUrl ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.DEFAULT );
					} );

					it( 'When view is passed as zobject viewer', () => {
						const queryParams = {
							title: 'Z0',
							view: Constants.VIEWS.DEFAULT
						};
						const baseUrl = `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ queryParams.title }`;
						mockWindowLocation( buildUrl( baseUrl, { view: queryParams.view } ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.DEFAULT );
					} );
				} );
			} );

			describe( 'Create Function Route loads Function Editor', () => {
				beforeEach( () => {
					store.changeCurrentView = jest.fn();
					// Mock function create config
					Object.defineProperty( store, 'getViewMode', {
						value: false
					} );

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
							title: Constants.PATHS.CREATE_OBJECT_TITLE,
							zid: Constants.Z_FUNCTION
						};
						mockWindowLocation( buildUrl( Constants.PATHS.ROUTE_FORMAT_ONE, queryParams ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.FUNCTION_EDITOR );
					} );
				} );

				describe( 'with URL Format Two (/wiki/{{title}})', () => {
					it( 'When zid is passed as Z8(Z_FUNCTION)', () => {
						const queryParams = {
							zid: Constants.Z_FUNCTION
						};
						const baseUrl = `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ Constants.PATHS.CREATE_OBJECT_TITLE }`;
						mockWindowLocation( buildUrl( baseUrl, queryParams ) );

						store.evaluateUri();

						expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.FUNCTION_EDITOR );
					} );
				} );
			} );

			describe( 'Create ZObject Route loads ZObject Editor', () => {
				beforeEach( () => {
					store.changeCurrentView = jest.fn();
					// Mock non-function create config
					Object.defineProperty( store, 'getViewMode', {
						value: false
					} );
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
					const queryParams = {
						title: Constants.PATHS.CREATE_OBJECT_TITLE,
						zid: Constants.Z_IMPLEMENTATION
					};
					mockWindowLocation( buildUrl( Constants.PATHS.ROUTE_FORMAT_ONE, queryParams ) );

					store.evaluateUri();

					expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.DEFAULT );
				} );

				it( 'with URL Format Two (/wiki/{{title}})', () => {
					const baseUrl = `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ Constants.PATHS.CREATE_OBJECT_TITLE }`;
					mockWindowLocation( buildUrl( baseUrl ) );

					store.evaluateUri();

					expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.DEFAULT );
				} );
			} );

			describe( 'Evaluate Function Route loads Function Evaluator view', () => {
				beforeEach( () => {
					store.changeCurrentView = jest.fn();
					// Mock function create config
					Object.defineProperty( store, 'getViewMode', {
						value: false
					} );
					window.mw.config = {
						get: jest.fn( () => ( {
							createNewPage: false,
							viewmode: false,
							runFunction: true
						} ) )
					};
				} );

				it( 'with URL Format One (/w/index.php)', () => {
					const queryParams = {
						title: Constants.PATHS.RUN_FUNCTION_TITLE
					};
					mockWindowLocation( buildUrl( Constants.PATHS.ROUTE_FORMAT_ONE, queryParams ) );

					store.evaluateUri();

					expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.FUNCTION_EVALUATOR );
				} );

				it( 'with URL Format Two (/wiki/{{title}})', () => {
					const baseUrl = `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ Constants.PATHS.RUN_FUNCTION_TITLE }`;
					mockWindowLocation( buildUrl( baseUrl ) );

					store.evaluateUri();

					expect( store.changeCurrentView ).toHaveBeenCalledWith( Constants.VIEWS.FUNCTION_EVALUATOR );
				} );
			} );
		} );

		describe( 'changeCurrentView', () => {
			it( 'changes the current view with the value provided', () => {
				store.changeCurrentView( dummyView );

				expect( store.currentView ).toBe( dummyView );
			} );

			it( 'does not replace history state if view is not set in query param', () => {
				mockWindowLocation( buildUrl( Constants.PATHS.ROUTE_FORMAT_ONE ) );

				store.changeCurrentView( dummyView );

				expect( window.history.replaceState ).not.toHaveBeenCalled();
			} );

			it( 'does not replace history state if view set in query param is the view passed', () => {
				mockWindowLocation( buildUrl( Constants.PATHS.ROUTE_FORMAT_ONE, { view: dummyView } ) );

				store.changeCurrentView( dummyView );

				expect( window.history.replaceState ).not.toHaveBeenCalled();
			} );

			it( 'replace history state with current view', () => {
				const fakePath = '/fakePath';
				const fakeExistingValue = 'fakeValue';
				mockWindowLocation( buildUrl( fakePath, { view: 'initialDummyView', existingDummyParams: fakeExistingValue } ) );

				store.changeCurrentView( dummyView );
				const stateObj = window.history.replaceState.mock.calls[ 0 ][ 0 ];
				expect( stateObj ).toMatchObject(
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
