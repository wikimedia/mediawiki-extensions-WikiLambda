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

	/**
	 * Make a completion context with the cursor at the end of the text. Its
	 * matchBefore() works like the one of CodeMirror.
	 *
	 * @param {string} text Text before the cursor
	 * @param {string} [node] Name of the syntax node at the cursor
	 * @return {Object} CodeMirror completion context
	 */
	function contextFor( text, node = 'VariableName' ) {
		return {
			node,
			matchBefore: ( regex ) => {
				// eslint-disable-next-line security/detect-non-literal-regexp -- The regex comes from the component.
				const from = text.search( new RegExp( `(?:${ regex.source })$`, regex.flags ) );
				return from < 0 ? null : { from, to: text.length, text: text.slice( from ) };
			}
		};
	}

	beforeEach( () => {
		languageFacet = { facet: 'language' };
		languageData = { of: jest.fn( ( value ) => value ) };
		lib = {
			language: languageFacet,
			ifNotIn: jest.fn( ( nodes, source ) => ( context ) => (
				nodes.includes( context.node ) ? null : source( context )
			) ),
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
			const { autocomplete } = languageData.of.mock.calls[ 0 ][ 0 ];

			expect( codeMirror.applyLinter ).toHaveBeenCalled();
			expect( autocomplete( contextFor( '<e' ) ) ).toBeNull();
		} );
	} );

	describe( 'JavaScript mode', () => {
		// The names the evaluators give the implementation code.
		const evaluatorGlobals = {
			Wikifunctions: 'readonly',
			ZObject: 'readonly',
			ZReference: 'readonly',
			ZPair: 'readonly'
		};

		let worker;

		beforeEach( () => {
			worker = {
				onload: jest.fn( ( callback ) => callback() ),
				setConfig: jest.fn()
			};
			codeMirror.langExtension = { worker };
		} );

		it( 'ignores only the unused implementation function in ESLint', async () => {
			const wrapper = await renderCodeMirrorEditor( {
				mode: 'javascript',
				value: 'function Z41070( Z41070K1 ) {\n\treturn Z41070K1;\n}'
			} );

			wrapper.findComponent( CodeMirrorStub ).vm.$emit( 'ready', codeMirror );

			expect( worker.setConfig ).toHaveBeenCalledWith( {
				globals: evaluatorGlobals,
				rules: {
					'no-unused-vars': [ 1, { varsIgnorePattern: '^Z41070$' } ]
				}
			} );
			expect( codeMirror.applyLinter ).not.toHaveBeenCalled();
		} );

		it( 'updates the rules when the user renames the function', async () => {
			const wrapper = await renderCodeMirrorEditor( {
				mode: 'javascript',
				value: 'function Z41070() {}'
			} );
			wrapper.findComponent( CodeMirrorStub ).vm.$emit( 'ready', codeMirror );

			await wrapper.setProps( { value: 'function Z41071() {}' } );

			expect( worker.setConfig ).toHaveBeenLastCalledWith( {
				globals: evaluatorGlobals,
				rules: {
					'no-unused-vars': [ 1, { varsIgnorePattern: '^Z41071$' } ]
				}
			} );
		} );

		it( 'keeps the default rules if there is no implementation function', async () => {
			const wrapper = await renderCodeMirrorEditor( {
				mode: 'javascript',
				value: '\tfunction Z41070() {}\nconst x = 1;'
			} );

			wrapper.findComponent( CodeMirrorStub ).vm.$emit( 'ready', codeMirror );

			expect( worker.setConfig ).toHaveBeenCalledWith( { globals: evaluatorGlobals, rules: {} } );
		} );

		it( 'suggests the Wikifunctions methods with their parameters', async () => {
			const wrapper = await renderCodeMirrorEditor( { mode: 'javascript' } );

			wrapper.findComponent( CodeMirrorStub ).vm.$emit( 'ready', codeMirror );
			const { autocomplete } = languageData.of.mock.calls[ 0 ][ 0 ];
			const result = autocomplete( contextFor( 'return Wikifunctions.' ) );

			expect( result.from ).toBe( 21 );
			expect( result.options.map( ( { label, template, detail } ) => [ label, template, detail ] ) )
				.toEqual( [
					[ 'Call', "Call( '${zid}', ${args} )${}", '(zid, ...args)' ],
					[ 'Error', "Error( '${errorType}', [ ${errorArgs} ] )${}", '(errorType, errorArgs)' ],
					[ 'Debug', 'Debug( ${message} )${}', '(message)' ]
				] );
			result.options.forEach( ( option ) => {
				expect( option.type ).toBe( 'method' );
				expect( option.boost ).toBe( 99 );
			} );
		} );

		it( 'replaces only the method name after "Wikifunctions."', async () => {
			const wrapper = await renderCodeMirrorEditor( { mode: 'javascript' } );

			wrapper.findComponent( CodeMirrorStub ).vm.$emit( 'ready', codeMirror );
			const { autocomplete } = languageData.of.mock.calls[ 0 ][ 0 ];

			expect( autocomplete( contextFor( 'x = Wikifunctions.De' ) ).from ).toBe( 18 );
		} );

		it( 'suggests nothing if the text before the cursor is not "Wikifunctions."', async () => {
			const wrapper = await renderCodeMirrorEditor( { mode: 'javascript' } );

			wrapper.findComponent( CodeMirrorStub ).vm.$emit( 'ready', codeMirror );
			const { autocomplete } = languageData.of.mock.calls[ 0 ][ 0 ];

			expect( autocomplete( contextFor( 'Wikifunctions' ) ) ).toBeNull();
			expect( autocomplete( contextFor( 'myWikifunctions.' ) ) ).toBeNull();
			expect( autocomplete( contextFor( 'Wikifunctions.Call( ' ) ) ).toBeNull();
		} );

		it( 'shows the description and a documentation link for each method', async () => {
			const wrapper = await renderCodeMirrorEditor( { mode: 'javascript' } );

			wrapper.findComponent( CodeMirrorStub ).vm.$emit( 'ready', codeMirror );
			const { autocomplete } = languageData.of.mock.calls[ 0 ][ 0 ];
			const infos = autocomplete( contextFor( 'Wikifunctions.' ) ).options
				.map( ( option ) => option.info() );

			expect( infos.map( ( info ) => info.textContent ) ).toEqual( [
				'Calls a function and returns its result. Code can call only some built-in functions, for example the functions that fetch Wikidata items. How to create implementations?',
				'Stops the function with an error of the given type. Give the error arguments as a list of strings. How to create implementations?',
				'Adds a message to the debug log in the response metadata. How to create implementations?'
			] );
			const link = infos[ 0 ].querySelector( 'a' );
			expect( link.getAttribute( 'href' ) ).toBe(
				'//www.wikifunctions.org/wiki/Special:MyLanguage/Wikifunctions:How_to_create_implementations'
			);
			expect( link.target ).toBe( '_blank' );
			expect( link.rel ).toBe( 'noopener' );
		} );

		it( 'does not suggest the Wikifunctions methods in strings and comments', async () => {
			const wrapper = await renderCodeMirrorEditor( { mode: 'javascript' } );

			wrapper.findComponent( CodeMirrorStub ).vm.$emit( 'ready', codeMirror );
			const { autocomplete } = languageData.of.mock.calls[ 0 ][ 0 ];

			[ 'String', 'TemplateString', 'RegExp', 'LineComment', 'BlockComment' ].forEach( ( node ) => {
				expect( autocomplete( contextFor( 'Wikifunctions.', node ) ) ).toBeNull();
			} );
			expect( autocomplete( contextFor( 'Wikifunctions.', 'PropertyName' ) ).options ).toHaveLength( 3 );
		} );

		it( 'does not suggest anything in a disabled editor', async () => {
			const wrapper = await renderCodeMirrorEditor( { mode: 'javascript', disabled: true } );

			wrapper.findComponent( CodeMirrorStub ).vm.$emit( 'ready', codeMirror );
			const { autocomplete } = languageData.of.mock.calls[ 0 ][ 0 ];

			expect( autocomplete( contextFor( 'Wikifunctions.' ) ) ).toBeNull();
		} );

		it( 'suggests the Wikifunctions methods after the user selects JavaScript', async () => {
			// A new implementation starts disabled in the default mode. When the
			// user selects JavaScript, the editor becomes editable but CodeMirror
			// does not send 'ready' again.
			const wrapper = await renderCodeMirrorEditor( { mode: '', disabled: true } );
			wrapper.findComponent( CodeMirrorStub ).vm.$emit( 'ready', codeMirror );
			const { autocomplete } = languageData.of.mock.calls[ 0 ][ 0 ];

			await wrapper.setProps( { mode: 'javascript', disabled: false } );

			expect( autocomplete( contextFor( 'Wikifunctions.' ) ).options ).toHaveLength( 3 );
		} );
	} );

	describe( 'Python mode', () => {
		it( 'suggests the Wikifunctions methods in the Python style', async () => {
			const wrapper = await renderCodeMirrorEditor( { mode: 'python' } );

			wrapper.findComponent( CodeMirrorStub ).vm.$emit( 'ready', codeMirror );
			const { autocomplete } = languageData.of.mock.calls[ 0 ][ 0 ];
			const result = autocomplete( contextFor( 'return Wikifunctions.' ) );

			expect( codeMirror.applyLinter ).not.toHaveBeenCalled();
			expect( result.from ).toBe( 21 );
			expect( result.options.map( ( { label, template, detail } ) => [ label, template, detail ] ) )
				.toEqual( [
					[ 'Call', 'Call("${zid}", ${args})${}', '(zid, *args)' ],
					[ 'Error', 'Error("${error_type}", [${error_args}])${}', '(error_type, error_args)' ],
					[ 'Debug', 'Debug(${message})${}', '(message)' ]
				] );
		} );

		it( 'does not suggest the Wikifunctions methods in strings and comments', async () => {
			const wrapper = await renderCodeMirrorEditor( { mode: 'python' } );

			wrapper.findComponent( CodeMirrorStub ).vm.$emit( 'ready', codeMirror );
			const { autocomplete } = languageData.of.mock.calls[ 0 ][ 0 ];

			[ 'String', 'FormatString', 'Comment' ].forEach( ( node ) => {
				expect( autocomplete( contextFor( 'Wikifunctions.', node ) ) ).toBeNull();
			} );
			expect( autocomplete( contextFor( 'Wikifunctions.', 'PropertyName' ) ).options ).toHaveLength( 3 );
		} );

		it( 'does not suggest anything in a read-only editor', async () => {
			const wrapper = await renderCodeMirrorEditor( { mode: 'python', readOnly: true } );

			wrapper.findComponent( CodeMirrorStub ).vm.$emit( 'ready', codeMirror );
			const { autocomplete } = languageData.of.mock.calls[ 0 ][ 0 ];

			expect( autocomplete( contextFor( 'Wikifunctions.' ) ) ).toBeNull();
		} );
	} );

	it( 'adds no linter and no suggestions in JSON mode', async () => {
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
