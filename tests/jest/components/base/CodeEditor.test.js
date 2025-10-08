/*!
 * WikiLambda unit test suite for the default CodeEditor component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' );
const { shallowMount } = require( '@vue/test-utils' );
const CodeEditor = require( '../../../../resources/ext.wikilambda.app/components/base/CodeEditor.vue' );

describe( 'CodeEditor', () => {
	let mockSetReadOnly,
		mockSetMode,
		mockSetUseWrapMode,
		mockSetTheme,
		mockSetOptions,
		mockSetOption,
		mockSetListener,
		mockSetValue,
		mockSession;

	/**
	 * Helper function to render CodeEditor component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderCodeEditor( props = {}, options = {} ) {
		return shallowMount( CodeEditor, { props, ...options } );
	}

	beforeEach( () => {
		mw.config = {
			get: jest.fn( () => '/w/extensions' )
		};

		mockSetListener = jest.fn();
		mockSetReadOnly = jest.fn();
		mockSetMode = jest.fn();
		mockSetUseWrapMode = jest.fn();
		mockSetTheme = jest.fn();
		mockSetOptions = jest.fn();
		mockSetOption = jest.fn();
		mockSetValue = jest.fn();
		mockSession = jest.fn( () => ( {
			setMode: mockSetMode,
			setUseWrapMode: mockSetUseWrapMode,
			on: mockSetListener
		} ) );

		window.ace.edit = jest.fn( () => ( {
			setReadOnly: mockSetReadOnly,
			getSession: mockSession,
			setMode: mockSetMode,
			setTheme: mockSetTheme,
			setOptions: mockSetOptions,
			setOption: mockSetOption,
			setValue: mockSetValue,
			on: mockSetListener
		} ) );

		window.ace.config = {
			set: jest.fn()
		};
	} );

	it( 'initializes the code editor properties', () => {
		const wrapper = renderCodeEditor( {
			mode: 'python',
			theme: 'chrome',
			value: 'pepsi cola',
			readOnly: true
		} );

		expect( wrapper.find( 'div' ).exists() ).toBe( true );
		expect( mockSetUseWrapMode ).toHaveBeenCalledWith( true );
		expect( mockSetReadOnly ).toHaveBeenCalledWith( true );
		expect( mockSetMode ).toHaveBeenCalledWith( 'ace/mode/python' );
		expect( mockSetTheme ).toHaveBeenCalledWith( 'ace/theme/chrome' );
		expect( mockSetListener ).toHaveBeenCalledWith( 'change', expect.anything() );
		expect( mockSetOptions ).toHaveBeenCalledWith( {
			fontSize: 12, maxLines: 20, minLines: 5, showPrintMargin: false, useSoftTabs: false
		} );
		expect( window.ace.config.set ).toHaveBeenCalledWith(
			'basePath',
			'/w/extensions/WikiLambda/resources/lib/ace/src'
		);
		expect( window.ace.edit ).toHaveBeenCalledWith( expect.anything(), { value: 'pepsi cola' } );
	} );

	it( 'should set basePath with protocol if basePath starts with //', () => {
		mw.config.get.mockReturnValue( '//example.com/path' );

		const wrapper = renderCodeEditor( {
			mode: 'python',
			theme: 'chrome',
			value: 'pepsi cola',
			readOnly: true
		} );

		expect( wrapper.find( 'div' ).exists() ).toBe( true );
		expect( window.ace.config.set ).toHaveBeenCalledWith(
			'basePath',
			'http://example.com/path/WikiLambda/resources/lib/ace/src'
		);
	} );

	it( 'sets readOnly upon change', async () => {
		const wrapper = renderCodeEditor( {
			readOnly: true
		} );

		wrapper.setProps( { readOnly: false } );

		await waitFor( () => expect( mockSetReadOnly ).toHaveBeenCalledWith( false ) );
	} );

	it( 'sets mode upon change', async () => {
		const wrapper = renderCodeEditor( {
			mode: 'python'
		} );

		wrapper.setProps( { mode: 'ruby' } );
		await waitFor( () => expect( mockSetMode ).toHaveBeenCalledWith( 'ace/mode/python' ) );

		expect( mockSetOption ).toHaveBeenCalledWith( 'mode', 'ace/mode/ruby' );
	} );

	it( 'sets theme upon change', async () => {
		const wrapper = renderCodeEditor( {
			theme: 'chrome'
		} );

		wrapper.setProps( { theme: 'firefox' } );

		await waitFor( () => expect( mockSetTheme ).toHaveBeenCalledWith( 'ace/theme/firefox' ) );
	} );

	it( 'sets value upon change', async () => {
		const wrapper = renderCodeEditor( {
			value: 'fritz-kola'
		} );

		wrapper.setProps( { value: 'fanta' } );

		await waitFor( () => expect( mockSetValue ).toHaveBeenCalledWith( 'fanta', 1 ) );
	} );

	it( 'initializes editor in HTML mode with change listener', () => {
		const wrapper = renderCodeEditor( {
			mode: 'html',
			theme: 'chrome',
			value: '<div>test</div>',
			readOnly: false
		} );

		// Verify component exists
		expect( wrapper.find( 'div' ).exists() ).toBe( true );

		// Verify HTML mode was set
		expect( mockSetMode ).toHaveBeenCalledWith( 'ace/mode/html' );

		// Verify change listener was registered
		expect( mockSetListener ).toHaveBeenCalledWith( 'change', expect.anything() );
	} );

	describe( 'HTML validation annotations', () => {
		let mockSetAnnotations, mockGetAnnotations, mockGetValue, mockDoc, mockSessionWithAnnotations;

		beforeEach( () => {
			mockSetAnnotations = jest.fn();
			mockGetAnnotations = jest.fn( () => [] );
			mockGetValue = jest.fn();
			mockDoc = { getAllLines: jest.fn() };

			mockSessionWithAnnotations = {
				setMode: mockSetMode,
				setUseWrapMode: mockSetUseWrapMode,
				on: mockSetListener,
				getAnnotations: mockGetAnnotations,
				setAnnotations: mockSetAnnotations,
				doc: mockDoc
			};

			mockSession.mockReturnValue( mockSessionWithAnnotations );

			window.ace.edit = jest.fn( () => ( {
				setReadOnly: mockSetReadOnly,
				getSession: mockSession,
				setMode: mockSetMode,
				setTheme: mockSetTheme,
				setOptions: mockSetOptions,
				setOption: mockSetOption,
				setValue: mockSetValue,
				getValue: mockGetValue,
				on: mockSetListener,
				session: mockSessionWithAnnotations
			} ) );
		} );

		it( 'validates and flags disallowed HTML tags', () => {
			mockDoc.getAllLines.mockReturnValue( [
				'<script>alert(1)</script>',
				'<b>bold</b>',
				'<foo>bar</foo>'
			] );
			mockGetValue.mockReturnValue( '<script>alert(1)</script>' );

			renderCodeEditor( {
				mode: 'html',
				theme: 'chrome',
				value: '<script>alert(1)</script>',
				readOnly: false
			} );

			// Find and trigger the changeAnnotation handler
			const changeAnnotationHandler = mockSetListener.mock.calls.find(
				( call ) => call[ 0 ] === 'changeAnnotation'
			);
			expect( changeAnnotationHandler ).toBeDefined();
			changeAnnotationHandler[ 1 ]();

			// Verify setAnnotations was called with custom error annotations
			expect( mockSetAnnotations ).toHaveBeenCalled();
			const annotations = mockSetAnnotations.mock.calls[ 0 ][ 0 ];

			// Should flag <script> and <foo> but not <b>
			const scriptError = annotations.find( ( a ) => a.text && a.text.includes( '<script>' ) );
			const fooError = annotations.find( ( a ) => a.text && a.text.includes( '<foo>' ) );
			const bError = annotations.find( ( a ) => a.text && a.text.includes( '<b>' ) );

			expect( scriptError ).toBeDefined();
			expect( scriptError.type ).toBe( 'error' );
			expect( scriptError.code ).toBe( 'DISALLOWED_HTML' );

			expect( fooError ).toBeDefined();
			expect( fooError.type ).toBe( 'error' );

			expect( bError ).toBeUndefined();
		} );

		it( 'validates and flags event handler attributes', () => {
			mockDoc.getAllLines.mockReturnValue( [
				'<div onclick="alert(1)">Click me</div>',
				'<span onmouseover="foo()">Hover</span>',
				'<p>Safe</p>'
			] );
			mockGetValue.mockReturnValue( '<div onclick="alert(1)">Click me</div>' );

			renderCodeEditor( {
				mode: 'html',
				theme: 'chrome',
				value: '<div onclick="alert(1)">Click me</div>',
				readOnly: false
			} );

			// Find and trigger the changeAnnotation handler
			const changeAnnotationHandler = mockSetListener.mock.calls.find(
				( call ) => call[ 0 ] === 'changeAnnotation'
			);
			changeAnnotationHandler[ 1 ]();

			// Verify setAnnotations was called
			expect( mockSetAnnotations ).toHaveBeenCalled();
			const annotations = mockSetAnnotations.mock.calls[ 0 ][ 0 ];

			// Should flag onclick and onmouseover
			const onclickError = annotations.find( ( a ) => a.text && a.text.includes( 'onclick' ) );
			const onmouseoverError = annotations.find( ( a ) => a.text && a.text.includes( 'onmouseover' ) );

			expect( onclickError ).toBeDefined();
			expect( onclickError.type ).toBe( 'error' );
			expect( onclickError.code ).toBe( 'DISALLOWED_HTML' );

			expect( onmouseoverError ).toBeDefined();
			expect( onmouseoverError.type ).toBe( 'error' );
		} );

		it( 'validates and flags javascript: URLs in href and src attributes', () => {
			mockDoc.getAllLines.mockReturnValue( [
				'<a href="javascript:alert(1)">bad</a>',
				'<img src="javascript:evil()">',
				'<a href="https://example.com">good</a>'
			] );
			mockGetValue.mockReturnValue( '<a href="javascript:alert(1)">bad</a>' );

			renderCodeEditor( {
				mode: 'html',
				theme: 'chrome',
				value: '<a href="javascript:alert(1)">bad</a>',
				readOnly: false
			} );

			// Find and trigger the changeAnnotation handler
			const changeAnnotationHandler = mockSetListener.mock.calls.find(
				( call ) => call[ 0 ] === 'changeAnnotation'
			);
			changeAnnotationHandler[ 1 ]();

			// Verify setAnnotations was called
			expect( mockSetAnnotations ).toHaveBeenCalled();
			const annotations = mockSetAnnotations.mock.calls[ 0 ][ 0 ];

			// Should flag javascript: URLs
			const jsUrlErrors = annotations.filter( ( a ) => a.text && a.text.includes( 'JavaScript URLs are not allowed' )
			);

			expect( jsUrlErrors.length ).toBeGreaterThan( 0 );
			jsUrlErrors.forEach( ( error ) => {
				expect( error.type ).toBe( 'error' );
				expect( error.code ).toBe( 'DISALLOWED_HTML' );
			} );
		} );

		it( 'filters out doctype annotations from ACE editor', () => {
			mockDoc.getAllLines.mockReturnValue( [
				'<div>test</div>'
			] );
			mockGetValue.mockReturnValue( '<div>test</div>' );
			mockGetAnnotations.mockReturnValue( [
				{ row: 0, column: 0, text: 'Some warning', type: 'warning' },
				{ row: 1, column: 0, text: 'Doctype not allowed', type: 'error' }
			] );

			renderCodeEditor( {
				mode: 'html',
				theme: 'chrome',
				value: '<div>test</div>',
				readOnly: false
			} );

			// Find and trigger the changeAnnotation handler
			const changeAnnotationHandler = mockSetListener.mock.calls.find(
				( call ) => call[ 0 ] === 'changeAnnotation'
			);
			changeAnnotationHandler[ 1 ]();

			// Verify setAnnotations was called
			expect( mockSetAnnotations ).toHaveBeenCalled();
			const annotations = mockSetAnnotations.mock.calls[ 0 ][ 0 ];

			// Should not include doctype errors
			const doctypeError = annotations.find( ( a ) => a.text && /doctype/i.test( a.text ) );
			expect( doctypeError ).toBeUndefined();

			// Should keep other errors
			const someWarning = annotations.find( ( a ) => a.text === 'Some warning' );
			expect( someWarning ).toBeDefined();
		} );

		it( 'only validates HTML when mode is html', () => {
			mockDoc.getAllLines.mockReturnValue( [
				'<script>alert(1)</script>'
			] );
			mockGetValue.mockReturnValue( '<script>alert(1)</script>' );

			renderCodeEditor( {
				mode: 'python',
				theme: 'chrome',
				value: 'print("hello")',
				readOnly: false
			} );

			// Find changeAnnotation handler - should exist but not trigger HTML validation
			const changeAnnotationHandler = mockSetListener.mock.calls.find(
				( call ) => call[ 0 ] === 'changeAnnotation'
			);

			// Handler should be registered
			expect( changeAnnotationHandler ).toBeDefined();

			// Trigger it
			changeAnnotationHandler[ 1 ]();

			// For non-HTML modes, setAnnotations should not be called
			// because the mode check prevents HTML validation
			expect( mockSetAnnotations ).not.toHaveBeenCalled();
		} );

		it( 'allows safe HTML tags and attributes', () => {
			// Use only safe, allowed HTML tags
			mockDoc.getAllLines.mockReturnValue( [
				'<div class="test">',
				'<b>bold</b>',
				'</div>'
			] );
			mockGetValue.mockReturnValue( '<div class="test"><b>bold</b></div>' );

			renderCodeEditor( {
				mode: 'html',
				theme: 'chrome',
				value: '<div class="test"><b>bold</b></div>',
				readOnly: false
			} );

			// Find and trigger the changeAnnotation handler
			const changeAnnotationHandler = mockSetListener.mock.calls.find(
				( call ) => call[ 0 ] === 'changeAnnotation'
			);
			changeAnnotationHandler[ 1 ]();

			// For safe content with no errors, setAnnotations is not called
			// because hasChanged is false (no doctype to filter, no custom annotations)
			expect( mockSetAnnotations ).not.toHaveBeenCalled();
		} );
	} );
} );
