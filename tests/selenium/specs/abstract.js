/*!
 * WikiLambda browser test suite for Abstract Article viewing
 *
 * Covers Special:ViewAbstract rendering and a basic interaction (preview language switch).
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

import { deletePage, ensurePageExists } from '../utils/abstractWikiFixtures.js';

import LoginPage from 'wdio-mediawiki/LoginPage.js';
import ViewAbstractPage from '../pageobjects/special/ViewAbstract.page.js';

/**
 * This test suite covers the Special:ViewAbstract page,
 * which allows users to view and interact with Abstract Wikipedia articles.
 * Its tests a simple fragment call using the built-in validate html fragment function.
 */
describe( 'Abstract Article (Special:ViewAbstract)', () => {
	const ABSTRACT_FRAGMENT_ERROR_MESSAGES = {
		'fragment-bad-fragment': 'The fragment is not a valid function call.',
		'fragment-bad-response': 'The fragment returned the wrong type.',
		'fragment-forbidden': 'You do not have the necessary permissions to render this fragment.',
		'fragment-not-enabled': 'Unable to render Abstract Wikipedia content fragments: this feature is not enabled.',
		'fragment-returned-zerror': 'Wikifunctions returned a failed response:',
		'fragment-service-unavailable': 'The rendering service is temporarily unavailable. Please, try again later.',
		'fragment-unknown-error': 'Unable to render this fragment due to an unknown error.'
	};

	const lang = 'en';
	const prefixedTitle = 'Abstract Wikipedia:Q42';
	const leadSectionQid = 'Q8776414';
	const successFragmentCall = {
		Z1K1: 'Z7',
		Z7K1: 'Z189',
		Z189K1: {
			Z1K1: 'Z89',
			Z89K1: '<b>Bold</b>'
		}
	};

	const errorFragmentCall = {
		Z1K1: 'Z7',
		Z7K1: 'Z801',
		Z801K1: 'hello from selenium'
	};

	const successfulAbstractContent = {
		qid: 'Q42',
		sections: {
			Q8776414: {
				index: 0,
				// Canonical Abstract content format expected by AbstractWikiContent validation.
				fragments: [ 'Z89', successFragmentCall ]
			}
		}
	};

	const errorAbstractContent = {
		qid: 'Q42',
		sections: {
			Q8776414: {
				index: 0,
				// Canonical Abstract content format expected by AbstractWikiContent validation.
				fragments: [ 'Z89', errorFragmentCall ]
			}
		}
	};

	before( async () => {
		await browser.deleteAllCookies();
		await LoginPage.loginAdmin();
	} );

	after( async () => {
		await deletePage( { title: prefixedTitle } );
	} );

	it( 'loads and renders content + preview widgets', async () => {
		await ensurePageExists( {
			title: prefixedTitle,
			text: JSON.stringify( successfulAbstractContent ),
			summary: 'e2e setup: update Abstract Article (success fragment)'
		} );

		await ViewAbstractPage.open( { lang, title: prefixedTitle } );

		await expect( await ViewAbstractPage.firstHeading )
			.toHaveText( prefixedTitle, { message: 'Unexpected page heading' } );

		await expect( await ViewAbstractPage.abstractViewRoot )
			.toBeExisting( { message: 'Abstract view root did not render' } );

		await expect( await ViewAbstractPage.abstractContentWidget )
			.toBeExisting( { message: 'Abstract content widget did not render' } );

		await expect( await ViewAbstractPage.abstractPreviewWidget )
			.toBeExisting( { message: 'Abstract preview widget did not render' } );

		const sectionTitleText = await ViewAbstractPage.getAbstractContentSectionTitleText();
		expect( sectionTitleText ).toMatch( new RegExp( `\\(${ leadSectionQid }\\)` ) );

		expect( await ViewAbstractPage.getAbstractContentSectionsCount() ).toBe( 1 );

		// Preview title should be present (label from Wikidata may vary by environment)
		await ViewAbstractPage.previewTitle.waitForDisplayed( { timeout: 20000 } );
		await expect( await ViewAbstractPage.previewTitle ).toHaveText(
			'Douglas Adams',
			{ message: 'Unexpected preview title (second h1)' }
		);

		// Wait for at least one fragment to resolve to HTML (not just loading)
		await ViewAbstractPage.waitForRenderedPreviewHtml();

		const renderedFragments = await ViewAbstractPage.previewFragmentHtml;
		expect( renderedFragments.length ).toBe( 1 );
		await expect( renderedFragments[ 0 ] ).toHaveText( 'Bold' );
	} );

	it( 'shows the expected error fragment when a function returns wrong type', async () => {
		const expectedErrorKey = 'fragment-bad-response';

		await ensurePageExists( {
			title: prefixedTitle,
			text: JSON.stringify( errorAbstractContent ),
			summary: 'e2e setup: update Abstract Article (error fragment)'
		} );

		await ViewAbstractPage.open( { lang, title: prefixedTitle } );

		const errorFragment = await ViewAbstractPage.previewFragmentError;

		// Assert error state in a way that survives copy changes for future error variants.
		await expect( errorFragment ).toHaveElementClass( 'cdx-message--error' );
		const errorText = await ViewAbstractPage.getPreviewErrorText();
		expect( errorText.length ).toBeGreaterThan( 0 );
		expect( errorText ).toContain( ABSTRACT_FRAGMENT_ERROR_MESSAGES[ expectedErrorKey ] );
	} );

	it( 'allows switching preview language', async () => {
		await ensurePageExists( {
			title: prefixedTitle,
			text: JSON.stringify( successfulAbstractContent ),
			summary: 'e2e setup: update Abstract Article (success fragment)'
		} );

		await ViewAbstractPage.open( { lang, title: prefixedTitle } );

		await ViewAbstractPage.changePreviewLanguage( 'German' );

		// Wait for rendered HTML to appear again and assert content.
		await ViewAbstractPage.waitForRenderedPreviewHtml();

		const renderedFragments = await ViewAbstractPage.previewFragmentHtml;
		expect( renderedFragments.length ).toBe( 1 );
		await expect( renderedFragments[ 0 ] ).toHaveText( 'Bold' );
	} );
} );
