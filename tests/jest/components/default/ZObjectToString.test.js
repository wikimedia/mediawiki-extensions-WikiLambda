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
			Z801: 'Echo',
			Z1002: 'English',
			Z10001: 'And',
			Z999K1: 'argument label',
			Z89: 'HTML Fragment'
		} );
	} );

	describe( 'in view and edit mode', () => {
		describe( 'for a terminal string', () => {
			beforeEach( () => {
				keyPath = 'main.Z2K2.Z20K2.Z801K1';
				objectValue = { Z1K1: 'Z6', Z6K1: 'the final stringdown' };
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				expect( wrapper.find( 'span[data-testid=object-to-string-text]' ).exists() ).toBe( true );
				expect( wrapper.find( 'a[data-testid=object-to-string-link]' ).exists() ).toBe( false );
			} );

			it( 'renders the string terminal value', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const stringElement = wrapper.find( 'span[data-testid=object-to-string-text]' );
				expect( stringElement.text() ).toBe( '"the final stringdown"' );
			} );

			it( 'does not labelize the string terminal value if it has a Zid', () => {
				const stringId = { Z1K1: 'Z6', Z6K1: 'Z10001' };
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue: stringId, edit: false } } );
				const stringElement = wrapper.find( 'span[data-testid=object-to-string-text]' );
				expect( stringElement.text() ).toBe( '"Z10001"' );
			} );
		} );

		describe( 'for a terminal reference', () => {
			beforeEach( () => {
				keyPath = 'main.Z2K2.Z20K2.Z801K1';
				objectValue = { Z1K1: 'Z9', Z9K1: 'Z42' };
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				expect( wrapper.find( 'a[data-testid=object-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.find( 'span[data-testid=object-to-string-text]' ).exists() ).toBe( false );
			} );

			it( 'renders the link to referred zobject', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const referenceLink = wrapper.find( 'a[data-testid=object-to-string-link]' );
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
				expect( wrapper.find( 'span[data-testid=object-to-string-text]' ).exists() ).toBe( false );
				expect( wrapper.find( 'a[data-testid=object-to-string-link]' ).exists() ).toBe( true );
			} );

			it( 'renders the HTML fragment terminal value', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const referenceLink = wrapper.find( 'a[data-testid=object-to-string-link]' );
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
				expect( wrapper.find( 'a[data-testid=object-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.find( 'span[data-testid=object-to-string-text]' ).exists() ).toBe( false );
			} );

			it( 'renders the link to called function', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const referenceLink = wrapper.find( 'a[data-testid=object-to-string-link]' );
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
				expect( wrapper.find( 'a[data-testid=object-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.findAll( 'span[data-testid=object-to-string-text]' ) ).toHaveLength( 2 );
			} );

			it( 'renders the link to called function', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const referenceLink = wrapper.find( 'a[data-testid=object-to-string-link]' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z10001' );
				expect( referenceLink.text() ).toBe( 'And' );
			} );

			it( 'renders comma separated arguments', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );

				const childElements = wrapper.findAllComponents( { name: 'wl-z-object-to-string' } );
				const dividerElements = wrapper.findAll( '.ext-wikilambda-app-object-to-string__divider' );

				expect( childElements.length ).toBe( 3 );
				expect( childElements[ 0 ].text() ).toBe( 'And' );
				expect( childElements[ 1 ].text() ).toBe( '"first arg"' );
				expect( childElements[ 2 ].text() ).toBe( '"second arg"' );

				expect( dividerElements[ 0 ].text() ).toBe( '(' );
				expect( dividerElements[ 1 ].text() ).toBe( ',' );
				expect( dividerElements[ 2 ].text() ).toBe( ')' );
			} );
		} );

		describe( 'for a function call with function id given by a nested function call', () => {
			beforeEach( () => {
				keyPath = 'main.Z2K2';
				// Echo( And )( "first arg", "second arg" )
				objectValue = {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
					Z7K1: {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
						Z7K1: { Z1K1: 'Z9', Z9K1: 'Z801' },
						Z801K1: { Z1K1: 'Z9', Z9K1: 'Z10001' }
					},
					K1: { Z1K1: 'Z6', Z6K1: 'first arg' },
					K2: { Z1K1: 'Z6', Z6K1: 'second arg' }
				};
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				expect( wrapper.findAll( 'a[data-testid=object-to-string-link]' ) ).toHaveLength( 2 );
				expect( wrapper.findAll( 'span[data-testid=object-to-string-text]' ) ).toHaveLength( 2 );
			} );

			it( 'renders heading function call', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const heading = wrapper.find( '.ext-wikilambda-app-object-to-string__parent' );

				const parentElement = heading.find( '.ext-wikilambda-app-object-to-string__parent' );
				const childElements = heading.findAll( '.ext-wikilambda-app-object-to-string__child' );
				const dividerElements = heading.findAll( '.ext-wikilambda-app-object-to-string__divider' );

				expect( parentElement.text() ).toBe( 'Echo' );
				expect( childElements.length ).toBe( 1 );
				expect( childElements[ 0 ].text() ).toBe( 'And' );
				expect( dividerElements[ 0 ].text() ).toBe( '(' );
				expect( dividerElements[ 1 ].text() ).toBe( ')' );
			} );

			it( 'renders children function call arguments', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const children = wrapper.findAll( '.ext-wikilambda-app-object-to-string__children' );

				expect( children.length ).toBe( 2 );
				const args = children[ 1 ];

				const childElements = args.findAll( '.ext-wikilambda-app-object-to-string__child' );
				const dividerElements = args.findAll( '.ext-wikilambda-app-object-to-string__divider' );

				expect( childElements.length ).toBe( 2 );
				expect( childElements[ 0 ].text() ).toBe( '"first arg"' );
				expect( childElements[ 1 ].text() ).toBe( '"second arg"' );
				expect( dividerElements[ 0 ].text() ).toBe( '(' );
				expect( dividerElements[ 1 ].text() ).toBe( ',' );
				expect( dividerElements[ 2 ].text() ).toBe( ')' );
			} );
		} );

		describe( 'for a function call with function id given by an argument reference', () => {
			beforeEach( () => {
				keyPath = 'main.Z2K2';
				// →argument label( "first arg", "second arg" )
				objectValue = {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
					Z7K1: {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z18' },
						Z18K1: { Z1K1: 'Z6', Z6K1: 'Z999K1' }
					},
					K1: { Z1K1: 'Z6', Z6K1: 'first arg' },
					K2: { Z1K1: 'Z6', Z6K1: 'second arg' }
				};
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				expect( wrapper.findAll( 'a[data-testid=object-to-string-link]' ) ).toHaveLength( 0 );
				expect( wrapper.findAll( 'span[data-testid=object-to-string-text]' ) ).toHaveLength( 3 );
			} );

			it( 'renders heading argument reference', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const heading = wrapper.find( '.ext-wikilambda-app-object-to-string__parent' );

				const stringElement = heading.find( 'span[data-testid=object-to-string-text]' );
				expect( heading.findComponent( { name: 'cdx-icon' } ).exists() ).toBe( true );
				expect( stringElement.text() ).toBe( 'argument label' );
			} );

			it( 'renders children function call arguments', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const children = wrapper.findAll( '.ext-wikilambda-app-object-to-string__children' );

				expect( children.length ).toBe( 1 );
				const args = children[ 0 ];

				const childElements = args.findAll( '.ext-wikilambda-app-object-to-string__child' );
				const dividerElements = args.findAll( '.ext-wikilambda-app-object-to-string__divider' );

				expect( childElements.length ).toBe( 2 );
				expect( childElements[ 0 ].text() ).toBe( '"first arg"' );
				expect( childElements[ 1 ].text() ).toBe( '"second arg"' );
				expect( dividerElements[ 0 ].text() ).toBe( '(' );
				expect( dividerElements[ 1 ].text() ).toBe( ',' );
				expect( dividerElements[ 2 ].text() ).toBe( ')' );
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
				expect( wrapper.find( 'a[data-testid=object-to-string-link]' ).exists() ).toBe( false );
				expect( wrapper.find( 'span[data-testid=object-to-string-text]' ).exists() ).toBe( true );
			} );

			it( 'renders the link to type', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const stringElement = wrapper.find( 'span[data-testid=object-to-string-text]' );
				expect( stringElement.text() ).toBe( 'argument label' );
			} );

			it( 'renders an icon for an argument reference type with the terminal value', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const stringElement = wrapper.find( 'span[data-testid=object-to-string-text]' );
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
					const referenceLink = wrapper.find( 'a[data-testid=object-to-string-link]' );
					expect( wrapper.findComponent( { name: 'cdx-icon' } ).exists() ).toBe( true );
					expect( referenceLink.attributes().href ).toBe( 'https://www.wikidata.org/wiki/Q42' );
					expect( referenceLink.text() ).toBe( 'The Answer To The Question' );
				} );

				it( 'renders a fetch function to a Wikidata item', () => {
					objectValue = wdFetchFunction;

					const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
					const referenceLink = wrapper.find( 'a[data-testid=object-to-string-link]' );
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
					const referenceLink = wrapper.find( 'a[data-testid=object-to-string-link]' );
					expect( wrapper.findComponent( { name: 'cdx-icon' } ).exists() ).toBe( true );
					expect( referenceLink.attributes().href ).toBe( 'https://www.wikidata.org/wiki/Lexeme:L42' );
					expect( referenceLink.text() ).toBe( 'answer' );
				} );

				it( 'renders a fetch function to a Wikidata lexeme', () => {
					objectValue = wdFetchFunction;

					const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
					const referenceLink = wrapper.find( 'a[data-testid=object-to-string-link]' );
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
					const referenceLink = wrapper.find( 'a[data-testid=object-to-string-link]' );
					expect( wrapper.findComponent( { name: 'cdx-icon' } ).exists() ).toBe( true );
					expect( referenceLink.attributes().href ).toBe( 'https://www.wikidata.org/wiki/Lexeme:L42#F1' );
					expect( referenceLink.text() ).toBe( 'answered' );
				} );

				it( 'renders a fetch function to a Wikidata lexeme form', () => {
					objectValue = wdFetchFunction;

					const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
					const referenceLink = wrapper.find( 'a[data-testid=object-to-string-link]' );
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
					const referenceLink = wrapper.find( 'a[data-testid=object-to-string-link]' );
					expect( wrapper.findComponent( { name: 'cdx-icon' } ).exists() ).toBe( true );
					expect( referenceLink.attributes().href ).toBe( 'https://www.wikidata.org/wiki/Property:P42' );
					expect( referenceLink.text() ).toBe( 'is answer to' );
				} );

				it( 'renders a fetch function to a Wikidata property', () => {
					objectValue = wdFetchFunction;

					const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
					const referenceLink = wrapper.find( 'a[data-testid=object-to-string-link]' );
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
				expect( wrapper.findAll( 'a[data-testid=object-to-string-link]' ) ).toHaveLength( 2 );
				expect( wrapper.findAll( 'span[data-testid=object-to-string-text]' ) ).toHaveLength( 1 );
			} );

			it( 'renders the link to type', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const referenceLink = wrapper.find( 'a[data-testid=object-to-string-link]' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z11' );
				expect( referenceLink.text() ).toBe( 'Monolingual text' );
			} );

			it( 'renders the link to referenced argument', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );

				const childElements = wrapper.findAllComponents( { name: 'wl-z-object-to-string' } );
				expect( childElements.length ).toBe( 2 );

				const referenceLink = childElements[ 0 ].find( 'a[data-testid=object-to-string-link]' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z1002' );
				expect( referenceLink.text() ).toBe( 'English' );
			} );

			it( 'renders comma separated arguments', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );

				const parentElement = wrapper.find( '.ext-wikilambda-app-object-to-string__parent' );
				const childElements = wrapper.findAll( '.ext-wikilambda-app-object-to-string__child' );
				const dividerElements = wrapper.findAll( '.ext-wikilambda-app-object-to-string__divider' );

				expect( parentElement.text() ).toBe( 'Monolingual text' );
				expect( childElements[ 0 ].text() ).toBe( 'English' );
				expect( childElements[ 1 ].text() ).toBe( '"string value"' );

				expect( dividerElements[ 0 ].text() ).toBe( '(' );
				expect( dividerElements[ 1 ].text() ).toBe( ',' );
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
					expect( wrapper.find( 'span[data-testid=object-to-string-text]' ).text() ).toBe( 'Rendered Value' );
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
				expect( wrapper.find( 'a[data-testid=object-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.find( 'span[data-testid=object-to-string-text]' ).exists() ).toBe( false );
			} );

			it( 'in edit mode: renders the call to action link to select the referred zobject', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: true } } );
				const referenceLink = wrapper.find( 'a[data-testid=object-to-string-link]' );
				expect( referenceLink.attributes().href ).toBe( undefined );
				expect( referenceLink.text() ).toEqual( 'Select Language' );
			} );

			it( 'in read mode: renders the link to the referred zobject', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const referenceLink = wrapper.find( 'a[data-testid=object-to-string-link]' );
				expect( referenceLink.attributes().href ).toBe( undefined );
				expect( referenceLink.text() ).toEqual( 'Language' );
			} );

			it( 'triggers an expand event when clicking the link', async () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: true } } );
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
				expect( wrapper.find( 'a[data-testid=object-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.find( 'span[data-testid=object-to-string-text]' ).exists() ).toBe( false );
			} );

			it( 'in edit mode: renders the call to action link to select a function', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: true } } );
				const referenceLink = wrapper.find( 'a[data-testid=object-to-string-link]' );
				expect( referenceLink.attributes().href ).toBe( undefined );
				expect( referenceLink.text() ).toEqual( 'Select Function' );
			} );

			it( 'in read mode: renders the link to function', () => {
				const wrapper = mount( ZObjectToString, { props: { keyPath, objectValue, edit: false } } );
				const referenceLink = wrapper.find( 'a[data-testid=object-to-string-link]' );
				expect( referenceLink.attributes().href ).toBe( undefined );
				expect( referenceLink.text() ).toEqual( 'Function' );
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
