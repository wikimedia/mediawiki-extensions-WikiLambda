/*!
 * WikiLambda unit test suite for the function-metadata-dialog component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { config, mount } = require( '@vue/test-utils' );
const createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock;
const createLabelDataMock = require( '../../../helpers/getterHelpers.js' ).createLabelDataMock;
const metadata = require( '../../../fixtures/metadata.js' );
const FunctionMetadataDialog = require( '../../../../../resources/ext.wikilambda.app/components/widgets/function-evaluator/FunctionMetadataDialog.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

// Ignore all "teleport" behavior for the purpose of testing Dialog;
// see https://test-utils.vuejs.org/guide/advanced/teleport.html
config.global.stubs = {
	teleport: true
};

describe( 'FunctionMetadataDialog', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getFunctionZidOfImplementation = createGettersWithFunctionsMock( 'Z801' );
		store.getUserLangCode = 'en';
		store.getLabelData = createLabelDataMock( {
			Z502: 'Not wellformed',
			Z526: 'Key value not wellformed',
			Z801: 'Echo',
			Z802: 'If',
			Z41: 'true'
		} );
		mw.internalWikiUrlencode = jest.fn( ( url ) => url );
	} );

	it( 'renders without errors', () => {
		const wrapper = mount( FunctionMetadataDialog, {
			props: { open: true, metadata: metadata.metadataBasic }
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
			expect( keys[ 0 ].text() ).toContain( 'Name: Untitled' );
			expect( keys[ 0 ].find( 'a' ).attributes().href ).toContain( 'Z902' );
			expect( keys[ 1 ].text() ).toContain( 'Id: Z902' );
			expect( keys[ 2 ].text() ).toContain( 'Type: Evaluated' );
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
			expect( keys[ 0 ].text() ).toContain( 'Name: Javascript implementation for If' );
			expect( keys[ 0 ].find( 'a' ).attributes().href ).toContain( 'Z902' );
			expect( keys[ 1 ].text() ).toContain( 'Id: Z902' );
			expect( keys[ 2 ].text() ).toContain( 'Type: Evaluated' );
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
			expect( keys[ 0 ].text() ).toContain( 'Orchestration: 85.790 ms' );
			expect( keys[ 1 ].text() ).toContain( 'Evaluation: 45.110 ms' );
			expect( keys[ 2 ].text() ).toContain( 'Execution: <50 μs' );
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
			expect( keys[ 0 ].text() ).toContain( 'Orchestration: 115.43 MiB' );
			expect( keys[ 1 ].text() ).toContain( 'Evaluation: 15.57 MiB' );
			expect( keys[ 2 ].text() ).toContain( 'Execution: 1 MiB' );
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
			expect( keys[ 0 ].text() ).toContain( 'Orchestration: function-orchestrator' );
			expect( keys[ 1 ].text() ).toContain( 'Evaluation: function-evaluator-javascript' );
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
			expect( keys[ 0 ].text() ).toContain( 'Version: QuickJS v0.5.0-alpha' );
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
			expect( section.find( '.cdx-accordion__header__description' ).text() ).toBe( 'Not wellformed' );

			// Check content
			const content = section.find( '.cdx-accordion__content' );
			const keys = content.findAll( '.ext-wikilambda-app-function-metadata-dialog__key' );
			expect( keys.length ).toBe( 4 );
			expect( keys[ 0 ].text() ).toContain( 'Error type: Not wellformed' );
			expect( keys[ 0 ].find( 'a' ).attributes().href ).toContain( 'Z502' );
			expect( keys[ 1 ].text() ).toContain( 'Validation error type: Key value not wellformed' );
			expect( keys[ 1 ].find( 'a' ).attributes().href ).toContain( 'Z526' );
			expect( keys[ 2 ].text() ).toContain( 'Expected result: ABC' );
			expect( keys[ 3 ].text() ).toContain( 'Actual result: CBA' );
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
