/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { config, mount } = require( '@vue/test-utils' ),
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionMetadataDialog = require( '../../../../resources/ext.wikilambda.edit/components/widgets/FunctionMetadataDialog.vue' ),
	metadata = require( '../../fixtures/metadata.js' );

// Ignore all "teleport" behavior for the purpose of testing Dialog;
// see https://test-utils.vuejs.org/guide/advanced/teleport.html
config.global.stubs = {
	teleport: true
};

describe( 'FunctionMetadataDialog', () => {
	let getters;

	beforeEach( () => {
		getters = {
			getLabelData: createGettersWithFunctionsMock(),
			getLabel: () => ( zid ) => {
				const labels = {
					Z502: 'Not wellformed',
					Z526: 'Key value not wellformed'
				};
				return labels[ zid ];
			}
		};
		mw.internalWikiUrlencode = jest.fn( ( url ) => url );
		global.store.hotUpdate( { getters: getters } );
	} );

	it( 'renders without errors', () => {
		const wrapper = mount( FunctionMetadataDialog, {
			props: { open: true, metadata: metadata.metadataBasic }
		} );

		expect( wrapper.find( '.ext-wikilambda-metadata-dialog' ).exists() ).toBe( true );
	} );

	describe( 'with basic metadata', () => {
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
			const keys = content.findAll( '.ext-wikilambda-metadata-dialog-key' );
			expect( keys[ 0 ].text() ).toContain( 'Name: Untitled' );
			expect( keys[ 0 ].find( 'a' ).attributes().href ).toContain( 'Z902' );
			expect( keys[ 1 ].text() ).toContain( 'Id: Z902' );
			expect( keys[ 2 ].text() ).toContain( 'Type: Evaluated' );
		} );

		it( 'renders a named implementation section', () => {
			getters.getLabelData = createGettersWithFunctionsMock( { label: 'Javascript implementation for If' } );
			global.store.hotUpdate( { getters: getters } );
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
			const keys = content.findAll( '.ext-wikilambda-metadata-dialog-key' );
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
			expect( section.find( '.cdx-accordion__header__description' ).text() ).toBe( '80 ms' );

			// Check content
			const content = section.find( '.cdx-accordion__content' );
			const keys = content.findAll( '.ext-wikilambda-metadata-dialog-key' );
			expect( keys.length ).toBe( 2 );
			let subkeys;
			// Orchestrator key:
			expect( keys[ 0 ].find( '.ext-wikilambda-metadata-dialog-key-title' ).text() ).toContain( 'Orchestration' );
			subkeys = keys[ 0 ].findAll( 'li' );
			expect( subkeys[ 0 ].text() ).toContain( 'Duration: 70 ms' );
			expect( subkeys[ 1 ].text() ).toContain( 'Start time: 4 minutes ago' );
			expect( subkeys[ 2 ].text() ).toContain( 'End time: 4 minutes ago' );
			// Evaluation key:
			expect( keys[ 1 ].find( '.ext-wikilambda-metadata-dialog-key-title' ).text() ).toContain( 'Evaluation' );
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
			const keys = content.findAll( '.ext-wikilambda-metadata-dialog-key' );
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
			expect( section.find( '.cdx-accordion__header__description' ).text() ).toBe( '132 MiB' );

			// Check content
			const content = section.find( '.cdx-accordion__content' );
			const keys = content.findAll( '.ext-wikilambda-metadata-dialog-key' );
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
			const keys = content.findAll( '.ext-wikilambda-metadata-dialog-key' );
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
			const keys = content.findAll( '.ext-wikilambda-metadata-dialog-key' );
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
			const keys = content.findAll( '.ext-wikilambda-metadata-dialog-key' );
			expect( keys.length ).toBe( 1 );
			// Orchestrator key:
			expect( keys[ 0 ].find( '.ext-wikilambda-metadata-dialog-key-title' ).text() ).toContain( 'Orchestration' );
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
			const keys = content.findAll( '.ext-wikilambda-metadata-dialog-key' );
			expect( keys.length ).toBe( 4 );
			expect( keys[ 0 ].text() ).toContain( 'Error type: Not wellformed' );
			expect( keys[ 0 ].find( 'a' ).attributes().href ).toContain( 'Z502' );
			expect( keys[ 1 ].text() ).toContain( 'Validation error type: Key value not wellformed' );
			expect( keys[ 1 ].find( 'a' ).attributes().href ).toContain( 'Z526' );
			expect( keys[ 2 ].text() ).toContain( 'Expected result: ABC' );
			expect( keys[ 3 ].text() ).toContain( 'Actual result: CBA' );
		} );
	} );
} );
