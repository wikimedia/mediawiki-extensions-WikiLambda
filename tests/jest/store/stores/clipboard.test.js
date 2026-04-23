/*!
 * WikiLambda unit test suite for the Clipboard store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { setActivePinia, createPinia } = require( 'pinia' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'clipboard Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.clipboardItems = [];
	} );

	describe( 'Getters', () => {
		describe( 'getClipboardItems', () => {
			it( 'returns the content of the state clipboardItems object', () => {
				store.clipboardItems = [ { itemId: 'someItem' } ];
				expect( store.getClipboardItems ).toEqual( [ { itemId: 'someItem' } ] );
			} );
		} );
	} );

	describe( 'Actions', () => {
		describe( 'initializeClipboard', () => {
			let addEventListenerSpy;
			const stored = [ {
				itemId: 'call#1',
				originKey: 'Z20K2',
				originSlotType: 'Z7',
				objectType: 'Z7',
				resolvingType: 'Z6',
				value: {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
					Z7K1: { Z1K1: 'Z9', Z9K1: 'Z10000' },
					Z10000K1: { Z1K1: 'Z6', Z6K1: 'foo' },
					Z10000K2: { Z1K1: 'Z6', Z6K1: 'bar' }
				}
			} ];

			beforeEach( () => {
				store.clipboardItems = [];
				// Mock mw.storage.get
				mw.storage = { get: jest.fn().mockReturnValue( JSON.stringify( stored ) ) };
				// Spy on window.addEventListener
				addEventListenerSpy = jest.spyOn( window, 'addEventListener' );
				// Mock other store actions
				store.fetchZids = jest.fn();
			} );

			it( 'initializes the clipboard store with the localStorage content', () => {
				const expectedZids = [ 'Z20', 'Z7', 'Z6', 'Z1', 'Z9', 'Z10000' ];

				store.initializeClipboard();

				expect( store.clipboardItems ).toEqual( stored );
				expect( store.fetchZids ).toHaveBeenCalledWith( { zids: expectedZids } );
			} );

			it( 'adds an event listener to refresh clipboard store automatically', () => {
				store.initializeClipboard();

				expect( addEventListenerSpy ).toHaveBeenCalledWith( 'storage', expect.any( Function ) );
			} );

			it( 'updates clipboardItems and fetches ZIDs when a storage event fires', () => {
				store.initializeClipboard();

				// Get the callback passed to addEventListener
				const storageCallback = addEventListenerSpy.mock.calls
					.find( ( call ) => call[ 0 ] === 'storage' )[ 1 ];

				const newStored = [ {
					itemId: 'some value#1',
					originKey: 'Z999K1',
					originSlotType: 'Z1',
					objectType: 'Z7',
					resolvingType: 'Z1',
					value: {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
						Z7K1: { Z1K1: 'Z9', Z9K1: 'Z801' },
						Z801K1: { Z1K1: 'Z6', Z6K1: 'foo' }
					}
				} ];
				const newZids = [ 'Z999', 'Z1', 'Z7', 'Z9', 'Z801', 'Z6' ];

				// Call callback with mock event
				storageCallback( {
					key: 'ext-wikilambda-app-clipboard',
					newValue: JSON.stringify( newStored )
				} );

				expect( store.clipboardItems ).toEqual( newStored );
				expect( store.fetchZids ).toHaveBeenCalledWith( { zids: newZids } );
			} );
		} );

		describe( 'copyToClipboard', () => {
			const streamName = 'mediawiki.product_metrics.wikifunctions_ui';
			const schemaID = '/analytics/mediawiki/product_metrics/wikilambda/ui_actions/1.0.0';

			beforeEach( () => {
				const mockLabels = {
					Z802K2: 'then',
					Z11K1: 'language'
				};

				store.clipboardItems = [];
				store.fetchZids = jest.fn();

				Object.defineProperty( store, 'getResolvingType', {
					value: jest.fn().mockReturnValue( 'Z6' )
				} );
				Object.defineProperty( store, 'getLabelData', {
					value: jest.fn().mockImplementation( ( zid ) => ( {
						label: mockLabels[ zid ] || zid
					} ) )
				} );
				Object.defineProperty( store, 'isAbstractContent', {
					value: jest.fn().mockReturnValue( false )
				} );
				Object.defineProperty( store, 'getCurrentZObjectType', {
					value: 'Z14'
				} );
				Object.defineProperty( store, 'getAbstractWikiId', {
					value: 'Q123'
				} );

				// Mock mw.storage.set
				mw.storage = { set: jest.fn() };
			} );

			it( 'copies one value to the clipboard when empty', () => {
				const payload = {
					originKey: 'Z802K2',
					originSlotType: 'Z1',
					value: {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
						Z7K1: { Z1K1: 'Z9', Z9K1: 'Z10000' },
						Z10000K1: { Z1K1: 'Z6', Z6K1: 'foo' },
						Z10000K2: { Z1K1: 'Z6', Z6K1: 'bar' }
					}
				};

				store.copyToClipboard( payload );

				expect( store.clipboardItems.length ).toBe( 1 );

				// Check values that stay the same:
				expect( store.clipboardItems[ 0 ].originKey ).toBe( payload.originKey );
				expect( store.clipboardItems[ 0 ].originSlotType ).toBe( payload.originSlotType );
				expect( store.clipboardItems[ 0 ].value ).toEqual( payload.value );

				// Check new values added by this action:
				expect( store.clipboardItems[ 0 ].itemId ).toBe( 'then#1' );
				expect( store.clipboardItems[ 0 ].objectType ).toBe( 'Z7' );
				expect( store.clipboardItems[ 0 ].resolvingType ).toBe( 'Z6' );

				// Check possibly new zids get fetched:
				expect( store.fetchZids ).toHaveBeenCalledWith( { zids: [ 'Z6' ] } );

				// Check that local storage is updated
				expect( mw.storage.set ).toHaveBeenCalledWith( 'ext-wikilambda-app-clipboard', expect.any( String ) );

				// Check that event is submitted
				const interactionData = {
					zobjectid: 'Z0',
					zobjecttype: 'Z14',
					zlang: 'Z1002'
				};
				expect( mw.eventLog.submitInteraction ).toHaveBeenCalledWith( streamName, schemaID, 'copy', interactionData );
			} );

			it( 'copies another value to the clipboard', () => {
				// Set as abstract content to test different event data
				Object.defineProperty( store, 'isAbstractContent', {
					value: jest.fn().mockReturnValue( true )
				} );

				store.clipboardItems = [ {
					itemId: 'then#1',
					originKey: 'Z802K2',
					originSlotType: 'Z1',
					objectType: 'Z7',
					resolvingType: 'Z1',
					value: {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
						Z7K1: { Z1K1: 'Z9', Z9K1: 'Z801' },
						Z801K1: { Z1K1: 'Z6', Z6K1: 'foo' }
					}
				} ];

				const payload = {
					originKey: 'Z802K2',
					originSlotType: 'Z1',
					value: {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
						Z7K1: { Z1K1: 'Z9', Z9K1: 'Z10000' },
						Z10000K1: { Z1K1: 'Z6', Z6K1: 'foo' },
						Z10000K2: { Z1K1: 'Z6', Z6K1: 'bar' }
					}
				};

				store.copyToClipboard( payload );

				expect( store.clipboardItems.length ).toBe( 2 );

				// Check values that stay the same:
				expect( store.clipboardItems[ 0 ].originKey ).toBe( payload.originKey );
				expect( store.clipboardItems[ 0 ].originSlotType ).toBe( payload.originSlotType );
				expect( store.clipboardItems[ 0 ].value ).toEqual( payload.value );

				// Check new values added by this action:
				expect( store.clipboardItems[ 0 ].itemId ).toBe( 'then#2' );
				expect( store.clipboardItems[ 0 ].objectType ).toBe( 'Z7' );
				expect( store.clipboardItems[ 0 ].resolvingType ).toBe( 'Z6' );

				// Check possibly new zids get fetched:
				expect( store.fetchZids ).toHaveBeenCalledWith( { zids: [ 'Z6' ] } );

				// Check old item is now in second place
				expect( store.clipboardItems[ 1 ].itemId ).toBe( 'then#1' );

				// Check that local storage is updated
				expect( mw.storage.set ).toHaveBeenCalledWith( 'ext-wikilambda-app-clipboard', expect.any( String ) );

				// Check that event is submitted
				const interactionData = {
					zobjectid: 'Q123',
					zobjecttype: 'abstractwiki',
					zlang: 'Z1002'
				};
				expect( mw.eventLog.submitInteraction ).toHaveBeenCalledWith( streamName, schemaID, 'copy', interactionData );
			} );

			it( 'copies a partially blank object to the clipboard', () => {
				Object.defineProperty( store, 'getResolvingType', {
					value: jest.fn().mockReturnValue( undefined )
				} );

				const payload = {
					originKey: 'Z11K1',
					originSlotType: 'Z60',
					value: { Z1K1: 'Z9', Z9K1: '' }
				};

				store.copyToClipboard( payload );

				expect( store.clipboardItems.length ).toBe( 1 );

				// Check values that stay the same:
				expect( store.clipboardItems[ 0 ].originKey ).toBe( payload.originKey );
				expect( store.clipboardItems[ 0 ].originSlotType ).toBe( payload.originSlotType );
				expect( store.clipboardItems[ 0 ].value ).toEqual( payload.value );

				// Check new values added by this action:
				expect( store.clipboardItems[ 0 ].itemId ).toBe( 'language#1' );
				expect( store.clipboardItems[ 0 ].objectType ).toBe( 'Z9' );
				expect( store.clipboardItems[ 0 ].resolvingType ).toBeUndefined();

				// Check possibly new zids get fetched:
				expect( store.fetchZids ).not.toHaveBeenCalled();

				// Check that local storage is updated
				expect( mw.storage.set ).toHaveBeenCalledWith( 'ext-wikilambda-app-clipboard', expect.any( String ) );

				// Check that event is submitted
				const interactionData = {
					zobjectid: 'Z0',
					zobjecttype: 'Z14',
					zlang: 'Z1002'
				};
				expect( mw.eventLog.submitInteraction ).toHaveBeenCalledWith( streamName, schemaID, 'copy', interactionData );
			} );
		} );

		describe( 'clearClipboard', () => {
			it( 'clears the clipboard in the Pinia store and local storage', () => {
				store.clipboardItems = [ { itemId: 'one' }, { itemId: 'two' } ];
				mw.storage = { set: jest.fn() };

				store.clearClipboard();

				expect( store.clipboardItems ).toEqual( [] );
				expect( mw.storage.set ).toHaveBeenCalledWith( 'ext-wikilambda-app-clipboard', '[]' );
			} );
		} );

		describe( 'cleanClipboardItem', () => {
			it( 'makes no changes to string', () => {
				const destinationKeyPath = '';
				const initialValue = 'foo/bar';

				const cleanValue = store.cleanClipboardItem( initialValue, destinationKeyPath );

				expect( cleanValue ).toEqual( initialValue );
			} );

			it( 'makes no changes to array of things', () => {
				const destinationKeyPath = '';
				const initialValue = [ 'foo', 'bar', [ '', {}, 'two' ], {} ];

				const cleanValue = store.cleanClipboardItem( initialValue, destinationKeyPath );

				expect( cleanValue ).toEqual( initialValue );
			} );

			it( 'makes no changes to empty object', () => {
				const destinationKeyPath = '';
				const initialValue = {};

				const cleanValue = store.cleanClipboardItem( initialValue, destinationKeyPath );

				expect( cleanValue ).toEqual( initialValue );
			} );

			it( 'makes no changes to simple object', () => {
				const destinationKeyPath = '';
				const initialValue = {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
					Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1003' },
					Z11K2: { Z1K1: 'Z6', Z6K1: 'some text' }
				};

				const cleanValue = store.cleanClipboardItem( initialValue, destinationKeyPath );

				expect( cleanValue ).toEqual( initialValue );
			} );

			it( 'makes no changes to nested object', () => {
				const destinationKeyPath = '';
				const initialValue = {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
					Z7K1: { Z1K1: 'Z9', Z9K1: 'Z801' },
					Z801K1: {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z12' },
						Z12K1: [
							{ Z1K1: 'Z9', Z9K1: 'Z11' },
							{
								Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
								Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1003' },
								Z11K2: { Z1K1: 'Z6', Z6K1: 'some text' }
							}
						]
					}
				};

				const cleanValue = store.cleanClipboardItem( initialValue, destinationKeyPath );

				expect( cleanValue ).toEqual( initialValue );
			} );

			describe( 'when destination context does not allow argument references', () => {
				const destinationKeyPath = 'main.Z2K2.Z4K1.2';

				it( 'removes all argument references', () => {
					const initialValue = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
						Z7K1: { Z1K1: 'Z9', Z9K1: 'Z801' },
						Z801K1: {
							Z1K1: {
								Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
								Z18K1: { Z1K1: 'Z6', Z6K1: 'Z999K1' }
							},
							Z12K1: [
								{ Z1K1: 'Z9', Z9K1: 'Z11' },
								{
									Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
									Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1003' },
									Z11K2: {
										Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
										Z18K1: { Z1K1: 'Z6', Z6K1: 'Z999K3' }
									}
								},
								{
									Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
									Z18K1: { Z1K1: 'Z6', Z6K1: 'Z999K2' }
								}
							]
						}
					};

					const expectedValue = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
						Z7K1: { Z1K1: 'Z9', Z9K1: 'Z801' },
						Z801K1: {
							Z1K1: {
								Z1K1: { Z1K1: 'Z9', Z9K1: '' }
							},
							Z12K1: [
								{ Z1K1: 'Z9', Z9K1: 'Z11' },
								{
									Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
									Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1003' },
									Z11K2: {
										Z1K1: { Z1K1: 'Z9', Z9K1: '' }
									}
								},
								{
									Z1K1: { Z1K1: 'Z9', Z9K1: '' }
								}
							]
						}
					};

					const cleanValue = store.cleanClipboardItem( initialValue, destinationKeyPath );

					expect( cleanValue ).toEqual( expectedValue );
				} );
			} );

			describe( 'when destination context is a composition', () => {
				const destinationKeyPath = 'main.Z2K2.Z14K2.Z444.1';

				beforeEach( () => {
					// Mock: Target function is Z999:
					Object.defineProperty( store, 'getCurrentTargetFunctionZid', {
						value: 'Z999'
					} );
					// Mock: Target function has three arguments:
					Object.defineProperty( store, 'getInputsOfFunctionZid', {
						value: jest.fn( () => [
							{ Z1K1: 'Z17', Z17K2: 'Z999K1' },
							{ Z1K1: 'Z17', Z17K2: 'Z999K2' },
							{ Z1K1: 'Z17', Z17K2: 'Z999K3' }
						] )
					} );
				} );

				it( 'makes no changes when destination context includes all the arg refs', () => {
					const initialValue = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
						Z7K1: { Z1K1: 'Z9', Z9K1: 'Z801' },
						Z801K1: {
							Z1K1: {
								Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
								Z18K1: { Z1K1: 'Z6', Z6K1: 'Z999K1' }
							},
							Z12K1: [
								{ Z1K1: 'Z9', Z9K1: 'Z11' },
								{
									Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
									Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1003' },
									Z11K2: {
										Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
										Z18K1: { Z1K1: 'Z6', Z6K1: 'Z999K3' }
									}
								},
								{
									Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
									Z18K1: { Z1K1: 'Z6', Z6K1: 'Z999K2' }
								}
							]
						}
					};

					const cleanValue = store.cleanClipboardItem( initialValue, destinationKeyPath );

					expect( cleanValue ).toEqual( initialValue );
				} );

				it( 'resets to blank any argument reference that is not part of the destination context', () => {
					const initialValue = [ {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
						Z18K1: { Z1K1: 'Z6', Z6K1: 'Z999K4' }
					}, {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
						Z18K1: { Z1K1: 'Z6', Z6K1: 'Z825K1' }
					}, {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
						Z18K1: { Z1K1: 'Z6', Z6K1: 'Z999K1' }
					} ];

					const expectedValue = [ {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
						Z18K1: { Z1K1: 'Z6', Z6K1: '' }
					}, {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
						Z18K1: { Z1K1: 'Z6', Z6K1: '' }
					}, {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
						Z18K1: { Z1K1: 'Z6', Z6K1: 'Z999K1' }
					} ];

					const cleanValue = store.cleanClipboardItem( initialValue, destinationKeyPath );

					expect( cleanValue ).toEqual( expectedValue );
				} );
			} );

			describe( 'when destination context is an abstract fragment', () => {
				const destinationKeyPath = 'abstractwiki.sections.Q8776414.fragments.1';

				it( 'makes no changes when destination context includes all the arg refs', () => {
					const initialValue = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
						Z7K1: { Z1K1: 'Z9', Z9K1: 'Z801' },
						Z801K1: {
							Z1K1: {
								Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
								Z18K1: { Z1K1: 'Z6', Z6K1: 'Z825K1' }
							},
							Z12K1: [
								{ Z1K1: 'Z9', Z9K1: 'Z11' },
								{
									Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
									Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1003' },
									Z11K2: {
										Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
										Z18K1: { Z1K1: 'Z6', Z6K1: 'Z825K3' }
									}
								},
								{
									Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
									Z18K1: { Z1K1: 'Z6', Z6K1: 'Z825K2' }
								}
							]
						}
					};

					const cleanValue = store.cleanClipboardItem( initialValue, destinationKeyPath );

					expect( cleanValue ).toEqual( initialValue );
				} );

				it( 'resets to blank any argument reference that is not part of the destination context', () => {
					const initialValue = [ {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
						Z18K1: { Z1K1: 'Z6', Z6K1: 'Z825K4' }
					}, {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
						Z18K1: { Z1K1: 'Z6', Z6K1: 'Z825K1' }
					}, {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
						Z18K1: { Z1K1: 'Z6', Z6K1: 'Z999K1' }
					} ];

					const expectedValue = [ {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
						Z18K1: { Z1K1: 'Z6', Z6K1: '' }
					}, {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
						Z18K1: { Z1K1: 'Z6', Z6K1: 'Z825K1' }
					}, {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
						Z18K1: { Z1K1: 'Z6', Z6K1: '' }
					} ];

					const cleanValue = store.cleanClipboardItem( initialValue, destinationKeyPath );

					expect( cleanValue ).toEqual( expectedValue );
				} );
			} );
		} );
	} );
} );
