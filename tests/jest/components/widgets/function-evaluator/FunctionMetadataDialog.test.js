/*!
 * WikiLambda unit test suite for the function-metadata-dialog component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mount } = require( '@vue/test-utils' );
const createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock;
const createLabelDataMock = require( '../../../helpers/getterHelpers.js' ).createLabelDataMock;
const metadata = require( '../../../fixtures/metadata.js' );
const { dialogGlobalStubs } = require( '../../../helpers/dialogTestHelpers.js' );
const FunctionMetadataDialog = require( '../../../../../resources/ext.wikilambda.app/components/widgets/function-evaluator/FunctionMetadataDialog.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'dialog', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getFunctionZidOfImplementation = createGettersWithFunctionsMock( 'Z801' );
		store.getUserLangCode = 'en';
		store.getLabelData = createLabelDataMock( {
			Z502: 'Not wellformed',
			Z502K1: 'subtype',
			Z523: 'Missing Z1K1',
			Z526: 'Key value not wellformed',
			Z801: 'Echo',
			Z802: 'If',
			Z41: 'true'
		} );
		mw.internalWikiUrlencode = jest.fn( ( url ) => url );
	} );

	it( 'renders without errors', () => {
		const wrapper = mount( FunctionMetadataDialog, {
			props: { open: true, metadata: metadata.metadataBasic },
			global: {
				stubs: dialogGlobalStubs
			}
		} );

		expect( wrapper.find( '.ext-wikilambda-app-function-metadata-dialog' ).exists() ).toBe( true );
	} );

	describe( 'with basic metadata', () => {
		it( 'does not render function call selector correctly', () => {
			const wrapper = mount( FunctionMetadataDialog, {
				props: { open: true, metadata: metadata.metadataBasic }
			} );

			const selector = wrapper.findComponent( { name: 'cdx-select' } );
			expect( selector.exists() ).toBe( false );
		} );

		it( 'renders an untitled implementation section', () => {
			const wrapper = mount( FunctionMetadataDialog, {
				props: { open: true, metadata: metadata.metadataBasic }
			} );

			const sections = wrapper.findAllComponents( { name: 'cdx-accordion' } );
			const section = sections[ 0 ];

			// Check header
			expect( section.find( '.cdx-accordion__header__title' ).text() ).toBe( 'Implementation' );
			expect( section.find( '.cdx-accordion__header__description' ).text() ).toBe( 'Untitled' );

			// Check content
			const content = section.find( '.cdx-accordion__content' );
			const keys = content.findAll( '.ext-wikilambda-app-function-metadata-dialog__key' );

			expect( keys[ 0 ].text() ).toContain( 'Name:' );
			expect( keys[ 0 ].find( 'a' ).text() ).toBe( 'Untitled' );
			expect( keys[ 0 ].find( 'a' ).attributes().href ).toContain( 'Z902' );

			expect( keys[ 1 ].text() ).toContain( 'Id:' );
			expect( keys[ 1 ].text() ).toContain( 'Z902' );

			expect( keys[ 2 ].text() ).toContain( 'Type:' );
			expect( keys[ 2 ].text() ).toContain( 'Evaluated' );
		} );

		it( 'renders a named implementation section', () => {
			store.getLabelData = createLabelDataMock( { Z902: 'Javascript implementation for If' } );
			const wrapper = mount( FunctionMetadataDialog, {
				props: { open: true, metadata: metadata.metadataBasic }
			} );
			const sections = wrapper.findAllComponents( { name: 'cdx-accordion' } );
			const section = sections[ 0 ];

			// Check header
			expect( section.find( '.cdx-accordion__header__title' ).text() ).toBe( 'Implementation' );
			expect( section.find( '.cdx-accordion__header__description' ).text() ).toBe( 'Javascript implementation for If' );

			// Check content
			const content = section.find( '.cdx-accordion__content' );
			const keys = content.findAll( '.ext-wikilambda-app-function-metadata-dialog__key' );

			expect( keys[ 0 ].text() ).toContain( 'Name:' );
			expect( keys[ 0 ].find( 'a' ).text() ).toBe( 'Javascript implementation for If' );
			expect( keys[ 0 ].find( 'a' ).attributes().href ).toContain( 'Z902' );

			expect( keys[ 1 ].text() ).toContain( 'Id:' );
			expect( keys[ 1 ].text() ).toContain( 'Z902' );

			expect( keys[ 2 ].text() ).toContain( 'Type:' );
			expect( keys[ 2 ].text() ).toContain( 'Evaluated' );
		} );

		it( 'renders the duration section', () => {
			// Set fake timer
			jest.useFakeTimers().setSystemTime( new Date( '2024-02-16T12:30:00.000Z' ) );
			const wrapper = mount( FunctionMetadataDialog, {
				props: { open: true, metadata: metadata.metadataBasic }
			} );
			const sections = wrapper.findAllComponents( { name: 'cdx-accordion' } );
			const section = sections[ 1 ];

			// Check header
			expect( section.find( '.cdx-accordion__header__title' ).text() ).toBe( 'Duration' );
			expect( section.find( '.cdx-accordion__header__description' ).text() ).toBe( '70 ms' );

			// Check content
			const content = section.find( '.cdx-accordion__content' );
			const keys = content.findAll( '.ext-wikilambda-app-function-metadata-dialog__key' );
			expect( keys.length ).toBe( 2 );
			let subkeys;
			// Orchestrator key:
			expect( keys[ 0 ].find( '.ext-wikilambda-app-function-metadata-dialog__key-title' ).text() ).toContain( 'Orchestration' );
			subkeys = keys[ 0 ].findAll( 'li' );
			expect( subkeys[ 0 ].text() ).toContain( 'Duration: 70 ms' );
			expect( subkeys[ 1 ].text() ).toContain( 'Start time: 4 minutes ago' );
			expect( subkeys[ 2 ].text() ).toContain( 'End time: 4 minutes ago' );
			// Evaluation key:
			expect( keys[ 1 ].find( '.ext-wikilambda-app-function-metadata-dialog__key-title' ).text() ).toContain( 'Evaluation' );
			subkeys = keys[ 1 ].findAll( 'li' );
			expect( subkeys[ 0 ].text() ).toContain( 'Duration: 10 ms' );
			expect( subkeys[ 1 ].text() ).toContain( 'Start time: 4 minutes ago' );
			expect( subkeys[ 2 ].text() ).toContain( 'End time: 4 minutes ago' );
		} );

		it( 'renders the CPU usage section', () => {
			const wrapper = mount( FunctionMetadataDialog, {
				props: { open: true, metadata: metadata.metadataBasic }
			} );
			const sections = wrapper.findAllComponents( { name: 'cdx-accordion' } );
			const section = sections[ 2 ];

			// Check header
			expect( section.find( '.cdx-accordion__header__title' ).text() ).toBe( 'CPU usage' );
			expect( section.find( '.cdx-accordion__header__description' ).text() ).toBe( '130.9 ms' );

			// Check content
			const content = section.find( '.cdx-accordion__content' );
			const keys = content.findAll( '.ext-wikilambda-app-function-metadata-dialog__key' );
			expect( keys.length ).toBe( 3 );
			expect( keys[ 0 ].text() ).toContain( 'Orchestration:' );
			expect( keys[ 0 ].text() ).toContain( '85.790 ms' );

			expect( keys[ 1 ].text() ).toContain( 'Evaluation:' );
			expect( keys[ 1 ].text() ).toContain( '45.110 ms' );

			expect( keys[ 2 ].text() ).toContain( 'Execution:' );
			expect( keys[ 2 ].text() ).toContain( '<50 μs' );
		} );

		it( 'renders the memory usage section', () => {
			const wrapper = mount( FunctionMetadataDialog, {
				props: { open: true, metadata: metadata.metadataBasic }
			} );
			const sections = wrapper.findAllComponents( { name: 'cdx-accordion' } );
			const section = sections[ 3 ];

			// Check header
			expect( section.find( '.cdx-accordion__header__title' ).text() ).toBe( 'Memory usage' );
			expect( section.find( '.cdx-accordion__header__description' ).text() ).toBe( '132.0 MiB' );

			// Check content
			const content = section.find( '.cdx-accordion__content' );
			const keys = content.findAll( '.ext-wikilambda-app-function-metadata-dialog__key' );
			expect( keys.length ).toBe( 3 );
			expect( keys[ 0 ].text() ).toContain( 'Orchestration:' );
			expect( keys[ 0 ].text() ).toContain( '115.43 MiB' );

			expect( keys[ 1 ].text() ).toContain( 'Evaluation:' );
			expect( keys[ 1 ].text() ).toContain( '15.57 MiB' );

			expect( keys[ 2 ].text() ).toContain( 'Execution:' );
			expect( keys[ 2 ].text() ).toContain( '1 MiB' );
		} );

		it( 'renders the server section', () => {
			const wrapper = mount( FunctionMetadataDialog, {
				props: { open: true, metadata: metadata.metadataBasic }
			} );
			const sections = wrapper.findAllComponents( { name: 'cdx-accordion' } );
			const section = sections[ 4 ];

			// Check header
			expect( section.find( '.cdx-accordion__header__title' ).text() ).toBe( 'Server' );

			// Check content
			const content = section.find( '.cdx-accordion__content' );
			const keys = content.findAll( '.ext-wikilambda-app-function-metadata-dialog__key' );
			expect( keys.length ).toBe( 2 );
			expect( keys[ 0 ].text() ).toContain( 'Orchestration:' );
			expect( keys[ 0 ].text() ).toContain( 'function-orchestrator' );

			expect( keys[ 1 ].text() ).toContain( 'Evaluation:' );
			expect( keys[ 1 ].text() ).toContain( 'function-evaluator-javascript' );
		} );

		it( 'renders the programming language section', () => {
			const wrapper = mount( FunctionMetadataDialog, {
				props: { open: true, metadata: metadata.metadataBasic }
			} );
			const sections = wrapper.findAllComponents( { name: 'cdx-accordion' } );
			const section = sections[ 5 ];

			// Check header
			expect( section.find( '.cdx-accordion__header__title' ).text() ).toBe( 'Programming language' );

			// Check content
			const content = section.find( '.cdx-accordion__content' );
			const keys = content.findAll( '.ext-wikilambda-app-function-metadata-dialog__key' );
			expect( keys.length ).toBe( 1 );
			expect( keys[ 0 ].text() ).toContain( 'Version:' );
			expect( keys[ 0 ].text() ).toContain( 'QuickJS v0.5.0-alpha' );
		} );
	} );

	describe( 'with incomplete metadata', () => {
		it( 'only renders sections with available keys', () => {
			const wrapper = mount( FunctionMetadataDialog, {
				props: { open: true, metadata: metadata.metadataEmpty }
			} );
			const sections = wrapper.findAllComponents( { name: 'cdx-accordion' } );
			expect( sections.length ).toBe( 1 );
			const section = sections[ 0 ];

			// Check header
			expect( section.find( '.cdx-accordion__header__title' ).text() ).toBe( 'Duration' );
			expect( section.find( '.cdx-accordion__header__description' ).text() ).toBe( '70 ms' );

			// Check content
			const content = section.find( '.cdx-accordion__content' );
			const keys = content.findAll( '.ext-wikilambda-app-function-metadata-dialog__key' );
			expect( keys.length ).toBe( 1 );
			// Orchestrator key:
			expect( keys[ 0 ].find( '.ext-wikilambda-app-function-metadata-dialog__key-title' ).text() ).toContain( 'Orchestration' );
			const subkeys = keys[ 0 ].findAll( 'li' );
			expect( subkeys.length ).toBe( 1 );
			expect( subkeys[ 0 ].text() ).toContain( 'Duration: 70 ms' );
		} );
	} );

	describe( 'with error metadata', () => {
		it( 'renders the error section', () => {
			const wrapper = mount( FunctionMetadataDialog, {
				props: { open: true, metadata: metadata.metadataErrors }
			} );
			const sections = wrapper.findAllComponents( { name: 'cdx-accordion' } );
			expect( sections.length ).toBe( 1 );
			const section = sections[ 0 ];

			// Check header
			expect( section.find( '.cdx-accordion__header__title' ).text() ).toBe( '{{PLURAL:$1|Error|Errors}}' );
			expect( section.find( '.cdx-accordion__header__description' ).text() ).toBe( 'Not wellformed (subtype: "Z523")' );

			// Check content
			const content = section.find( '.cdx-accordion__content' );
			const keys = content.findAll( '.ext-wikilambda-app-function-metadata-dialog__key' );
			expect( keys.length ).toBe( 6 );

			// Error type (key=errors):
			expect( keys[ 0 ].text() ).toContain( 'Error type:' );
			expect( keys[ 0 ].find( 'a' ).text() ).toBe( 'Not wellformed' );
			expect( keys[ 0 ].find( 'a' ).attributes().href ).toContain( 'Z502' );
			// Error arguments (key=errors):
			expect( keys[ 1 ].text() ).toContain( 'subtype: "Z523"' );
			// Error stack trace (key=errors):
			expect( keys[ 2 ].text() ).toContain( 'Missing Z1K1' );
			expect( keys[ 2 ].find( 'a' ).attributes().href ).toContain( 'Z523' );

			// Validation error (key=validationErrors):
			expect( keys[ 3 ].text() ).toContain( 'Validation error type:' );
			expect( keys[ 3 ].find( 'a' ).text() ).toBe( 'Key value not wellformed' );
			expect( keys[ 3 ].find( 'a' ).attributes().href ).toContain( 'Z526' );

			// Expected result (key=expectedTestResult):
			expect( keys[ 4 ].text() ).toContain( 'Expected result:' );
			expect( keys[ 4 ].text() ).toContain( 'ABC' );
			// Actual result (key=actualTestResult):
			expect( keys[ 5 ].text() ).toContain( 'Actual result:' );
			expect( keys[ 5 ].text() ).toContain( 'CBA' );

			// Check Wikifunctions.Debug message
			const message = wrapper.findAllComponents( { name: 'cdx-message' } );
			expect( message[ 0 ].text() ).toContain( 'Something not working? Try Wikifunctions.Debug to trace your code.' );
		} );

		it( 'renders the expected/actual values even if the error data is missing', () => {
			const wrapper = mount( FunctionMetadataDialog, {
				props: { open: true, metadata: metadata.metadataDifferButNoErrors }
			} );
			const sections = wrapper.findAllComponents( { name: 'cdx-accordion' } );
			expect( sections.length ).toBe( 1 );
			const section = sections[ 0 ];

			// Check header
			expect( section.find( '.cdx-accordion__header__title' ).text() ).toBe( '{{PLURAL:$1|Error|Errors}}' );
			expect( section.find( '.cdx-accordion__header__description' ).text() ).toBe( 'None' );

			// Check content
			const content = section.find( '.cdx-accordion__content' );
			const keys = content.findAll( '.ext-wikilambda-app-function-metadata-dialog__key' );
			expect( keys.length ).toBe( 2 );

			// Expected result (key=expectedTestResult):
			expect( keys[ 0 ].text() ).toContain( 'Expected result:' );
			expect( keys[ 0 ].text() ).toContain( 'ABC' );

			// Actual result (key=actualTestResult):
			expect( keys[ 1 ].text() ).toContain( 'Actual result:' );
			expect( keys[ 1 ].text() ).toContain( 'CBA' );

			// No error, so no Wikifunctions.Debug message should be shown(?)
			const message = wrapper.findAllComponents( { name: 'cdx-message' } );
			expect( message.length ).toBe( 0 );
			// expect( message[ 0 ].text() ).toContain( 'Something not working? Try Wikifunctions.Debug to trace your code.' );
		} );
	} );

	describe( 'with nested metadata', () => {
		it( 'renders function call selector correctly', () => {
			const wrapper = mount( FunctionMetadataDialog, {
				props: { open: true, metadata: metadata.metadataNested }
			} );

			// Selector is rendered
			const selector = wrapper.findComponent( { name: 'cdx-select' } );
			expect( selector.exists() ).toBe( true );

			// Displays all nested metadata sets
			const menuItems = selector.vm.menuItems;
			expect( menuItems.length ).toBe( 3 );

			// Check labels from zObjectKey
			expect( menuItems[ 0 ].label ).toBe( 'If (Echo (true), Echo ("is true"), "is false")' );
			expect( menuItems[ 1 ].label ).toBe( 'Echo (true)' );
			// Check label from implementationId
			expect( menuItems[ 2 ].label ).toBe( 'Echo' );
			// Check values calculated from index path
			expect( menuItems[ 0 ].value ).toBe( '0' );
			expect( menuItems[ 1 ].value ).toBe( '0-0' );
			expect( menuItems[ 2 ].value ).toBe( '0-1' );
			// Check state
			expect( menuItems[ 0 ].state ).toBe( 'pass' );
			expect( menuItems[ 1 ].state ).toBe( 'pass' );
			expect( menuItems[ 2 ].state ).toBe( 'fail' );
			// Check style
			expect( menuItems[ 0 ].style ).toBe( '--menuItemLevel: 1;' );
			expect( menuItems[ 1 ].style ).toBe( '--menuItemLevel: 2;' );
			expect( menuItems[ 2 ].style ).toBe( '--menuItemLevel: 2;' );
		} );

		it( 'selects a child function call', async () => {
			const wrapper = mount( FunctionMetadataDialog, {
				props: { open: true, metadata: metadata.metadataNested }
			} );
			expect( wrapper.vm.selectedMetadataPath ).toBe( '0' );

			let sections = wrapper.findAllComponents( { name: 'cdx-accordion' } );
			expect( sections.length ).toBe( 2 );

			const selector = wrapper.findComponent( { name: 'cdx-select' } );
			expect( selector.html() ).toContain( 'ext-wikilambda-app-function-metadata-dialog__selected--pass' );
			expect( selector.html() ).not.toContain( 'ext-wikilambda-app-function-metadata-dialog__selected--fail' );

			// Select second child
			const selectedId = '0-1';
			selector.vm.$emit( 'update:selected', selectedId );
			await wrapper.vm.$nextTick();

			// Selector class has changed from pass to fail
			expect( selector.html() ).toContain( 'ext-wikilambda-app-function-metadata-dialog__selected--fail' );
			expect( selector.html() ).not.toContain( 'ext-wikilambda-app-function-metadata-dialog__selected--pass' );

			// Metadata body is now reflecting a different metadata set
			sections = wrapper.findAllComponents( { name: 'cdx-accordion' } );
			expect( sections.length ).toBe( 3 );
		} );
	} );
} );
