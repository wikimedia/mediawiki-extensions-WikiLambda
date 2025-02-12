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
			setMode: mockSetMode
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
} );
