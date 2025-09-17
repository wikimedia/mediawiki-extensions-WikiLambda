/*!
 * WikiLambda unit test suite for the default ZObjectKeyValue component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../helpers/getterHelpers.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const ZObjectKeyValue = require( '../../../../resources/ext.wikilambda.app/components/types/ZObjectKeyValue.vue' );

describe( 'ZObjectKeyValue', () => {
	let store,
		keyPath,
		objectValue;

	beforeEach( () => {
		// reset props
		keyPath = 'main.Z2K2';
		objectValue = undefined;
		store = useMainStore();

		// Getters
		store.isIdentityKey = createGettersWithFunctionsMock( false );
		store.isCreateNewPage = false;
		store.isWikidataEnum = createGettersWithFunctionsMock( false );
		store.hasParser = createGettersWithFunctionsMock( false );
		store.hasRenderer = createGettersWithFunctionsMock( false );
		store.getCurrentZObjectId = 'Z0';
		store.getLabelData = createLabelDataMock();
		store.getExpectedTypeOfKey = createGettersWithFunctionsMock( 'Z1' );
		store.getZObjectByKeyPath = createGettersWithFunctionsMock();
	} );

	describe( 'it renders the correct component for type or key', () => {
		it( 'z monolingual string', () => {
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
				Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1002' },
				Z11K2: { Z1K1: 'Z6', Z6K1: 'string value' }
			};

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-monolingual-string' } ).exists() ).toBe( true );
		} );

		it( 'z reference', () => {
			objectValue = { Z1K1: 'Z9', Z9K1: 'Z10001' };

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-reference' } ).exists() ).toBe( true );
		} );

		it( 'z string', () => {
			objectValue = { Z1K1: 'Z6', Z6K1: 'some value' };

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-string' } ).exists() ).toBe( true );
		} );

		it( 'z code', () => {
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z16' },
				Z16K1: { Z1K1: 'Z9', Z9K1: 'Z610' },
				Z16K2: { Z1K1: 'Z6', Z6K1: 'some_code();' }
			};

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: {
					stubs: { WlKeyValueBlock: false }
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-code' } ).exists() ).toBe( true );
		} );

		it( 'z boolean', () => {
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z40' },
				Z40K1: { Z1K1: 'Z9', Z9K1: 'Z42' }
			};

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-boolean' } ).exists() ).toBe( true );
		} );

		it( 'z function call', () => {
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
				Z7K1: { Z1K1: 'Z9', Z9K1: 'Z801' },
				Z801K1: { Z1K1: 'Z6', Z6K1: 'hello world' }
			};

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-function-call' } ).exists() ).toBe( true );
		} );

		it( 'z implementation', () => {
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z14' },
				Z14K1: { Z1K1: 'Z9', Z9K1: 'Z802' },
				Z14K2: {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
					Z7K1: { Z1K1: 'Z9', Z9K1: '' }
				}
			};

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-implementation' } ).exists() ).toBe( true );
		} );

		it( 'z tester', () => {
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z20' },
				Z20K1: { Z1K1: 'Z9', Z9K1: 'Z10000' },
				Z20K2: {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
					Z7K1: { Z1K1: 'Z9', Z9K1: '' }
				},
				Z20K3: {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
					Z7K1: { Z1K1: 'Z9', Z9K1: '' }
				}
			};

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-tester' } ).exists() ).toBe( true );
		} );

		it( 'z html fragment', () => {
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z89' },
				Z89K1: { Z1K1: 'Z6', Z6K1: '<b>hello</b>' }
			};

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-html-fragment' } ).exists() ).toBe( true );
		} );

		it( 'z argument reference with type', () => {
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
				Z18K1: { Z1K1: 'Z6', Z6K1: 'Z10001K1' }
			};

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-argument-reference' } ).exists() ).toBe( true );
		} );

		it( 'z argument reference with key', () => {
			keyPath = 'main.Z2K2.Z18K1';
			objectValue = { Z1K1: 'Z6', Z6K1: 'Z10001K1' };

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-argument-reference' } ).exists() ).toBe( true );
		} );

		it( 'z typed list', () => {
			objectValue = [
				{ Z1K1: 'Z9', Z9K1: 'Z6' },
				{ Z1K1: 'Z6', Z6K1: 'one' },
				{ Z1K1: 'Z6', Z6K1: 'two' },
				{ Z1K1: 'Z6', Z6K1: 'three' }
			];

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-typed-list' } ).exists() ).toBe( true );
		} );

		it( 'z multilingual string', () => {
			objectValue = {
				Z1K1: 'Z12',
				Z12K1: [
					{ Z1K1: 'Z9', Z9K1: 'Z11' },
					{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'English text' },
					{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'Spanish text' },
					{ Z1K1: 'Z11', Z11K1: '', Z11K2: '' }
				]
			};

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-multilingual-string' } ).exists() ).toBe( true );
		} );

		it( 'fallback with renderer and parser', () => {
			store.hasRenderer = createGettersWithFunctionsMock( true );
			store.hasParser = createGettersWithFunctionsMock( true );

			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z30000' },
				Z30000K1: { Z1K1: 'Z6', Z6K1: '' }
			};

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-object-string-renderer' } ).exists() ).toBe( true );
		} );

		it( 'fallback z-object-key-value-set', () => {
			objectValue = {
				Z1K1: { Z1K1: 'Z9', Z9K1: 'Z30000' },
				Z30000K1: { Z1K1: 'Z6', Z6K1: '' }
			};

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					keyPath,
					objectValue,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-object-key-value-set' } ).exists() ).toBe( true );
		} );

		describe( 'wikidata components', () => {
			describe( 'lexeme', () => {
				it( 'renders lexeme component for wikidata literal lexeme', () => {
					objectValue = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6005' }
					};

					const wrapper = shallowMount( ZObjectKeyValue, {
						props: {
							keyPath,
							objectValue,
							edit: false
						},
						global: {
							stubs: {
								WlKeyValueBlock: false
							}
						}
					} );

					expect( wrapper.findComponent( { name: 'wl-wikidata-lexeme' } ).exists() ).toBe( true );
					expect( wrapper.vm.expanded ).toBe( false );
				} );

				it( 'renders lexeme component for function call to fetch wikidata lexeme', () => {
					objectValue = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
						Z7K1: { Z1K1: 'Z9', Z9K1: 'Z6825' },
						Z6825K1: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6095' },
							Z6095K1: { Z1K1: 'Z6', Z6K1: 'L42' }
						}
					};

					const wrapper = shallowMount( ZObjectKeyValue, {
						props: {
							keyPath,
							objectValue,
							edit: false
						},
						global: {
							stubs: {
								WlKeyValueBlock: false
							}
						}
					} );

					expect( wrapper.findComponent( { name: 'wl-wikidata-lexeme' } ).exists() ).toBe( true );
					expect( wrapper.vm.expanded ).toBe( false );
				} );

				it( 'renders lexeme component for wikidata lexeme reference', () => {
					objectValue = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6095' },
						Z6095K1: { Z1K1: 'Z6', Z6K1: 'L42' }
					};

					const wrapper = shallowMount( ZObjectKeyValue, {
						props: {
							keyPath,
							objectValue,
							edit: false
						},
						global: {
							stubs: {
								WlKeyValueBlock: false
							}
						}
					} );

					expect( wrapper.findComponent( { name: 'wl-wikidata-lexeme' } ).exists() ).toBe( true );
					expect( wrapper.vm.expanded ).toBe( false );
				} );
			} );

			describe( 'lexeme form', () => {
				it( 'renders lexeme form component for wikidata literal lexeme form', () => {
					objectValue = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6004' }
					};

					const wrapper = shallowMount( ZObjectKeyValue, {
						props: {
							keyPath,
							objectValue,
							edit: false
						},
						global: {
							stubs: {
								WlKeyValueBlock: false
							}
						}
					} );

					expect( wrapper.findComponent( { name: 'wl-wikidata-lexeme-form' } ).exists() ).toBe( true );
					expect( wrapper.vm.expanded ).toBe( false );
				} );

				it( 'renders lexeme form component for function call to fetch wikidata lexeme form', () => {
					objectValue = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
						Z7K1: { Z1K1: 'Z9', Z9K1: 'Z6824' },
						Z6824K1: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6094' },
							Z6094K1: { Z1K1: 'Z6', Z6K1: 'L42-F1' }
						}
					};

					const wrapper = shallowMount( ZObjectKeyValue, {
						props: {
							keyPath,
							objectValue,
							edit: false
						},
						global: {
							stubs: {
								WlKeyValueBlock: false
							}
						}
					} );

					expect( wrapper.findComponent( { name: 'wl-wikidata-lexeme-form' } ).exists() ).toBe( true );
					expect( wrapper.vm.expanded ).toBe( false );
				} );

				it( 'renders lexeme form component for wikidata lexeme form reference', () => {
					objectValue = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6094' },
						Z6094K1: { Z1K1: 'Z6', Z6K1: 'L42-F1' }
					};

					const wrapper = shallowMount( ZObjectKeyValue, {
						props: {
							keyPath,
							objectValue,
							edit: false
						},
						global: {
							stubs: {
								WlKeyValueBlock: false
							}
						}
					} );

					expect( wrapper.findComponent( { name: 'wl-wikidata-lexeme-form' } ).exists() ).toBe( true );
					expect( wrapper.vm.expanded ).toBe( false );
				} );
			} );

			describe( 'wikidata item', () => {
				it( 'renders wikidata item component for wikidata literal item', () => {
					objectValue = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6001' }
					};

					const wrapper = shallowMount( ZObjectKeyValue, {
						props: {
							keyPath,
							objectValue,
							edit: false
						},
						global: {
							stubs: {
								WlKeyValueBlock: false
							}
						}
					} );

					expect( wrapper.findComponent( { name: 'wl-wikidata-item' } ).exists() ).toBe( true );
					expect( wrapper.vm.expanded ).toBe( false );
				} );

				it( 'renders wikidata item component for function call to fetch wikidata item', () => {
					objectValue = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
						Z7K1: { Z1K1: 'Z9', Z9K1: 'Z6821' },
						Z6821K1: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6091' },
							Z6091K1: { Z1K1: 'Z6', Z6K1: 'Q42' }
						}
					};

					const wrapper = shallowMount( ZObjectKeyValue, {
						props: {
							keyPath,
							objectValue,
							edit: false
						},
						global: {
							stubs: {
								WlKeyValueBlock: false
							}
						}
					} );

					expect( wrapper.findComponent( { name: 'wl-wikidata-item' } ).exists() ).toBe( true );
					expect( wrapper.vm.expanded ).toBe( false );
				} );

				it( 'renders wikidata item component for wikidata item reference', () => {
					objectValue = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6091' },
						Z6091K1: { Z1K1: 'Z6', Z6K1: 'Q42' }
					};

					const wrapper = shallowMount( ZObjectKeyValue, {
						props: {
							keyPath,
							objectValue,
							edit: false
						},
						global: {
							stubs: {
								WlKeyValueBlock: false
							}
						}
					} );

					expect( wrapper.findComponent( { name: 'wl-wikidata-item' } ).exists() ).toBe( true );
					expect( wrapper.vm.expanded ).toBe( false );
				} );

				it( 'renders wikidata enum components with wikidata enum references', () => {
					store.isWikidataEnum = jest.fn().mockImplementation( ( zid ) => zid === 'Z10001' );
					objectValue = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z10001' },
						Z10001K1: { Z1K1: 'Z9', Z9K1: '' }
					};

					const wrapper = shallowMount( ZObjectKeyValue, {
						props: {
							keyPath,
							objectValue,
							edit: false
						},
						global: {
							stubs: {
								WlKeyValueBlock: false
							}
						}
					} );

					expect( wrapper.findComponent( { name: 'wl-wikidata-enum' } ).exists() ).toBe( true );
				} );
			} );
		} );
	} );

	describe( 'in edit mode', () => {
		beforeEach( () => {
			objectValue = { Z1K1: 'Z9', Z9K1: 'Z10001' };
		} );

		it( 'it renders without errors', () => {
			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					keyPath,
					objectValue,
					edit: true
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		describe( 'mode selector', () => {
			it( 'it loads the mode selector if key is visible', () => {
				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: {
							WlKeyValueBlock: false,
							WlKeyBlock: false
						}
					}
				} );

				expect( wrapper.findComponent( { name: 'wl-mode-selector' } ).exists() ).toBe( true );
			} );

			it( 'it does not load the mode selector if key is skipped', () => {
				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true,
						skipKey: true
					},
					global: {
						stubs: {
							WlKeyValueBlock: false,
							WlKeyBlock: false
						}
					}
				} );

				expect( wrapper.findComponent( { name: 'wl-mode-selector' } ).exists() ).toBe( false );
			} );

			it( 'deletes an item list if mode selector emits delete-list-item', () => {
				keyPath = 'main.Z2K2.1';

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: {
							WlKeyValueBlock: false,
							WlKeyBlock: false
						}
					}
				} );

				const modeSelector = wrapper.findComponent( { name: 'wl-mode-selector' } );
				modeSelector.vm.$emit( 'delete-list-item' );

				expect( store.setDirty ).toHaveBeenCalled();
				expect( store.deleteListItemsByKeyPath ).toHaveBeenCalledWith( {
					keyPath: [ 'main', 'Z2K2' ],
					indexes: [ '1' ]
				} );
			} );

			it( 'moves a list item one position earlier in the list if mode selector emits move-before', () => {
				keyPath = 'main.Z2K2.2';

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: {
							WlKeyValueBlock: false,
							WlKeyBlock: false
						}
					}
				} );

				const modeSelector = wrapper.findComponent( { name: 'wl-mode-selector' } );
				modeSelector.vm.$emit( 'move-before' );

				expect( store.setDirty ).toHaveBeenCalled();
				expect( store.moveListItemByKeyPath ).toHaveBeenCalledWith( {
					keyPath: [ 'main', 'Z2K2', '2' ],
					offset: -1
				} );
			} );

			it( 'moves a list item one position later in the list if mode selector emits move-after', () => {
				keyPath = 'main.Z2K2.1';

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: {
							WlKeyValueBlock: false,
							WlKeyBlock: false
						}
					}
				} );

				const modeSelector = wrapper.findComponent( { name: 'wl-mode-selector' } );
				modeSelector.vm.$emit( 'move-after' );

				expect( store.setDirty ).toHaveBeenCalled();
				expect( store.moveListItemByKeyPath ).toHaveBeenCalledWith( {
					keyPath: [ 'main', 'Z2K2', '1' ],
					offset: 1
				} );
			} );

			it( 'adds local argument to function call if the mode selector emits add-arg', () => {
				keyPath = 'main.Z2K2.Z7K1';

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: {
							WlKeyValueBlock: false,
							WlKeyBlock: false
						}
					}
				} );

				const modeSelector = wrapper.findComponent( { name: 'wl-mode-selector' } );
				modeSelector.vm.$emit( 'add-arg' );

				expect( store.setDirty ).toHaveBeenCalled();
				expect( store.addLocalArgumentToFunctionCall ).toHaveBeenCalledWith( {
					keyPath: [ 'main', 'Z2K2', 'Z7K1' ]
				} );
			} );

			it( 'deletes local argument to function call if the mode selector emits delete-arg', () => {
				keyPath = 'main.Z2K2.K3';

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: {
							WlKeyValueBlock: false,
							WlKeyBlock: false
						}
					}
				} );

				const modeSelector = wrapper.findComponent( { name: 'wl-mode-selector' } );
				modeSelector.vm.$emit( 'delete-arg' );

				expect( store.setDirty ).toHaveBeenCalled();
				expect( store.deleteLocalArgumentFromFunctionCall ).toHaveBeenCalledWith( {
					keyPath: [ 'main', 'Z2K2', 'K3' ]
				} );
			} );
		} );

		describe( 'disable edit', () => {
			it( 'disables edit if parent key is disabled', () => {
				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true,
						parentDisableEdit: true
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( true );
			} );

			it( 'disables edit if the key is the identity key of the persistent object', () => {
				keyPath = 'main.Z2K2.Z4K1';
				store.isIdentityKey = createGettersWithFunctionsMock( true );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( true );
			} );

			it( 'disables edit if key is for the Typed List item of a wikidata enum type', () => {
				keyPath = 'main.Z2K2.Z6884K2.0';

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( true );
			} );

			it( 'disables edit if key is for the Typed List item type and the type is bound', () => {
				keyPath = 'main.Z2K2.Z12K1.0';
				store.getExpectedTypeOfKey = createGettersWithFunctionsMock( {
					Z1K1: 'Z7',
					Z7K1: 'Z881',
					Z881K1: 'Z11'
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( true );
			} );

			it( 'enables edit if key is for the Typed List item type and the type is not bound', () => {
				keyPath = 'main.Z2K2.0';
				store.getExpectedTypeOfKey = createGettersWithFunctionsMock( 'Z1' );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( false );
			} );

			it( 'disables edit if key is Z3K1/Key type and Z3K4/Is identity is set to true', () => {
				keyPath = 'main.Z2K2.Z4K2.1.Z3K1';
				store.getZObjectByKeyPath = createGettersWithFunctionsMock( {
					Z3K4: { Z1K1: 'Z9', Z9K1: 'Z41' } // is idetity
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( true );
			} );

			it( 'enables edit if key is Z3K1/Key type and Z3K4/Is identity is set to false', () => {
				keyPath = 'main.Z2K2.Z4K2.1.Z3K1';
				store.getZObjectByKeyPath = createGettersWithFunctionsMock( {
					Z3K4: { Z1K1: 'Z9', Z9K1: 'Z42' } // is not idetity
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( false );
			} );

			it( 'disables edit if key is Z1K1/Object type and the type is bound', () => {
				keyPath = 'main.Z2K2.Z12K1.1.Z1K1';
				store.getExpectedTypeOfKey = createGettersWithFunctionsMock( 'Z11' );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true,
						parentListItemType: 'Z11'
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( true );
			} );

			it( 'disables edit if we are editing the type of a stored persistent object', () => {
				keyPath = 'main.Z2K2.Z1K1';
				store.isCreateNewPage = false;

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( true );
			} );

			it( 'enables edit if we are editing the type of a new persistent object', () => {
				keyPath = 'main.Z2K2.Z1K1';
				store.isCreateNewPage = true;

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( false );
			} );
		} );
	} );

	describe( 'in view mode', () => {
		beforeEach( () => {
			objectValue = { Z1K1: 'Z9', Z9K1: 'Z10001' };
		} );

		it( 'it renders without errors', () => {
			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					keyPath,
					objectValue,
					edit: false
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		describe( 'mode selector', () => {
			it( 'it does not load the mode selector even when key is visible', () => {
				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: false,
						skipKey: false
					}
				} );

				expect( wrapper.findComponent( { name: 'wl-mode-selector' } ).exists() ).toBe( false );
			} );

			it( 'it does not load the mode selector if key is skipped', () => {
				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: false,
						skipKey: true
					}
				} );

				expect( wrapper.findComponent( { name: 'wl-mode-selector' } ).exists() ).toBe( false );
			} );
		} );
	} );

	describe( 'in either view or edit mode', () => {
		describe( 'expanded toggle', () => {
			it( 'shows expansion toggle if it is not a special terminal case', () => {
				objectValue = {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
					Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1002' },
					Z11K2: { Z1K1: 'Z6', Z6K1: 'string value' }
				};

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );
				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( true );
			} );

			it( 'shows expansion for non built-in types with renderer and parser', () => {
				objectValue = {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z10001' },
					Z10001K1: { Z1K1: 'Z6', Z6K1: 'terminal' }
				};
				store.hasRenderer = createGettersWithFunctionsMock( true );
				store.hasParser = createGettersWithFunctionsMock( true );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );
				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( true );
			} );

			it( 'disables expansion when string', () => {
				objectValue = { Z1K1: 'Z6', Z6K1: 'some text' };

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );
				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( false );
			} );

			it( 'disables expansion when reference', () => {
				objectValue = { Z1K1: 'Z6', Z9K1: 'Z1002' };

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );
				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( false );
			} );

			it( 'disables expansion when implementation', () => {
				objectValue = {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z14' }
				};

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );
				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( false );
			} );

			it( 'disables expansion when implementation code', () => {
				keyPath = 'main.Z2K2.Z14K3';
				objectValue = {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z16' }
				};

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );
				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( false );
			} );

			it( 'disables expansion when implementation function', () => {
				keyPath = 'main.Z2K2.Z14K1';
				objectValue = { Z1K1: 'Z9', Z9K1: 'Z10001' };

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );
				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( false );
			} );

			it( 'disables expansion when tester', () => {
				objectValue = {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z20' }
				};

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );
				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( false );
			} );

			it( 'disables expansion when tester function', () => {
				keyPath = 'main.Z2K2.Z20K1';
				objectValue = { Z1K1: 'Z9', Z9K1: 'Z10001' };

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );
				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( false );
			} );

			it( 'disables expansion for non built-in types', () => {
				objectValue = {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z10001' },
					Z10001K1: { Z1K1: 'Z6', Z6K1: 'terminal' }
				};

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );
				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( false );
			} );

			describe( 'expansion for errors/warnings in field', () => {
				it( 'expands when component has field errors', async () => {
					objectValue = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
						Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1002' },
						Z11K2: { Z1K1: 'Z6', Z6K1: 'string value' }
					};

					// Start with no errors
					store.getErrors = jest.fn().mockReturnValue( [] );

					const wrapper = shallowMount( ZObjectKeyValue, {
						props: {
							keyPath,
							objectValue,
							edit: true
						},
						global: {
							stubs: { WlKeyValueBlock: false }
						}
					} );

					// Initially should not be expanded
					expect( wrapper.vm.isExpanded ).toBe( false );

					// Now simulate errors appearing
					store.getErrors = jest.fn().mockReturnValue( [
						{ type: 'error', code: 'some-error' }
					] );

					// Wait for the watcher to trigger and expand the component
					await waitFor( () => {
						expect( wrapper.vm.isExpanded ).toBe( true );
					} );
				} );

				it( 'expands when component has child errors', async () => {
					objectValue = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
						Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1002' },
						Z11K2: { Z1K1: 'Z6', Z6K1: 'string value' }
					};

					// Start with no child errors
					store.getChildErrorKeys = jest.fn().mockReturnValue( [] );

					const wrapper = shallowMount( ZObjectKeyValue, {
						props: {
							keyPath,
							objectValue,
							edit: true
						},
						global: {
							stubs: { WlKeyValueBlock: false }
						}
					} );

					// Initially should not be expanded
					expect( wrapper.vm.isExpanded ).toBe( false );

					// Now simulate child errors appearing
					store.getChildErrorKeys = jest.fn().mockReturnValue( [ 'main.Z2K2.Z11K2' ] );

					// Wait for the watcher to trigger and expand the component
					await waitFor( () => {
						expect( wrapper.vm.isExpanded ).toBe( true );
					} );
				} );

				it( 'expands when component has warnings', async () => {
					objectValue = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
						Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1002' },
						Z11K2: { Z1K1: 'Z6', Z6K1: 'string value' }
					};

					// Start with no warnings
					store.getErrors = jest.fn().mockReturnValue( [] );

					const wrapper = shallowMount( ZObjectKeyValue, {
						props: {
							keyPath,
							objectValue,
							edit: true
						},
						global: {
							stubs: { WlKeyValueBlock: false }
						}
					} );

					// Initially should not be expanded
					expect( wrapper.vm.isExpanded ).toBe( false );

					// Now simulate warnings appearing
					store.getErrors = jest.fn().mockReturnValue( [
						{ type: 'warning', code: 'some-warning' }
					] );

					// Wait for the watcher to trigger and expand the component
					await waitFor( () => {
						expect( wrapper.vm.isExpanded ).toBe( true );
					} );
				} );
			} );
		} );
	} );

	describe( 'state modification', () => {
		describe( 'redirect state changes', () => {
			it( 'trigger set-type if the key is an object type', () => {
				keyPath = 'main.Z2K2.Z1K1';
				objectValue = { Z1K1: 'Z9', Z9K1: 'Z10001' };

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				wrapper.findComponent( { name: 'wl-z-reference' } ).vm.$emit( 'set-value', { keyPath: [], value: 'Z60' } );
				expect( wrapper.emitted() ).toHaveProperty( 'set-type', [ [ { keyPath: [], value: 'Z60' } ] ] );
			} );

			it( 'trigger set-value when type is set to typed list', () => {
				keyPath = 'main.Z2K2.Z1K1.Z7K1';
				objectValue = { Z1K1: 'Z9', Z9K1: '' };

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				wrapper.findComponent( { name: 'wl-z-reference' } ).vm.$emit( 'set-value', { keyPath: [], value: 'Z881' } );
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [], value: [ Constants.Z_OBJECT ] } ] ] );
			} );

			it( 'passes up responsibility if value is an array and key is Z1K1', () => {
				keyPath = 'main.Z2K2.Z1K1';
				objectValue = { Z1K1: 'Z9', Z9K1: '' };

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				wrapper.findComponent( { name: 'wl-z-reference' } ).vm.$emit( 'set-value', { keyPath: [], value: [ Constants.Z_OBJECT ] } );
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [], value: [ Constants.Z_OBJECT ] } ] ] );
			} );

			it( 'passes up responsibility if the change happens on Z3K4.Z40K1 key', () => {
				keyPath = 'main.Z2K2.Z4K2.1.Z3K4.Z40K1';
				objectValue = { Z1K1: 'Z9', Z9K1: '' };

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				wrapper.findComponent( { name: 'wl-z-reference' } ).vm.$emit( 'set-value', {
					keyPath: [ Constants.Z_REFERENCE_ID ],
					value: Constants.Z_BOOLEAN_TRUE
				} );
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					keyPath: [ Constants.Z_BOOLEAN_IDENTITY, Constants.Z_REFERENCE_ID ],
					value: Constants.Z_BOOLEAN_TRUE
				} ] ] );
			} );

			it( 'sets Z3K1 to self if Z3K4 is set to true', () => {
				keyPath = 'main.Z2K2.Z4K2.1.Z3K4';
				objectValue = {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z40' },
					Z40K1: { Z1K1: 'Z9', Z9K1: 'Z42' }
				};
				store.getCurrentZObjectId = 'Z12345';
				store.setKeyType = jest.fn();

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				wrapper.findComponent( { name: 'wl-z-boolean' } ).vm.$emit( 'set-value', {
					keyPath: [ Constants.Z_BOOLEAN_IDENTITY, Constants.Z_REFERENCE_ID ],
					value: Constants.Z_BOOLEAN_TRUE
				} );

				expect( store.setKeyType ).toHaveBeenCalledWith( {
					keyPath: [ 'main', 'Z2K2', 'Z4K2', '1', 'Z3K4' ],
					value: 'Z12345'
				} );
			} );
		} );

		describe( 'perform simple changes', () => {
			it( 'persists the change when occurs to the key-value pair', () => {
				keyPath = 'main.Z2K2';
				objectValue = { Z1K1: 'Z6', Z6K1: 'some value' };

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				wrapper.getComponent( { name: 'wl-z-string' } ).vm.$emit( 'set-value', { keyPath: [ 'Z6K1' ], value: 'my string value' } );
				expect( store.setValueByKeyPath ).toHaveBeenCalledWith( {
					keyPath: [ 'main', 'Z2K2', 'Z6K1' ],
					value: 'my string value'
				} );
			} );

			it( 'triggers a callback when send in payload', async () => {
				keyPath = 'main.Z2K2';
				objectValue = { Z1K1: 'Z6', Z6K1: 'some value' };
				const callbackFn = jest.fn();

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				wrapper.getComponent( { name: 'wl-z-string' } ).vm.$emit( 'set-value', { keyPath: [ 'Z6K1' ], value: 'my string value', callback: callbackFn } );
				expect( callbackFn ).toHaveBeenCalled();
				expect( store.setValueByKeyPath ).toHaveBeenCalledWith( {
					keyPath: [ 'main', 'Z2K2', 'Z6K1' ],
					value: 'my string value'
				} );
			} );
		} );

		describe( 'page redirections', () => {
			it( 'navigates into function editor when content type is set to function', () => {
				keyPath = 'main.Z2K2';
				objectValue = {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z1' }
				};

				const mockNavigate = jest.fn();
				store.navigate = mockNavigate;

				// Create mock title element
				const title = document.createElement( 'h1' );
				title.setAttribute( 'id', 'firstHeading' );
				document.body.appendChild( title );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						keyPath,
						objectValue,
						edit: true
					},
					global: {
						stubs: {
							WlZObjectKeyValueSet: false,
							WlKeyValueBlock: false
						}
					}
				} );

				const keyValueSet = wrapper.findComponent( { name: 'wl-z-object-key-value-set' } );
				keyValueSet.vm.$emit( 'set-type', { value: Constants.Z_FUNCTION } );
				expect( mockNavigate ).toHaveBeenCalledWith( { to: Constants.VIEWS.FUNCTION_EDITOR } );
				expect( store.changeTypeByKeyPath ).toHaveBeenCalledTimes( 1 );
				expect( store.changeTypeByKeyPath ).toHaveBeenCalledWith( {
					keyPath: [ 'main', 'Z2K2' ],
					type: Constants.Z_FUNCTION,
					literal: true
				} );
			} );
		} );
	} );
} );
