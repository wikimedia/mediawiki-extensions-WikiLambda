/*!
 * WikiLambda unit test suite for the default EvaluationResult component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock;
const createLabelDataMock = require( '../../../helpers/getterHelpers.js' ).createLabelDataMock;
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const EvaluationResult = require( '../../../../../resources/ext.wikilambda.app/components/widgets/function-evaluator/EvaluationResult.vue' );
const { mockWindowLocation, restoreWindowLocation } = require( '../../../fixtures/location.js' );
const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );

const responseObject = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z22' },
	Z22K1: { Z1K1: 'Z6', Z6K1: 'one two' },
	Z22K2: {}
};

describe( 'EvaluationResult', () => {
	let store;

	const renderEvaluationResult = ( options = {} ) => shallowMount( EvaluationResult, {
		global: {
			stubs: {
				CdxButton: false
			},
			config: {
				errorHandler: ( err ) => {
					// TODO: v-tooltip is causing these error, we need to fix it.
					// eslint-disable-next-line n/no-unsupported-features/node-builtins
					if ( err instanceof DOMException || err.message.includes( 'insertBefore' ) || err.message.includes( 'subtree' ) ) {
						return;
					}
				}
			}
		},
		...options
	} );

	beforeEach( () => {
		store = useMainStore();
		store.getCurrentZObjectId = 'Z0';
		store.getCurrentZObjectType = createGettersWithFunctionsMock( 'Z14' );
		store.getLabelData = createLabelDataMock();
		store.getZObjectByKeyPath = createGettersWithFunctionsMock( responseObject );
		store.getCurrentView = 'function-evaluator';

		// Mock navigator.clipboard
		navigator.clipboard = {
			writeText: jest.fn().mockResolvedValue( undefined )
		};

		mockWindowLocation( 'http://example.com/wiki/Special:RunFunction' );

	} );

	afterEach( () => {
		restoreWindowLocation();
	} );

	describe( 'with no result', () => {
		it( 'renders without errors', () => {
			const wrapper = renderEvaluationResult();
			expect( wrapper.find( '.ext-wikilambda-app-evaluation-result' ).exists() ).toBe( true );
		} );
	} );

	describe( 'with result', () => {
		it( 'renders without errors', () => {
			const wrapper = renderEvaluationResult();
			expect( wrapper.find( '.ext-wikilambda-app-evaluation-result' ).exists() ).toBe( true );
		} );

		it( 'renders result object', () => {
			const wrapper = renderEvaluationResult();
			const result = wrapper.find( '.ext-wikilambda-app-evaluation-result__result' );

			const resultComponent = result.findComponent( { name: 'wl-z-object-key-value' } );
			expect( resultComponent.exists() ).toBe( true );
			expect( resultComponent.props( 'keyPath' ) ).toBe( 'response.Z22K1' );
			expect( resultComponent.props( 'objectValue' ) ).toEqual( { Z1K1: 'Z6', Z6K1: 'one two' } );
		} );
	} );

	describe( 'with metadata', () => {
		beforeEach( () => {
			store.getMetadata = {};
		} );

		it( 'renders without errors', () => {
			const wrapper = renderEvaluationResult();
			expect( wrapper.find( '.ext-wikilambda-app-evaluation-result' ).exists() ).toBe( true );
		} );

		it( 'renders metadata link', () => {
			const wrapper = renderEvaluationResult();
			const actions = wrapper.find( '.ext-wikilambda-app-evaluation-result__actions' );
			expect( actions.find( '.ext-wikilambda-app-evaluation-result__action-details' ).exists() ).toBe( true );
		} );

		it( 'renders metadata dialog', () => {
			const wrapper = renderEvaluationResult();
			expect( wrapper.findComponent( { name: 'wl-function-metadata-dialog' } ).exists() ).toBe( true );
		} );
	} );

	describe( 'share functionality', () => {
		const functionCall = {
			Z1K1: {
				Z1K1: 'Z9',
				Z9K1: 'Z7'
			},
			Z7K1: {
				Z1K1: 'Z9',
				Z9K1: 'Z801'
			},
			Z801K1: {
				Z1K1: 'Z6',
				Z6K1: 'KOEKIE'
			}
		};

		beforeEach( () => {
			store.getZObjectByKeyPath = jest.fn( ( keyPath ) => {
				if ( keyPath && keyPath[ 0 ] === 'call' ) {
					return functionCall;
				}
				if ( keyPath && keyPath[ 0 ] === 'response' ) {
					return responseObject;
				}
				return null;
			} );
		} );

		it( 'should render share button when function is selected', () => {
			const wrapper = renderEvaluationResult();

			const shareButton = wrapper.findAllComponents( { name: 'cdx-button' } )[ 1 ];
			expect( shareButton.exists() ).toBe( true );
		} );

		it( 'should not render share button when no function is selected', () => {
			store.getZObjectByKeyPath = jest.fn( ( keyPath ) => {
				if ( keyPath && keyPath[ 0 ] === 'call' ) {
					return null;
				}
				if ( keyPath && keyPath[ 0 ] === 'response' ) {
					return responseObject;
				}
				return null;
			} );
			const wrapper = renderEvaluationResult();

			const buttons = wrapper.findAllComponents( { name: 'cdx-button' } );
			expect( buttons.length ).toBe( 1 );
		} );

		it( 'should generate and copy share URL when share button is clicked', async () => {
			const canonicalFunctionCall = {
				Z1K1: 'Z7',
				Z7K1: 'Z801',
				Z801K1: 'KOEKIE'
			};
			const wrapper = renderEvaluationResult();

			const shareButton = wrapper.findAllComponents( { name: 'cdx-button' } )[ 1 ];

			await shareButton.trigger( 'click' );

			// Verify clipboard.writeText was called
			expect( navigator.clipboard.writeText ).toHaveBeenCalled();
			const copiedUrl = navigator.clipboard.writeText.mock.calls[ 0 ][ 0 ];

			// Verify URL contains encoded function call
			expect( copiedUrl ).toContain( 'call=' );
			const callParam = new URL( copiedUrl ).searchParams.get( 'call' );
			const decodedCall = JSON.parse( decodeURIComponent( callParam ) );

			expect( decodedCall ).toEqual( canonicalFunctionCall );
		} );

		it( 'should show check icon message after clicking share', async () => {
			const wrapper = renderEvaluationResult();
			const shareButton = wrapper.findAllComponents( { name: 'cdx-button' } )[ 1 ];

			// Initially shows "Copy result link"
			expect( shareButton.text() ).toBe( 'Copy result link' );

			await shareButton.trigger( 'click' );

			// After clicking, shows check icon
			expect( wrapper.vm.linkCopied ).toBe( true );
			expect( shareButton.findAllComponents( { name: 'cdx-icon' } ).length ).toBe( 2 );
		} );

		it( 'should not render share button when contentType is Z_TESTER', () => {
			const wrapper = renderEvaluationResult( {
				props: {
					contentType: Constants.Z_TESTER
				}
			} );

			const buttons = wrapper.findAllComponents( { name: 'cdx-button' } );
			expect( buttons.length ).toBe( 1 ); // Only the details button, no share button
		} );

		it( 'should not render share button when contentType is Z_IMPLEMENTATION', () => {
			const wrapper = renderEvaluationResult( {
				props: {
					contentType: Constants.Z_IMPLEMENTATION
				}
			} );

			const buttons = wrapper.findAllComponents( { name: 'cdx-button' } );
			expect( buttons.length ).toBe( 1 ); // Only the details button, no share button
		} );

		it( 'should render share button when contentType is undefined (function page)', () => {
			const wrapper = renderEvaluationResult( {
				props: {
					contentType: undefined
				}
			} );

			const shareButton = wrapper.findAllComponents( { name: 'cdx-button' } )[ 1 ];
			expect( shareButton.exists() ).toBe( true );
		} );
	} );
} );
