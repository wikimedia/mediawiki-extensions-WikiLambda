/*!
 * WikiLambda unit test suite for the CodeEditor component, which selects the
 * editor to use from the configuration flags.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const appConfig = require( '../../fixtures/appConfig.js' );
const CodeEditor = require( '../../../../resources/ext.wikilambda.app/components/base/CodeEditor.vue' );
const AceEditor = require( '../../../../resources/ext.wikilambda.app/components/base/AceEditor.vue' );
const CodeMirrorEditor = require( '../../../../resources/ext.wikilambda.app/components/base/CodeMirrorEditor.vue' );
const PlainTextEditor = require( '../../../../resources/ext.wikilambda.app/components/base/PlainTextEditor.vue' );

const CODE_MIRROR_MODULE = 'ext.CodeMirror.VueComponent';

describe( 'CodeEditor', () => {
	const defaults = Object.assign( {}, appConfig );

	/**
	 * Set the configuration flags for one test.
	 *
	 * @param {boolean} useCodeEditor
	 * @param {boolean} useCodeMirror
	 */
	function setFlags( useCodeEditor, useCodeMirror ) {
		appConfig.WikiLambdaUseCodeEditor = useCodeEditor;
		appConfig.WikiLambdaUseCodeMirror = useCodeMirror;
	}

	/**
	 * Report the CodeMirror module as installed, or as absent.
	 *
	 * @param {boolean} isInstalled
	 */
	function setCodeMirrorInstalled( isInstalled ) {
		mw.loader.getState.mockImplementation(
			( module ) => ( isInstalled && module === CODE_MIRROR_MODULE ? 'registered' : null )
		);
	}

	beforeEach( () => {
		// CodeMirror renders nothing until its modules load, and they never do here.
		mw.loader.using.mockReturnValue( new Promise( () => {} ) );
		setCodeMirrorInstalled( false );
	} );

	afterEach( () => {
		Object.assign( appConfig, defaults );
		mw.loader.getState.mockReturnValue( null );
		mw.loader.using.mockResolvedValue( jest.fn() );
	} );

	it( 'uses the ACE editor by default', () => {
		const wrapper = shallowMount( CodeEditor, { props: { mode: 'python' } } );

		expect( wrapper.findComponent( AceEditor ).exists() ).toBe( true );
	} );

	it( 'uses CodeMirror when WikiLambdaUseCodeMirror is true', () => {
		setFlags( true, true );
		setCodeMirrorInstalled( true );

		const wrapper = shallowMount( CodeEditor, { props: { mode: 'python' } } );

		expect( wrapper.findComponent( CodeMirrorEditor ).exists() ).toBe( true );
		expect( wrapper.findComponent( AceEditor ).exists() ).toBe( false );
	} );

	it( 'falls back to the ACE editor when the CodeMirror extension is absent', () => {
		setFlags( true, true );
		setCodeMirrorInstalled( false );

		const wrapper = shallowMount( CodeEditor, { props: { mode: 'python' } } );

		expect( wrapper.findComponent( AceEditor ).exists() ).toBe( true );
		expect( wrapper.findComponent( CodeMirrorEditor ).exists() ).toBe( false );
	} );

	it( 'uses a plain textarea when both flags are false', () => {
		setFlags( false, false );

		const wrapper = shallowMount( CodeEditor, { props: { mode: 'python' } } );

		expect( wrapper.findComponent( PlainTextEditor ).exists() ).toBe( true );
	} );

	it( 'uses a plain textarea when CodeMirror is asked for, is absent, and ACE is off', () => {
		setFlags( false, true );
		setCodeMirrorInstalled( false );

		const wrapper = shallowMount( CodeEditor, { props: { mode: 'python' } } );

		expect( wrapper.findComponent( PlainTextEditor ).exists() ).toBe( true );
	} );

	it( 'passes the mode and the theme to the ACE editor', () => {
		const wrapper = shallowMount( CodeEditor, {
			props: {
				value: 'pepsi cola',
				mode: 'python',
				theme: 'chrome',
				readOnly: true,
				disabled: true
			}
		} );

		expect( wrapper.findComponent( AceEditor ).props() ).toEqual( expect.objectContaining( {
			value: 'pepsi cola',
			mode: 'python',
			theme: 'chrome',
			readOnly: true,
			disabled: true
		} ) );
	} );

	it( 'does not give the mode or the theme to a plain textarea', () => {
		setFlags( false, false );

		const wrapper = shallowMount( CodeEditor, {
			props: { value: 'pepsi cola', mode: 'python', theme: 'chrome' }
		} );
		const textarea = wrapper.findComponent( PlainTextEditor );

		expect( textarea.props( 'value' ) ).toBe( 'pepsi cola' );
		expect( textarea.attributes( 'mode' ) ).toBeUndefined();
		expect( textarea.attributes( 'theme' ) ).toBeUndefined();
	} );

	it( 'passes on the change event of the editor', () => {
		const wrapper = shallowMount( CodeEditor, { props: { value: '' } } );

		wrapper.findComponent( AceEditor ).vm.$emit( 'change', 'fanta' );

		expect( wrapper.emitted( 'change' ) ).toEqual( [ [ 'fanta' ] ] );
	} );
} );
