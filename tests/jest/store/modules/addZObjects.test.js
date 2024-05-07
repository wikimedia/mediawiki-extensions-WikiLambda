/*!
 * WikiLambda unit test suite for the zobject Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const tableDataToRowObjects = require( '../../helpers/zObjectTableHelpers.js' ).tableDataToRowObjects,
	zobjectToRows = require( '../../helpers/zObjectTableHelpers.js' ).zobjectToRows,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	zobjectModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zobject.js' ),
	mockApiZids = require( '../../fixtures/mocks.js' ).mockApiZids;

let context,
	getResolveMock;

describe( 'addZObjects Vuex module', () => {
	const addZObjects = zobjectModule.modules.addZObjects;

	beforeEach( () => {
		getResolveMock = jest.fn( ( thenFunction ) => thenFunction() );
		context = {
			commit: jest.fn(),
			dispatch: jest.fn( () => {
				return {
					then: getResolveMock
				};
			} ),
			getters: {}
		};
	} );

	describe( 'Getters', () => {
		describe( 'createObjectByType', () => {
			describe( 'createObjectByType does not do an infinite recursion', function () {
				beforeEach( function () {
					context.state = { objects: mockApiZids };
					context.getters.getStoredObject = function ( key ) {
						return context.state.objects[ key ];
					};
					Object.keys( zobjectModule.modules.addZObjects.getters ).forEach( function ( key ) {
						context.getters[ key ] =
							zobjectModule.modules.addZObjects.getters[ key ](
								context.state,
								context.getters,
								{ zobjectModule: context.state },
								context.getters );
					} );
				} );

				it( 'defaults to Z9/Reference when an object has an attribute of its own type', function () {
					const expected = {
						Z1K1: 'Z10528',
						Z10528K1: {
							Z1K1: 'Z9',
							Z9K1: ''
						}
					};
					const payload = { id: 1, type: 'Z10528', link: false };
					// zobjectModule.modules.addZObjects.getters.createObjectByType( context, payload );
					const result = context.getters.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'defaults to Z9/Reference when mutual reference occurs in an object\'s attribute', function () {
					const expected = {
						Z1K1: 'Z20001',
						Z20001K1: {
							Z1K1: 'Z20002',
							Z20002K1: {
								Z1K1: 'Z20003',
								Z20003K1: {
									Z1K1: 'Z9',
									Z9K1: ''
								}
							}
						}
					};
					const payload = { id: 1, type: 'Z20001', link: false };
					// zobjectModule.modules.addZObjects.getters.createObjectByType( context, payload );
					const result = context.getters.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );

				it( 'does not restrict type repetition when it happens across argument branches', () => {
					const expected = {
						Z1K1: 'Z20004',
						Z20004K1: '',
						Z20004K2: '',
						Z20004K3: ''
					};
					const payload = { id: 1, type: 'Z20004', link: false };
					// zobjectModule.modules.addZObjects.getters.createObjectByType( context, payload );
					const result = context.getters.createObjectByType( payload );
					expect( result ).toEqual( expected );
				} );
			} );
		} );
	} );

	describe( 'Actions', () => {
		describe( 'changeType', () => {
			beforeEach( () => {
				// State
				context.state = {
					zobject: tableDataToRowObjects( [ { id: 0, value: Constants.ROW_VALUE_OBJECT } ] ),
					objects: mockApiZids,
					errors: {}
				};
				context.rootState = {
					zobjectModule: context.state
				};
				context.getters.createObjectByType = addZObjects.getters.createObjectByType( context.state, context.getters );

				// Getters
				Object.keys( addZObjects.getters ).forEach( ( key ) => {
					context.getters[ key ] = addZObjects.getters[ key ](
						context.state,
						context.getters
					);
				} );

				context.getters.getZObjectAsJsonById = zobjectModule.getters.getZObjectAsJsonById( context.state );
				context.getters.getUserLangZid = 'Z1003';
				context.getters.getStoredObject = ( zid ) => context.state.objects[ zid ];
				context.getters.getZPersistentContentRowId = () => undefined;
			} );

			describe( 'add linkable type when non-literal is prioritized', () => {
				it( 'adds a link to a type', () => {
					const payload = { id: 0, type: Constants.Z_TYPE, link: true };
					addZObjects.actions.changeType( context, payload );

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: [ 'Z1', 'Z9' ] } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', {
						rowId: 0,
						value: { Z1K1: 'Z9', Z9K1: '' },
						append: false
					} );
				} );

				it( 'adds a link to a function', () => {
					const payload = { id: 0, type: Constants.Z_FUNCTION, link: true };
					addZObjects.actions.changeType( context, payload );

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: [ 'Z1', 'Z9' ] } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', {
						rowId: 0,
						value: { Z1K1: 'Z9', Z9K1: '' },
						append: false
					} );
				} );

				it( 'adds a literal monolingual string', () => {
					const payload = { id: 0, type: Constants.Z_MONOLINGUALSTRING, link: true };
					addZObjects.actions.changeType( context, payload );

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: [ 'Z1', 'Z11', 'Z9' ] } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', {
						rowId: 0,
						value: {
							Z1K1: 'Z11',
							Z11K1: { Z1K1: 'Z9', Z9K1: '' },
							Z11K2: ''
						},
						append: false
					} );
				} );
			} );

			describe( 'add ZPersistentObject', () => {
				it( 'adds a valid ZPersistentObject', () => {
					context.getters.getUserLangZid = undefined;
					const payload = { id: 0, type: Constants.Z_PERSISTENTOBJECT };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z2', 'Z6', 'Z9', 'Z12', 'Z11', 'Z32', 'Z31' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
							Z2K2: { Z1K1: { Z1K1: 'Z9', Z9K1: '' } },
							Z2K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] },
							Z2K4: { Z1K1: 'Z32', Z32K1: [ 'Z31' ] },
							Z2K5: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'adds a valid ZPersistentObject with set uselang', () => {
					const payload = { id: 0, type: Constants.Z_PERSISTENTOBJECT };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z2', 'Z6', 'Z9', 'Z12', 'Z11', 'Z1003', 'Z32', 'Z31' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
							Z2K2: { Z1K1: { Z1K1: 'Z9', Z9K1: '' } },
							Z2K3: {
								Z1K1: 'Z12',
								Z12K1: [
									'Z11',
									{
										Z1K1: 'Z11',
										Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1003' },
										Z11K2: ''
									}
								]
							},
							Z2K4: { Z1K1: 'Z32', Z32K1: [ 'Z31' ] },
							Z2K5: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );
			} );

			describe( 'add ZMonolingualString', () => {
				it( 'adds a valid ZMonolingualString with empty values', () => {
					const payload = { id: 0, type: Constants.Z_MONOLINGUALSTRING };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z11', 'Z9' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z11',
							Z11K1: { Z1K1: 'Z9', Z9K1: '' },
							Z11K2: ''
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'adds a valid ZMonolingualString with initial values', () => {
					const payload = { id: 0, type: Constants.Z_MONOLINGUALSTRING, lang: 'Z1004', value: 'test label' };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z11', 'Z9', 'Z1004' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z11',
							Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1004' },
							Z11K2: 'test label'
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'appends a valid ZMonolingualString to a list', () => {
					context.state.zobject = zobjectToRows( {
						Z12K1: [ 'Z11' ]
					} );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_MONOLINGUALSTRING, lang: 'Z1004', value: 'test label', append: true };

					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z11', 'Z9', 'Z1004' ];
					const expectedPayload = {
						rowId: 1,
						value: {
							Z1K1: 'Z11',
							Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1004' },
							Z11K2: 'test label'
						},
						append: true
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );
			} );

			describe( 'add ZMultilingualString', () => {
				it( 'adds a valid ZMultilingualString with empty values', () => {
					const payload = { id: 0, type: Constants.Z_MULTILINGUALSTRING };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z12', 'Z11' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11' ]
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'adds a valid ZMultilingualString with empty monolingual', () => {
					const payload = { id: 0, type: Constants.Z_MULTILINGUALSTRING, value: '' };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z12', 'Z11', 'Z9', 'Z1003' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11', {
								Z1K1: 'Z11',
								Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1003' },
								Z11K2: ''
							} ]
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'adds a valid ZMultilingualString with initial values', () => {
					const payload = { id: 0, type: Constants.Z_MULTILINGUALSTRING, lang: 'Z1004', value: 'test label' };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z12', 'Z11', 'Z9', 'Z1004' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11', {
								Z1K1: 'Z11',
								Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1004' },
								Z11K2: 'test label'
							} ]
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );
			} );

			describe( 'add ZMonolingualStringSet', () => {
				it( 'adds a valid ZMonolingualStringSet with empty values', () => {
					const payload = { id: 0, type: Constants.Z_MONOLINGUALSTRINGSET };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z31', 'Z9', 'Z6' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z31',
							Z31K1: { Z1K1: 'Z9', Z9K1: '' },
							Z31K2: [ 'Z6' ]
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'adds a valid ZMonolingualStringSet with initial value', () => {
					const payload = { id: 0, type: Constants.Z_MONOLINGUALSTRINGSET, lang: 'Z1004', value: [ 'test alias' ] };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z31', 'Z9', 'Z1004', 'Z6' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z31',
							Z31K1: { Z1K1: 'Z9', Z9K1: 'Z1004' },
							Z31K2: [ 'Z6', 'test alias' ]
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'adds a valid ZMonolingualStringSet with two initial values', () => {
					const payload = { id: 0, type: Constants.Z_MONOLINGUALSTRINGSET, lang: 'Z1004', value: [ 'one', 'two' ] };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z31', 'Z9', 'Z1004', 'Z6' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z31',
							Z31K1: { Z1K1: 'Z9', Z9K1: 'Z1004' },
							Z31K2: [ 'Z6', 'one', 'two' ]
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'appends a valid ZMonolingualStringSet to a ZMultilingualStringSet', () => {
					context.state.zobject = zobjectToRows( {
						Z31K1: [ 'Z31' ]
					} );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_MONOLINGUALSTRINGSET, lang: 'Z1004', value: [ 'test alias' ], append: true };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z31', 'Z9', 'Z1004', 'Z6' ];
					const expectedPayload = {
						rowId: 1,
						value: {
							Z1K1: 'Z31',
							Z31K1: { Z1K1: 'Z9', Z9K1: 'Z1004' },
							Z31K2: [ 'Z6', 'test alias' ]
						},
						append: true
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );
			} );

			describe( 'add ZString', () => {
				it( 'adds a valid empty ZString', () => {
					const payload = { id: 0, type: Constants.Z_STRING };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [];
					const expectedPayload = {
						rowId: 0,
						value: '',
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'adds a valid prefilled ZString', () => {
					const payload = { id: 0, type: Constants.Z_STRING, value: 'Hello world' };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [];
					const expectedPayload = {
						rowId: 0,
						value: 'Hello world',
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'appends a valid ZString to a list', () => {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z1', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_STRING, value: 'Hello world', append: true };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [];
					const expectedPayload = {
						rowId: 1,
						value: 'Hello world',
						append: true
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );
			} );

			describe( 'add ZReference', () => {
				it( 'adds a valid empty ZReference', () => {
					const payload = { id: 0, type: Constants.Z_REFERENCE };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z9' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z9',
							Z9K1: ''
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'adds a valid prefilled ZReference', () => {
					const payload = { id: 0, type: Constants.Z_REFERENCE, value: 'Z1' };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z9' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z9',
							Z9K1: 'Z1'
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'appends a valid ZReference to a list', () => {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z4', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_REFERENCE, value: 'Z11', append: true };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z9', 'Z11' ];
					const expectedPayload = {
						rowId: 1,
						value: {
							Z1K1: 'Z9',
							Z9K1: 'Z11'
						},
						append: true
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );
			} );

			describe( 'add ZArgument', () => {
				it( 'adds a valid ZArgument', () => {
					context.getters.getNextKey = 'Z0K1';
					const payload = { id: 0, type: Constants.Z_ARGUMENT };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z17', 'Z9', 'Z12', 'Z11' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z17',
							Z17K1: { Z1K1: 'Z9', Z9K1: '' },
							Z17K2: 'Z0K1',
							Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'adds a valid ZArgument with initial values', () => {
					const payload = { id: 0, type: Constants.Z_ARGUMENT, value: 'Z400K2' };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z17', 'Z9', 'Z400', 'Z12', 'Z11' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z17',
							Z17K1: { Z1K1: 'Z9', Z9K1: '' },
							Z17K2: 'Z400K2',
							Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'appends a valid ZArgument to a list', () => {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z8K1', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z17', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_ARGUMENT, value: 'Z400K2', append: true };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z17', 'Z9', 'Z400', 'Z12', 'Z11' ];
					const expectedPayload = {
						rowId: 1,
						value: {
							Z1K1: 'Z17',
							Z17K1: { Z1K1: 'Z9', Z9K1: '' },
							Z17K2: 'Z400K2',
							Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						},
						append: true
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );
			} );

			describe( 'add ZFunctionCall', () => {
				it( 'adds a valid empty ZFunctionCall', () => {
					const payload = { id: 0, type: Constants.Z_FUNCTION_CALL };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z7', 'Z9' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z7',
							Z7K1: { Z1K1: 'Z9', Z9K1: '' }
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'adds a valid ZFunctionCall with initial values', () => {
					const payload = { id: 0, type: Constants.Z_FUNCTION_CALL, value: 'Z10001' };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z7', 'Z9', 'Z10001' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z7',
							Z7K1: { Z1K1: 'Z9', Z9K1: 'Z10001' }
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'appends a valid ZFunctionCall to a list', () => {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z1', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_FUNCTION_CALL, value: 'Z10001', append: true };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z7', 'Z9', 'Z10001' ];
					const expectedPayload = {
						rowId: 1,
						value: {
							Z1K1: 'Z7',
							Z7K1: { Z1K1: 'Z9', Z9K1: 'Z10001' }
						},
						append: true
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );
			} );

			describe( 'add ZImplementation', () => {
				it( 'adds a valid ZImplementation', () => {
					const payload = { id: 0, type: Constants.Z_IMPLEMENTATION };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z14', 'Z9', 'Z7' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z14',
							Z14K1: { Z1K1: 'Z9', Z9K1: '' },
							Z14K2: { Z1K1: 'Z7', Z7K1: { Z1K1: 'Z9', Z9K1: '' } }
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'adds a valid ZImplementation for a given function Zid', () => {
					const payload = { id: 0, type: Constants.Z_IMPLEMENTATION };
					mw.Uri.mockImplementationOnce( () => {
						return {
							query: {
								zid: Constants.Z_IMPLEMENTATION,
								Z14K1: 'Z10001'
							}
						};
					} );
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z14', 'Z9', 'Z10001', 'Z7' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z14',
							Z14K1: { Z1K1: 'Z9', Z9K1: 'Z10001' },
							Z14K2: { Z1K1: 'Z7', Z7K1: { Z1K1: 'Z9', Z9K1: '' } }
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );
			} );

			describe( 'add ZFunction', () => {
				it( 'adds a valid ZFunction', () => {
					const payload = { id: 0, type: Constants.Z_FUNCTION };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z8', 'Z17', 'Z9', 'Z12', 'Z11', 'Z20', 'Z14' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z8',
							Z8K1: [
								'Z17',
								{
									Z1K1: 'Z17',
									Z17K1: { Z1K1: 'Z9', Z9K1: '' },
									Z17K2: 'Z0K1',
									Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
								}
							],
							Z8K2: { Z1K1: 'Z9', Z9K1: '' },
							Z8K3: [ 'Z20' ],
							Z8K4: [ 'Z14' ],
							Z8K5: { Z1K1: 'Z9', Z9K1: 'Z0' }
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'adds a valid ZFunction with set zid', () => {
					const payload = { id: 0, type: Constants.Z_FUNCTION };
					context.getters.getCurrentZObjectId = 'Z10000';
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z8', 'Z17', 'Z9', 'Z10000', 'Z12', 'Z11', 'Z20', 'Z14' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z8',
							Z8K1: [
								'Z17',
								{
									Z1K1: 'Z17',
									Z17K1: { Z1K1: 'Z9', Z9K1: '' },
									Z17K2: 'Z10000K1',
									Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
								}
							],
							Z8K2: { Z1K1: 'Z9', Z9K1: '' },
							Z8K3: [ 'Z20' ],
							Z8K4: [ 'Z14' ],
							Z8K5: { Z1K1: 'Z9', Z9K1: 'Z10000' }
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );
			} );

			describe( 'add ZType', () => {
				it( 'adds a valid ZType', () => {
					const payload = { id: 0, type: Constants.Z_TYPE };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z4', 'Z9', 'Z3', 'Z101', 'Z46', 'Z64' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z4',
							Z4K1: { Z1K1: 'Z9', Z9K1: 'Z0' },
							Z4K2: [ 'Z3' ],
							Z4K3: { Z1K1: 'Z9', Z9K1: 'Z101' },
							Z4K4: { Z1K1: 'Z9', Z9K1: '' },
							Z4K5: { Z1K1: 'Z9', Z9K1: '' },
							Z4K6: { Z1K1: 'Z9', Z9K1: '' },
							Z4K7: [ 'Z46' ],
							Z4K8: [ 'Z64' ]
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'appends a valid ZType to a list', () => {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z4', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_TYPE, append: true };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z4', 'Z9', 'Z3', 'Z101', 'Z46', 'Z64' ];
					const expectedPayload = {
						rowId: 1,
						value: {
							Z1K1: 'Z4',
							Z4K1: { Z1K1: 'Z9', Z9K1: 'Z0' },
							Z4K2: [ 'Z3' ],
							Z4K3: { Z1K1: 'Z9', Z9K1: 'Z101' },
							Z4K4: { Z1K1: 'Z9', Z9K1: '' },
							Z4K5: { Z1K1: 'Z9', Z9K1: '' },
							Z4K6: { Z1K1: 'Z9', Z9K1: '' },
							Z4K7: [ 'Z46' ],
							Z4K8: [ 'Z64' ]
						},
						append: true
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );
			} );

			describe( 'add ZTypedList', () => {
				it( 'adds a valid ZTypedList', () => {
					const payload = { id: 0, type: Constants.Z_TYPED_LIST };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z9' ];
					const expectedPayload = {
						rowId: 0,
						value: [
							{ Z1K1: 'Z9', Z9K1: 'Z1' }
						],
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'adds a valid ZTypedList of a given type', () => {
					const payload = { id: 0, type: Constants.Z_TYPED_LIST, value: 'Z11' };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z9', 'Z11' ];
					const expectedPayload = {
						rowId: 0,
						value: [
							{ Z1K1: 'Z9', Z9K1: 'Z11' }
						],
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'appends a valid ZTypedList to a list', () => {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z1', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_TYPED_LIST, value: 'Z6', append: true };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z9', 'Z6' ];
					const expectedPayload = {
						rowId: 1,
						value: [
							{ Z1K1: 'Z9', Z9K1: 'Z6' }
						],
						append: true
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );
			} );

			describe( 'add ZTypedPair', () => {
				it( 'adds a valid ZTypedPair with empty values', () => {
					const payload = { id: 0, type: Constants.Z_TYPED_PAIR };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z7', 'Z882', 'Z9' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: {
								Z1K1: 'Z7',
								Z7K1: 'Z882',
								Z882K1: { Z1K1: 'Z9', Z9K1: '' },
								Z882K2: { Z1K1: 'Z9', Z9K1: '' }
							},
							K1: {},
							K2: {}
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'adds a valid ZTypedPair with initial types', () => {
					const payload = { id: 0, type: Constants.Z_TYPED_PAIR, values: [ 'Z6', 'Z11' ] };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z7', 'Z882', 'Z9', 'Z6', 'Z11' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: {
								Z1K1: 'Z7',
								Z7K1: 'Z882',
								Z882K1: { Z1K1: 'Z9', Z9K1: 'Z6' },
								Z882K2: { Z1K1: 'Z9', Z9K1: 'Z11' }
							},
							K1: '',
							K2: { Z1K1: 'Z11', Z11K1: { Z1K1: 'Z9', Z9K1: '' }, Z11K2: '' }
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'appends a valid ZTypedPair to a list', () => {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z1', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_TYPED_PAIR, values: [ 'Z6', 'Z6' ], append: true };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z7', 'Z882', 'Z9', 'Z6' ];
					const expectedPayload = {
						rowId: 1,
						value: {
							Z1K1: {
								Z1K1: 'Z7',
								Z7K1: 'Z882',
								Z882K1: { Z1K1: 'Z9', Z9K1: 'Z6' },
								Z882K2: { Z1K1: 'Z9', Z9K1: 'Z6' }
							},
							K1: '',
							K2: ''
						},
						append: true
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );
			} );

			describe( 'add ZTypedMap', () => {
				it( 'adds a valid ZTypedMap with empty values', () => {
					const payload = { id: 0, type: Constants.Z_TYPED_MAP };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z7', 'Z883', 'Z9' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: {
								Z1K1: 'Z7',
								Z7K1: 'Z883',
								Z883K1: { Z1K1: 'Z9', Z9K1: '' },
								Z883K2: { Z1K1: 'Z9', Z9K1: '' }
							}
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'adds a valid ZTypedMap with initial types', () => {
					const payload = { id: 0, type: Constants.Z_TYPED_MAP, values: [ 'Z6', 'Z1' ] };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z7', 'Z883', 'Z9', 'Z6' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: {
								Z1K1: 'Z7',
								Z7K1: 'Z883',
								Z883K1: { Z1K1: 'Z9', Z9K1: 'Z6' },
								Z883K2: { Z1K1: 'Z9', Z9K1: 'Z1' }
							}
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'appends a valid ZTypedMap to a list', () => {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z1', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_TYPED_MAP, values: [ 'Z6', 'Z1' ], append: true };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z7', 'Z883', 'Z9', 'Z6' ];
					const expectedPayload = {
						rowId: 1,
						value: {
							Z1K1: {
								Z1K1: 'Z7',
								Z7K1: 'Z883',
								Z883K1: { Z1K1: 'Z9', Z9K1: 'Z6' },
								Z883K2: { Z1K1: 'Z9', Z9K1: 'Z1' }
							}
						},
						append: true
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );
			} );

			describe( 'add object of generic type', () => {
				it( 'adds a valid typed list', () => {
					const payload = { id: 0, type: { Z1K1: 'Z7', Z7K1: 'Z881', Z881K1: 'Z6' } };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z9', 'Z6' ];
					const expectedPayload = {
						rowId: 0,
						value: [ { Z1K1: 'Z9', Z9K1: 'Z6' } ],
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'adds a valid object of a type defined by a function call', () => {
					const payload = { id: 0, type: { Z1K1: 'Z7', Z7K1: 'Z10001', Z10001K1: 'Z6' } };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z7', 'Z10001', 'Z6' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: {
								Z1K1: 'Z7',
								Z7K1: 'Z10001',
								Z10001K1: 'Z6'
							}
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'adds a valid ZTypedPair with empty values', () => {
					const payload = { id: 0, type: { Z1K1: 'Z7', Z7K1: 'Z882', Z882K1: 'Z6', Z882K2: 'Z6' } };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z7', 'Z882', 'Z6' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: {
								Z1K1: 'Z7',
								Z7K1: 'Z882',
								Z882K1: 'Z6',
								Z882K2: 'Z6'
							}
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'adds a valid ZTypedMap with empty values', () => {
					const payload = { id: 0, type: { Z1K1: 'Z7', Z7K1: 'Z883', Z883K1: 'Z6', Z883K2: 'Z6' } };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z7', 'Z883', 'Z6' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: {
								Z1K1: 'Z7',
								Z7K1: 'Z883',
								Z883K1: 'Z6',
								Z883K2: 'Z6'
							}
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );
			} );

			describe( 'add GenericObject', () => {
				it( 'adds a valid object of known type', () => {
					const payload = { id: 0, type: Constants.Z_KEY };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z3', 'Z9', 'Z12', 'Z11' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z3',
							Z3K1: { Z1K1: 'Z9', Z9K1: '' },
							Z3K2: '',
							Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'adds a valid object of known type with typed lists', () => {
					const payload = { id: 0, type: Constants.Z_MULTILINGUALSTRINGSET };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z32', 'Z9', 'Z31' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z32',
							Z32K1: [
								{ Z1K1: 'Z9', Z9K1: 'Z31' }
							]
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'adds a valid object of an unknown type', () => {
					const payload = { id: 0, type: 'Z10000' };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z10000' ];
					const expectedPayload = {
						rowId: 0,
						value: {
							Z1K1: 'Z10000'
						},
						append: false
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'appends a valid generic object to a list', () => {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z1', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: 'Z10002', append: true };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z10002' ];
					const expectedPayload = {
						rowId: 1,
						value: {
							Z1K1: 'Z10002'
						},
						append: true
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );

				it( 'appends a valid generic object typed by a function call to a list', () => {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z1', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: { Z1K1: 'Z7', Z7K1: 'Z10003', Z10003K1: 'Z6' }, append: true };
					addZObjects.actions.changeType( context, payload );

					const expectedZids = [ 'Z1', 'Z7', 'Z10003', 'Z6' ];
					const expectedPayload = {
						rowId: 1,
						value: {
							Z1K1: {
								Z1K1: 'Z7',
								Z7K1: 'Z10003',
								Z10003K1: 'Z6'
							}
						},
						append: true
					};

					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: expectedZids } );
					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', expectedPayload );
				} );
			} );
		} );

		describe( 'clearType', () => {
			beforeEach( () => {
				context.dispatch = jest.fn();
			} );

			it( 'clears all children except Z1K1', () => {
				context.getters.getChildrenByParentRowId = () => [
					{ id: 1, key: 'Z1K1' },
					{ id: 2, key: 'Z11K1' },
					{ id: 3, key: 'Z11K2' }
				];
				zobjectModule.modules.addZObjects.actions.clearType( context, 0 );
				expect( context.dispatch ).toHaveBeenCalledTimes( 4 );
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeRowChildren', 2 );
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeRowChildren', 3 );
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeRow', 2 );
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeRow', 3 );
			} );
		} );
	} );
} );
