/*!
 * WikiLambda unit test suite for the CodeEditor component, which selects the
 * editor to use from the configuration flag.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const appConfig = require( '../../fixtures/appConfig.js' );
const CodeEditor = require( '../../../../resources/ext.wikilambda.app/components/base/CodeEditor.vue' );
const CodeMirrorEditor = require( '../../../../resources/ext.wikilambda.app/components/base/CodeMirrorEditor.vue' );
const PlainTextEditor = require( '../../../../resources/ext.wikilambda.app/components/base/PlainTextEditor.vue' );

const CODE_MIRROR_MODULE = 'ext.CodeMirror.VueComponent';

describe( 'CodeEditor', () => {
	const defaults = Object.assign( {}, appConfig );

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

	it( 'uses CodeMirror by default', () => {
		setCodeMirrorInstalled( true );

		const wrapper = shallowMount( CodeEditor, { props: { mode: 'python' } } );

		expect( wrapper.findComponent( CodeMirrorEditor ).exists() ).toBe( true );
	} );

	it( 'uses a plain textarea when the CodeMirror extension is absent', () => {
		const wrapper = shallowMount( CodeEditor, { props: { mode: 'python' } } );

		expect( wrapper.findComponent( PlainTextEditor ).exists() ).toBe( true );
		expect( wrapper.findComponent( CodeMirrorEditor ).exists() ).toBe( false );
	} );

	it( 'uses a plain textarea when WikiLambdaUseCodeMirror is false', () => {
		appConfig.WikiLambdaUseCodeMirror = false;
		setCodeMirrorInstalled( true );

		const wrapper = shallowMount( CodeEditor, { props: { mode: 'python' } } );

		expect( wrapper.findComponent( PlainTextEditor ).exists() ).toBe( true );
		expect( wrapper.findComponent( CodeMirrorEditor ).exists() ).toBe( false );
	} );

	it( 'passes the mode and the theme to CodeMirror', () => {
		setCodeMirrorInstalled( true );

		const wrapper = shallowMount( CodeEditor, {
			props: {
				value: 'pepsi cola',
				mode: 'python',
				theme: 'chrome',
				readOnly: true,
				disabled: true
			}
		} );

		expect( wrapper.findComponent( CodeMirrorEditor ).props() ).toEqual( expect.objectContaining( {
			value: 'pepsi cola',
			mode: 'python',
			theme: 'chrome',
			readOnly: true,
			disabled: true
		} ) );
	} );

	it( 'does not give the mode or the theme to a plain textarea', () => {
		const wrapper = shallowMount( CodeEditor, {
			props: { value: 'pepsi cola', mode: 'python', theme: 'chrome' }
		} );
		const textarea = wrapper.findComponent( PlainTextEditor );

		expect( textarea.props( 'value' ) ).toBe( 'pepsi cola' );
		expect( textarea.attributes( 'mode' ) ).toBeUndefined();
		expect( textarea.attributes( 'theme' ) ).toBeUndefined();
	} );

	it( 'passes on the change event of the editor', () => {
		setCodeMirrorInstalled( true );

		const wrapper = shallowMount( CodeEditor, { props: { value: '' } } );

		wrapper.findComponent( CodeMirrorEditor ).vm.$emit( 'change', 'fanta' );

		expect( wrapper.emitted( 'change' ) ).toEqual( [ [ 'fanta' ] ] );
	} );
} );
