/*!
 * WikiLambda unit test suite for the ext.wikilambda.image broken-image placeholder.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

// Render a Wikifunctions image with the load state that the browser would report.
function renderImage( complete, naturalWidth ) {
	document.body.innerHTML = '<figure class="ext-wikilambda-image">' +
		'<img src="https://upload.wikimedia.org/example.png" width="200" height="100">' +
		'<figcaption></figcaption></figure>';
	const img = document.querySelector( 'img' );
	Object.defineProperty( img, 'complete', { value: complete } );
	Object.defineProperty( img, 'naturalWidth', { value: naturalWidth } );
	return img;
}

function loadModule() {
	jest.isolateModules( () => {
		require( '../../../resources/ext.wikilambda.image/init.js' );
	} );
}

function hasPlaceholder() {
	return document.querySelector( 'figure.ext-wikilambda-image--error .ext-wikilambda-image__placeholder' ) !== null;
}

describe( 'ext.wikilambda.image', () => {
	it( 'replaces an image that failed before the module loaded', () => {
		renderImage( true, 0 );
		loadModule();

		expect( document.querySelector( 'img' ) ).toBeNull();
		expect( hasPlaceholder() ).toBe( true );
	} );

	it( 'replaces an image that is still loading when it fails', () => {
		const img = renderImage( false, 0 );
		loadModule();

		expect( document.querySelector( 'img' ) ).toBe( img );

		img.dispatchEvent( new Event( 'error' ) );

		expect( document.querySelector( 'img' ) ).toBeNull();
		expect( hasPlaceholder() ).toBe( true );
	} );

	it( 'keeps an image that has loaded', () => {
		const img = renderImage( true, 200 );
		loadModule();

		expect( document.querySelector( 'img' ) ).toBe( img );
		expect( hasPlaceholder() ).toBe( false );
	} );
} );
