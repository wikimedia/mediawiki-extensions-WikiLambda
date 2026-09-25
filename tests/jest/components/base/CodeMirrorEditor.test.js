/*!
 * WikiLambda unit test suite for the CodeMirrorEditor component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { h } = require( 'vue' );
const { mount, flushPromises } = require( '@vue/test-utils' );
const { customElementDefinitions } = require( '../../../../resources/ext.wikilambda.app/utils/htmlValidationUtils.js' );
const CodeMirrorEditor = require( '../../../../resources/ext.wikilambda.app/components/base/CodeMirrorEditor.vue' );

// Stands in for the Vue component of the CodeMirror extension.
const CodeMirrorStub = {
	name: 'code-mirror-editor-stub',
	props: {
		modelValue: { type: String, default: '' },
		mode: { type: String, default: '' },
		theme: { type: String, default: null },
		readOnly: { type: Boolean, default: false },
		disabled: { type: Boolean, default: false },
		rows: { type: Number, default: 0 },
		maxRows: { type: Number, default: 0 },
		compact: { type: Boolean, default: false }
	},
	emits: [ 'update:modelValue', 'ready' ],
	render() {
		return h( 'div', { class: 'cm-stub' } );
	}
};

describe( 'CodeMirrorEditor', () => {
	let languageFacet, languageData, lib, codeMirror;

	/**
	 * Mount the component and wait for the modules to load.
	 *
	 * @param {Object} props
	 * @return {Promise<Object>} The wrapper
	 */
	async function renderCodeMirrorEditor( props = {} ) {
		const wrapper = mount( CodeMirrorEditor, { props } );
		await flushPromises();
		return wrapper;
	}

	beforeEach( () => {
		languageFacet = { facet: 'language' };
		languageData = { of: jest.fn( ( value ) => value ) };
		lib = {
			language: languageFacet,
			snippetCompletion: jest.fn( ( template, options ) => ( { template, ...options } ) )
		};
		codeMirror = {
			applyLinter: jest.fn(),
			applyExtension: jest.fn(),
			view: {
				state: {
					facet: jest.fn( ( facet ) => ( facet === languageFacet ? { data: languageData } : null ) )
				}
			}
		};

		mw.loader.using.mockResolvedValue(
			( module ) => ( module === 'ext.CodeMirror.lib' ? lib : CodeMirrorStub )
		);
	} );

	afterEach( () => {
		mw.loader.using.mockResolvedValue( jest.fn() );
		mw.log.error.mockClear();
	} );

	it( 'asks for the CodeMirror modules', async () => {
		await renderCodeMirrorEditor();

		expect( mw.loader.using ).toHaveBeenCalledWith( [
			'ext.CodeMirror.VueComponent',
			'ext.CodeMirror.lib'
		] );
	} );

	it( 'sets the properties of the editor', async () => {
		const wrapper = await renderCodeMirrorEditor( {
			value: 'pepsi cola',
			mode: 'python'
		} );

		expect( wrapper.findComponent( CodeMirrorStub ).props() ).toEqual( {
			modelValue: 'pepsi cola',
			mode: 'python',
			theme: 'default',
			readOnly: false,
			disabled: false,
			rows: 5,
			maxRows: 20,
			compact: true
		} );
	} );

	it( 'uses the theme prop in place of the default theme', async () => {
		const wrapper = await renderCodeMirrorEditor( { theme: 'monokai' } );

		expect( wrapper.findComponent( CodeMirrorStub ).props( 'theme' ) ).toBe( 'monokai' );
	} );

	it( 'uses JavaScript until the user selects a programming language', async () => {
		const wrapper = await renderCodeMirrorEditor( { mode: '' } );

		expect( wrapper.findComponent( CodeMirrorStub ).props( 'mode' ) ).toBe( 'javascript' );
	} );

	it( 'passes on readOnly and disabled', async () => {
		const wrapper = await renderCodeMirrorEditor( { readOnly: true, disabled: true } );
		const editor = wrapper.findComponent( CodeMirrorStub );

		expect( editor.props( 'readOnly' ) ).toBe( true );
		expect( editor.props( 'disabled' ) ).toBe( true );
		expect( wrapper.classes() ).toContain( 'ext-wikilambda-app-code-editor--disabled' );
	} );

	it( 'emits change when the contents change', async () => {
		const wrapper = await renderCodeMirrorEditor( { value: '' } );

		wrapper.findComponent( CodeMirrorStub ).vm.$emit( 'update:modelValue', 'fanta' );

		expect( wrapper.emitted( 'change' ) ).toEqual( [ [ 'fanta' ] ] );
	} );

	describe( 'HTML mode', () => {
		it( 'adds the linter and the suggestions', async () => {
			const wrapper = await renderCodeMirrorEditor( { mode: 'html' } );

			wrapper.findComponent( CodeMirrorStub ).vm.$emit( 'ready', codeMirror );

			expect( codeMirror.applyLinter ).toHaveBeenCalledWith( expect.any( Function ) );
			expect( languageData.of ).toHaveBeenCalledWith( {
				autocomplete: expect.any( Function )
			} );
			expect( codeMirror.applyExtension ).toHaveBeenCalled();
		} );

		it( 'reports every HTML problem as a diagnostic', async () => {
			const wrapper = await renderCodeMirrorEditor( { mode: 'html' } );

			wrapper.findComponent( CodeMirrorStub ).vm.$emit( 'ready', codeMirror );
			const lint = codeMirror.applyLinter.mock.calls[ 0 ][ 0 ];

			expect( lint( '<p>ok</p>' ) ).toEqual( [] );
			expect( lint( '<script>bad</script>' ) ).toEqual( [
				{
					from: 0,
					to: 8,
					severity: 'error',
					message: 'Usage of <script> tags is not allowed.'
				},
				{
					from: 11,
					to: 20,
					severity: 'error',
					message: 'Usage of <script> tags is not allowed.'
				}
			] );
		} );

		it( 'suggests the custom element after an opening angle bracket', async () => {
			const wrapper = await renderCodeMirrorEditor( { mode: 'html' } );

			wrapper.findComponent( CodeMirrorStub ).vm.$emit( 'ready', codeMirror );
			const { autocomplete } = languageData.of.mock.calls[ 0 ][ 0 ];

			expect( autocomplete( { matchBefore: () => null } ) ).toBeNull();

			const result = autocomplete( { matchBefore: () => ( { from: 4, to: 6, text: '<e' } ) } );
			expect( result.from ).toBe( 5 );
			expect( result.options ).toHaveLength( 1 );
			expect( lib.snippetCompletion ).toHaveBeenCalledWith(
				'ext-wikilambda-image mid="${}" size="thumb" />',
				expect.objectContaining( {
					label: 'ext-wikilambda-image',
					detail: customElementDefinitions.get( 'ext-wikilambda-image' ).detail,
					info: customElementDefinitions.get( 'ext-wikilambda-image' ).description
				} )
			);
		} );

		it( 'does not suggest anything in a read-only editor', async () => {
			const wrapper = await renderCodeMirrorEditor( { mode: 'html', readOnly: true } );

			wrapper.findComponent( CodeMirrorStub ).vm.$emit( 'ready', codeMirror );

			expect( codeMirror.applyLinter ).toHaveBeenCalled();
			expect( codeMirror.applyExtension ).not.toHaveBeenCalled();
		} );
	} );

	it( 'adds no linter in a mode other than HTML', async () => {
		const wrapper = await renderCodeMirrorEditor( { mode: 'json' } );

		wrapper.findComponent( CodeMirrorStub ).vm.$emit( 'ready', codeMirror );

		expect( codeMirror.applyLinter ).not.toHaveBeenCalled();
		expect( codeMirror.applyExtension ).not.toHaveBeenCalled();
	} );

	it( 'shows a plain textarea if the modules do not load', async () => {
		mw.loader.using.mockRejectedValue( new Error( 'no such module' ) );

		const wrapper = await renderCodeMirrorEditor( { value: 'pepsi cola' } );

		expect( wrapper.findComponent( CodeMirrorStub ).exists() ).toBe( false );
		expect( wrapper.find( '[data-testid="plain-code-editor"]' ).element.value )
			.toBe( 'pepsi cola' );
		expect( mw.log.error ).toHaveBeenCalled();
	} );
} );
