/*!
 * WikiLambda unit test suite for the default CodeEditor component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

require( '@testing-library/jest-dom' );

const { shallowMount } = require( '@vue/test-utils' );
const CodeEditor = require( '../../../../resources/ext.wikilambda.app/components/base/CodeEditor.vue' );

describe( 'CodeEditor', () => {
	let mockSetReadOnly,
		mockSetMode,
		mockSetTheme,
		mockSetOptions,
		mockSetOption,
		mockSetListener,
		mockSetValue,
		mockSession;

	beforeEach( () => {
		mw.config = {
			get: jest.fn( () => '/w/extensions' )
		};

		mockSetListener = jest.fn();
		mockSetReadOnly = jest.fn();
		mockSetMode = jest.fn();
		mockSetTheme = jest.fn();
		mockSetOptions = jest.fn();
		mockSetOption = jest.fn();
		mockSetValue = jest.fn();
		mockSession = jest.fn( () => ( {
			setMode: mockSetMode,
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
		const wrapper = shallowMount( CodeEditor, {
			props: {
				mode: 'python',
				theme: 'chrome',
				value: 'pepsi cola',
				readOnly: true
			}
		} );

		expect( wrapper.find( 'div' ).exists() ).toBe( true );
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

		const wrapper = shallowMount( CodeEditor, {
			props: {
				mode: 'python',
				theme: 'chrome',
				value: 'pepsi cola',
				readOnly: true
			}
		} );

		expect( wrapper.find( 'div' ).exists() ).toBe( true );
		expect( window.ace.config.set ).toHaveBeenCalledWith(
			'basePath',
			'http://example.com/path/WikiLambda/resources/lib/ace/src'
		);
	} );

	it( 'sets readOnly upon change', async () => {
		const wrapper = shallowMount( CodeEditor, {
			props: {
				readOnly: true
			}
		} );

		wrapper.setProps( { readOnly: false } );
		await wrapper.vm.$nextTick();

		expect( mockSetReadOnly ).toHaveBeenCalledWith( false );
	} );

	it( 'sets mode upon change', async () => {
		const wrapper = shallowMount( CodeEditor, {
			props: {
				mode: 'python'
			}
		} );

		wrapper.setProps( { mode: 'ruby' } );
		expect( mockSetMode ).toHaveBeenCalledWith( 'ace/mode/python' );
		await wrapper.vm.$nextTick();

		expect( mockSetOption ).toHaveBeenCalledWith( 'mode', 'ace/mode/ruby' );
	} );

	it( 'sets theme upon change', async () => {
		const wrapper = shallowMount( CodeEditor, {
			props: {
				theme: 'chrome'
			}
		} );

		wrapper.setProps( { theme: 'firefox' } );
		await wrapper.vm.$nextTick();

		expect( mockSetTheme ).toHaveBeenCalledWith( 'ace/theme/firefox' );
	} );

	it( 'sets value upon change', async () => {
		const wrapper = shallowMount( CodeEditor, {
			props: {
				value: 'fritz-kola'
			}
		} );

		wrapper.setProps( { value: 'fanta' } );
		await wrapper.vm.$nextTick();

		expect( mockSetValue ).toHaveBeenCalledWith( 'fanta', 1 );
	} );

	it( 'getDisallowedTagAnnotations flags disallowed tags', () => {
		const wrapper = shallowMount( CodeEditor );
		const session = {
			doc: {
				getAllLines: () => [
					'<script>alert(1)</script>',
					'<b>bold</b>',
					'<foo>bar</foo>'
				]
			}
		};
		const annots = wrapper.vm.getDisallowedTagAnnotations( session );
		expect( annots ).toEqual( expect.arrayContaining( [
			expect.objectContaining( { text: expect.stringContaining( '<script>' ), type: 'error' } ),
			expect.objectContaining( { text: expect.stringContaining( '<foo>' ), type: 'error' } )
		] ) );
		// Should not flag <b>
		expect( annots.some( ( a ) => a.text.includes( '<b>' ) ) ).toBe( false );
	} );

	it( 'getEventAttributeAnnotations flags event handler attributes', () => {
		const wrapper = shallowMount( CodeEditor );
		const session = {
			doc: {
				getAllLines: () => [
					'<div onclick="alert(1)">Click me</div>',
					'<span onmouseover="foo()">Hover</span>',
					'<p>Safe</p>'
				]
			}
		};
		const annots = wrapper.vm.getEventAttributeAnnotations( session );
		expect( annots ).toEqual( expect.arrayContaining( [
			expect.objectContaining( { text: expect.stringContaining( 'onclick' ), type: 'error' } ),
			expect.objectContaining( { text: expect.stringContaining( 'onmouseover' ), type: 'error' } )
		] ) );
		// Should not flag safe lines
		expect( annots.some( ( a ) => a.text.includes( 'Safe' ) ) ).toBe( false );
	} );

	it( 'handleHtmlAnnotations adds custom annotations for html mode', () => {
		const wrapper = shallowMount( CodeEditor, {
			props: { mode: 'html' }
		} );
		const session = {
			getAnnotations: jest.fn( () => [
				{ row: 0, column: 0, text: 'Some warning', type: 'warning' },
				{ row: 1, column: 0, text: 'Doctype not allowed', type: 'error' }
			] ),
			doc: {
				getAllLines: () => [
					'<script>alert(1)</script>',
					'<div onclick="foo()"></div>',
					'<a href="javascript:alert(1)">link</a>'
				]
			},
			setAnnotations: jest.fn()
		};
		wrapper.vm.editor = { session };

		wrapper.vm.handleHtmlAnnotations();

		// Should call setAnnotations with filtered and custom annotations
		expect( session.setAnnotations ).toHaveBeenCalled();
		const calledWith = session.setAnnotations.mock.calls[ 0 ][ 0 ];
		expect( calledWith ).toEqual( expect.arrayContaining( [
			expect.objectContaining( { code: 'DISALLOWED_HTML', type: 'error' } )
		] ) );
	} );

	it( 'getJavaScriptUrlAnnotations flags javascript: URLs in href/src', () => {
		const wrapper = shallowMount( CodeEditor );
		const session = {
			doc: {
				getAllLines: () => [
					'<a href="javascript:alert(1)">bad</a>',
					'<img src="javascript:evil()">',
					'<a href="https://example.com">good</a>'
				]
			}
		};
		const annots = wrapper.vm.getJavaScriptUrlAnnotations( session );
		expect( annots ).toEqual( expect.arrayContaining( [
			expect.objectContaining( { text: expect.stringContaining( 'JavaScript URLs are not allowed' ), type: 'error' } )
		] ) );
		// Should not flag safe URLs
		expect( annots.some( ( a ) => a.text.includes( 'https://example.com' ) ) ).toBe( false );
	} );
} );
