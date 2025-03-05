/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' );
const { mount } = require( '@vue/test-utils' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock;
const createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock;
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const ZObjectToString = require( '../../../../resources/ext.wikilambda.app/components/types/ZObjectToString.vue' );

describe( 'ZObjectToString', () => {
	let store,
		keyPath,
		objectValue;

	beforeEach( () => {
		// reset props
		keyPath = undefined;
		objectValue = undefined;

		store = useMainStore();
		// Getters
		store.getUserLangCode = 'en';
		store.getUserLangZid = 'Z1002';
		store.getExpectedTypeOfKey = jest.fn().mockImplementation( ( key ) => {
			const types = { Z11K1: 'Z60', Z7K1: 'Z8' };
			return types[ key ] || 'Z1';
		} );
		store.getRendererZid = createGettersWithFunctionsMock( undefined );
		store.getWikidataEntityLabelData = createGettersWithFunctionsMock();
		store.getLabelData = createLabelDataMock( {
			Z42: 'False',
			Z8: 'Function',
			Z60: 'Language',
			Z7K1: 'function',
			Z11: 'Monolingual text',
			Z1002: 'English',
			Z10001: 'And',
			Z999K1: 'argument label',
			Z89: 'HTML Fragment'
		} );
		// Actions
		store.fetchWikidataEntitiesByType = jest.fn();
		store.runRenderer = jest.fn();
	} );

	describe( 'in view and edit mode', () => {
		describe( 'for a terminal string', () => {
			beforeEach( () => {
				keyPath = 'main.Z2K2.Z20K2.Z801K1';
				objectValue = { Z1K1: 'Z6', Z6K1: 'the final stringdown' };
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				expect( wrapper.find( 'div[data-testid=object-to-string-text]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[data-testid=object-to-string-link]' ).exists() ).toBe( false );
			} );

			it( 'renders the string terminal value', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const stringElement = wrapper.find( 'div[data-testid=object-to-string-text]' );
				expect( stringElement.text() ).toBe( '"the final stringdown"' );
			} );
		} );

		describe( 'for a terminal reference', () => {
			beforeEach( () => {
				keyPath = 'main.Z2K2.Z20K2.Z801K1';
				objectValue = { Z1K1: 'Z9', Z9K1: 'Z42' };
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				expect( wrapper.find( 'div[data-testid=object-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[data-testid=object-to-string-text]' ).exists() ).toBe( false );
			} );

			it( 'renders the link to referred zobject', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z42' );
				expect( referenceLink.text() ).toBe( 'False' );
			} );
		} );

		describe( 'for a terminal html fragment', () => {
			beforeEach( () => {
				keyPath = 'main.Z2K2.Z20K2.Z801K1';
				objectValue = {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z89' },
					Z89K1: { Z1K1: 'Z6', Z6K1: '<b>hello</b>' }
				};
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				expect( wrapper.find( 'div[data-testid=object-to-string-text]' ).exists() ).toBe( false );
				expect( wrapper.find( 'div[data-testid=object-to-string-link]' ).exists() ).toBe( true );
			} );

			it( 'renders the HTML fragment terminal value', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const referenceLink = wrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z89' );
				expect( referenceLink.text() ).toBe( 'HTML Fragment' );
			} );
		} );

		describe( 'for a function call with zero arguments', () => {
			beforeEach( () => {
				keyPath = 'main.Z2K2.Z20K2.Z801K1';
				objectValue = {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
					Z7K1: { Z1K1: 'Z9', Z9K1: 'Z10001' }
				};
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				expect( wrapper.find( 'div[data-testid=object-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[data-testid=object-to-string-text]' ).exists() ).toBe( false );
			} );

			it( 'renders the link to called function', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z10001' );
				expect( referenceLink.text() ).toBe( 'And' );
			} );
		} );

		describe( 'for a function call with arguments', () => {
			beforeEach( () => {
				keyPath = 'main.Z2K2.Z20K2.Z801K1';
				objectValue = {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
					Z7K1: { Z1K1: 'Z9', Z9K1: 'Z10001' },
					Z10001K1: { Z1K1: 'Z6', Z6K1: 'first arg' },
					Z10001K2: { Z1K1: 'Z6', Z6K1: 'second arg' }
				};
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				expect( wrapper.find( 'div[data-testid=object-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.findAll( 'div[data-testid=object-to-string-text]' ) ).toHaveLength( 2 );
			} );

			it( 'renders the link to called function', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z10001' );
				expect( referenceLink.text() ).toBe( 'And' );
			} );

			it( 'renders comma separated arguments', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );

				const childElements = wrapper.findAll( '.ext-wikilambda-app-object-to-string' );
				const dividerElements = wrapper.findAll( '.ext-wikilambda-app-object-to-string__divider' );

				expect( childElements[ 1 ].text() ).toBe( 'And' );
				expect( dividerElements[ 0 ].text() ).toBe( '(' );
				expect( childElements[ 2 ].text() ).toBe( '"first arg"' );
				expect( dividerElements[ 1 ].text() ).toBe( ',' );
				expect( childElements[ 3 ].text() ).toBe( '"second arg"' );
				expect( dividerElements[ 2 ].text() ).toBe( ')' );
			} );

			it( 'renders each argument with another ZObjectToString component', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				expect( wrapper.findAllComponents( ZObjectToString ) ).toHaveLength( 2 );
			} );
		} );

		describe( 'for an argument reference', () => {
			beforeEach( () => {
				keyPath = 'main.Z2K2.Z20K2.Z801K1';
				objectValue = {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
					Z18K1: { Z1K1: 'Z6', Z6K1: 'Z999K1' }
				};
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				expect( wrapper.find( 'div[data-testid=object-to-string-link]' ).exists() ).toBe( false );
				expect( wrapper.find( 'div[data-testid=object-to-string-text]' ).exists() ).toBe( true );
			} );

			it( 'renders the link to type', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const stringElement = wrapper.find( 'div[data-testid=object-to-string-text] span > span' );
				expect( stringElement.text() ).toBe( 'argument label' );
			} );

			it( 'renders an icon for an argument reference type with the terminal value', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );

				const stringElement = wrapper.find( 'div[data-testid=object-to-string-text] span > span' );

				expect( wrapper.findComponent( { name: 'cdx-icon' } ).exists() ).toBe( true );
				expect( stringElement.text() ).toBe( 'argument label' );
			} );
		} );

		describe( 'for Wikidata entities', () => {
			let wdReference, wdFetchFunction;

			beforeEach( () => {
				keyPath = 'main.Z2K2.Z20K2.Z801K1';
				store.getWikidataEntityLabelData = jest.fn().mockImplementation( ( _, id ) => {
					const testLabels = {
						Q42: 'The Answer To The Question',
						L42: 'answer',
						'L42-F1': 'answered',
						P42: 'is answer to'
					};
					const label = testLabels[ id ];
					return label ? { zid: id, label } : undefined;
				} );
			} );

			describe( 'Wikidata items', () => {
				beforeEach( () => {
					wdReference = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6091' },
						Z6091K1: { Z1K1: 'Z6', Z6K1: 'Q42' }
					};
					wdFetchFunction = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
						Z7K1: { Z1K1: 'Z9', Z9K1: 'Z6821' },
						Z6821K1: wdReference
					};
				} );

				it( 'renders a link to a Wikidata item', () => {
					objectValue = wdReference;

					const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
					const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
					const referenceLink = linkWrapper.get( 'a' );
					expect( wrapper.findComponent( { name: 'cdx-icon' } ).exists() ).toBe( true );
					expect( referenceLink.attributes().href ).toBe( 'https://www.wikidata.org/wiki/Q42' );
					expect( referenceLink.text() ).toBe( 'The Answer To The Question' );
				} );

				it( 'renders a fetch function to a Wikidata item', () => {
					objectValue = wdFetchFunction;

					const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
					const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
					const referenceLink = linkWrapper.get( 'a' );
					expect( wrapper.findComponent( { name: 'cdx-icon' } ).exists() ).toBe( true );
					expect( referenceLink.attributes().href ).toBe( 'https://www.wikidata.org/wiki/Q42' );
					expect( referenceLink.text() ).toBe( 'The Answer To The Question' );
				} );
			} );

			describe( 'Wikidata lexemes', () => {
				beforeEach( () => {
					wdReference = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6095' },
						Z6095K1: { Z1K1: 'Z6', Z6K1: 'L42' }
					};
					wdFetchFunction = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
						Z7K1: { Z1K1: 'Z9', Z9K1: 'Z6825' },
						Z6825K1: wdReference
					};
				} );

				it( 'renders a link to a Wikidata lexeme', () => {
					objectValue = wdReference;

					const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
					const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
					const referenceLink = linkWrapper.get( 'a' );
					expect( wrapper.findComponent( { name: 'cdx-icon' } ).exists() ).toBe( true );
					expect( referenceLink.attributes().href ).toBe( 'https://www.wikidata.org/wiki/Lexeme:L42' );
					expect( referenceLink.text() ).toBe( 'answer' );
				} );

				it( 'renders a fetch function to a Wikidata lexeme', () => {
					objectValue = wdFetchFunction;

					const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
					const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
					const referenceLink = linkWrapper.get( 'a' );
					expect( wrapper.findComponent( { name: 'cdx-icon' } ).exists() ).toBe( true );
					expect( referenceLink.attributes().href ).toBe( 'https://www.wikidata.org/wiki/Lexeme:L42' );
					expect( referenceLink.text() ).toBe( 'answer' );
				} );
			} );

			describe( 'Wikidata lexeme forms', () => {
				beforeEach( () => {
					wdReference = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6094' },
						Z6094K1: { Z1K1: 'Z6', Z6K1: 'L42-F1' }
					};
					wdFetchFunction = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
						Z7K1: { Z1K1: 'Z9', Z9K1: 'Z6824' },
						Z6824K1: wdReference
					};
				} );

				it( 'renders a link to a Wikidata lexeme form', () => {
					objectValue = wdReference;

					const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
					const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
					const referenceLink = linkWrapper.get( 'a' );
					expect( wrapper.findComponent( { name: 'cdx-icon' } ).exists() ).toBe( true );
					expect( referenceLink.attributes().href ).toBe( 'https://www.wikidata.org/wiki/Lexeme:L42#F1' );
					expect( referenceLink.text() ).toBe( 'answered' );
				} );

				it( 'renders a fetch function to a Wikidata lexeme form', () => {
					objectValue = wdFetchFunction;

					const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
					const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
					const referenceLink = linkWrapper.get( 'a' );
					expect( wrapper.findComponent( { name: 'cdx-icon' } ).exists() ).toBe( true );
					expect( referenceLink.attributes().href ).toBe( 'https://www.wikidata.org/wiki/Lexeme:L42#F1' );
					expect( referenceLink.text() ).toBe( 'answered' );
				} );
			} );

			describe( 'Wikidata properties', () => {
				beforeEach( () => {
					wdReference = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z6092' },
						Z6092K1: { Z1K1: 'Z6', Z6K1: 'P42' }
					};
					wdFetchFunction = {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
						Z7K1: { Z1K1: 'Z9', Z9K1: 'Z6822' },
						Z6822K1: wdReference
					};
				} );

				it( 'renders a link to a Wikidata property', () => {
					objectValue = wdReference;

					const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
					const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
					const referenceLink = linkWrapper.get( 'a' );
					expect( wrapper.findComponent( { name: 'cdx-icon' } ).exists() ).toBe( true );
					expect( referenceLink.attributes().href ).toBe( 'https://www.wikidata.org/wiki/Property:P42' );
					expect( referenceLink.text() ).toBe( 'is answer to' );
				} );

				it( 'renders a fetch function to a Wikidata property', () => {
					objectValue = wdFetchFunction;

					const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
					const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
					const referenceLink = linkWrapper.get( 'a' );
					expect( wrapper.findComponent( { name: 'cdx-icon' } ).exists() ).toBe( true );
					expect( referenceLink.attributes().href ).toBe( 'https://www.wikidata.org/wiki/Property:P42' );
					expect( referenceLink.text() ).toBe( 'is answer to' );
				} );
			} );
		} );

		describe( 'for any other type', () => {
			beforeEach( () => {
				// Example for fallback behavior: ZMonolingual string object
				keyPath = 'main.Z2K2.Z20K2.Z801K1';
				objectValue = {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
					Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1002' },
					Z11K2: { Z1K1: 'Z6', Z6K1: 'string value' }
				};
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				expect( wrapper.findAll( 'div[data-testid=object-to-string-link]' ) ).toHaveLength( 2 );
				expect( wrapper.findAll( 'div[data-testid=object-to-string-text]' ) ).toHaveLength( 1 );
			} );

			it( 'renders the link to type', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z11' );
				expect( referenceLink.text() ).toBe( 'Monolingual text' );
			} );

			it( 'renders the link to referenced argument', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
				const argWrapper = linkWrapper.find( 'div[data-testid=object-to-string-link]' );
				const referenceLink = argWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z1002' );
				expect( referenceLink.text() ).toBe( 'English' );
			} );

			it( 'renders comma separated arguments', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );

				const childElements = wrapper.findAll( '.ext-wikilambda-app-object-to-string' );
				const dividerElements = wrapper.findAll( '.ext-wikilambda-app-object-to-string__divider' );

				expect( childElements[ 1 ].text() ).toBe( 'Monolingual text' );
				expect( dividerElements[ 0 ].text() ).toBe( '(' );
				expect( childElements[ 2 ].text() ).toBe( 'English' );
				expect( dividerElements[ 1 ].text() ).toBe( ',' );
				expect( childElements[ 4 ].text() ).toBe( '"string value"' );
				expect( dividerElements[ 2 ].text() ).toBe( ')' );
			} );

			it( 'renders each argument with another ZObjectToString component', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				expect( wrapper.findAllComponents( ZObjectToString ) ).toHaveLength( 2 );
			} );

			it( 'renders the rendered value if it has a renderer that succeeds', async () => {
				// TODO: Implement this test
				store.getRendererZid = createGettersWithFunctionsMock( 'Z123' );
				store.runRenderer = jest.fn().mockResolvedValue( {
					response: {
						[ Constants.Z_RESPONSEENVELOPE_VALUE ]: 'Rendered Value'
					}
				} );

				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );

				await waitFor( () => {
					expect( wrapper.vm.rendererRunning ).toBe( false );
					expect( wrapper.vm.rendererError ).toBe( false );
					expect( wrapper.find( 'div[data-testid=object-to-string-text]' ).text() ).toBe( 'Rendered Value' );
				} );
			} );

			it( 'renders each argument with another ZObjectToString component if the renderer API call fails', async () => {
				store.getRendererZid = createGettersWithFunctionsMock( 'Z123' );
				store.runRenderer = jest.fn().mockRejectedValue( new Error( 'Renderer failed' ) );

				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );

				await waitFor( () => {
					expect( wrapper.vm.rendererRunning ).toBe( false );
					expect( wrapper.vm.rendererError ).toBe( true );
					expect( wrapper.findAllComponents( ZObjectToString ) ).toHaveLength( 2 );
				} );
			} );

			it( 'renders each argument with another ZObjectToString component if it has a renderer that returns an invalid response', async () => {
				store.getRendererZid = createGettersWithFunctionsMock( 'Z123' );
				store.runRenderer = jest.fn().mockResolvedValue( {
					response: {
						[ Constants.Z_RESPONSEENVELOPE_VALUE ]: Constants.Z_VOID
					}
				} );

				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );

				await waitFor( () => {
					expect( wrapper.vm.rendererRunning ).toBe( false );
					expect( wrapper.vm.rendererError ).toBe( true );
					expect( wrapper.findAllComponents( ZObjectToString ) ).toHaveLength( 2 );
				} );
			} );
		} );
	} );

	describe( 'with empty values', () => {
		describe( 'for a terminal empty reference language', () => {
			beforeEach( () => {
				keyPath = 'main.Z2K2.Z20K2.Z801K1.Z11K1';
				objectValue = { Z1K1: 'Z9', Z9K1: '' };
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				expect( wrapper.find( 'div[data-testid=object-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[data-testid=object-to-string-text]' ).exists() ).toBe( false );
			} );

			it( 'renders the link to referred zobject', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( undefined );
				expect( referenceLink.text() ).toEqual( 'Select $1' );
				expect( global.$i18n ).toHaveBeenCalledWith( 'wikilambda-zobject-to-string-select-object', 'Language' );
			} );

			it( 'triggers an expand event when clicking the link', async () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const link = wrapper.find( '.ext-wikilambda-app-object-to-string__blank' );
				link.trigger( 'click' );
				await waitFor( () => expect( wrapper.emitted( 'expand' ) ).toBeTruthy() );
			} );
		} );

		describe( 'for a function call with an empty function', () => {
			beforeEach( () => {
				keyPath = 'main.Z2K2.Z20K2.Z801K1';
				objectValue = {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
					Z7K1: { Z1K1: 'Z9', Z9K1: '' }
				};
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				expect( wrapper.find( 'div[data-testid=object-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[data-testid=object-to-string-text]' ).exists() ).toBe( false );
			} );

			it( 'renders the link to called function', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( undefined );
				expect( referenceLink.text() ).toEqual( 'Select $1' );
				expect( global.$i18n ).toHaveBeenCalledWith( 'wikilambda-zobject-to-string-select-object', 'Function' );
			} );

			it( 'triggers an expand event when clicking the link', async () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const link = wrapper.find( '.ext-wikilambda-app-object-to-string__blank' );
				link.trigger( 'click' );
				await waitFor( () => expect( wrapper.emitted( 'expand' ) ).toBeTruthy() );
			} );
		} );
	} );
} );
