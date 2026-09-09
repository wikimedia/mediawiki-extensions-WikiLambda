/*!
 * WikiLambda unit test suite for the ext.wikilambda.abstractpreview completeness detector.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const completeness = require( '../../../resources/ext.wikilambda.abstractpreview/completeness.js' );

describe( 'ext.wikilambda.abstractpreview completeness', () => {
	afterEach( () => {
		document.body.innerHTML = '';
	} );

	it( 'returns false when the DOM has no incompleteness markers', () => {
		document.body.innerHTML = '<section>some content</section>';

		expect( completeness.hasIncompleteSection() ).toBe( false );
	} );

	it( 'returns true for a section missing from the store entirely', () => {
		document.body.innerHTML = '<section data-wikilambda-aw-section-status="pending"></section>';

		expect( completeness.hasIncompleteSection() ).toBe( true );
	} );

	it( 'returns true for a rendered section with pending fragments', () => {
		document.body.innerHTML = '<meta itemprop="aw-section-status" data-pending="2">';

		expect( completeness.hasIncompleteSection() ).toBe( true );
	} );

	it( 'returns true for a rendered section with failed fragments', () => {
		document.body.innerHTML = '<meta itemprop="aw-section-status" data-failed="1">';

		expect( completeness.hasIncompleteSection() ).toBe( true );
	} );

	it( 'returns true for a rendered section serving stale cached fragments', () => {
		// only presence is checked, not value
		// e.g. 9 is the stale-fragment count
		document.body.innerHTML = '<meta itemprop="aw-section-status" data-stale="9">';

		expect( completeness.hasIncompleteSection() ).toBe( true );
	} );
} );
