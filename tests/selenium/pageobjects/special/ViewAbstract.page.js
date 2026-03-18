/*!
 * Special:ViewAbstract page object for the WikiLambda browser test suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

import Page from 'wdio-mediawiki/Page.js';
import ElementActions from '../../utils/ElementActions.js';
import InputDropdown from '../../componentobjects/InputDropdown.js';

class ViewAbstractPage extends Page {
	get firstHeading() {
		return $( '#firstHeading' );
	}

	get abstractViewRoot() {
		return $( '.ext-wikilambda-app-abstract-view' );
	}

	get abstractContentWidget() {
		return $( '.ext-wikilambda-app-abstract-content' );
	}

	get abstractContentSectionTitle() {
		return $( '.ext-wikilambda-app-abstract-content-section-title' );
	}

	get abstractContentSections() {
		return $$( '.ext-wikilambda-app-abstract-content-section' );
	}

	get abstractPreviewWidget() {
		return $( '.ext-wikilambda-app-abstract-preview' );
	}

	get previewBody() {
		return $( '.ext-wikilambda-app-abstract-preview__body' );
	}

	get previewTitle() {
		return this.previewBody.$( 'h1' );
	}

	get previewLanguageSelector() {
		return $( '.ext-wikilambda-app-abstract-preview__language-selector' );
	}

	get previewLanguageLookupInput() {
		return this.previewLanguageSelector.$( '[data-testid="z-object-selector-lookup"]' );
	}

	get previewFragmentHtml() {
		return $$( '.ext-wikilambda-app-abstract-preview-fragment-html' );
	}

	get previewFragmentLoading() {
		return $$( '.ext-wikilambda-app-abstract-preview-fragment-loading' );
	}

	get previewFragmentError() {
		return $( '.ext-wikilambda-app-abstract-preview-fragment-error' );
	}

	/**
	 * @async
	 * @return {string}
	 */
	async getAbstractContentSectionTitleText() {
		await this.abstractContentSectionTitle.waitForDisplayed( { timeout: 20000 } );
		return ElementActions.getText( this.abstractContentSectionTitle );
	}

	/**
	 * @async
	 * @return {number}
	 */
	async getAbstractContentSectionsCount() {
		const contentSections = await this.abstractContentSections;
		return contentSections.length;
	}

	/**
	 * @async
	 * @return {void}
	 */
	async waitForRenderedPreviewHtml() {
		await browser.waitUntil( async () => {
			const htmlNodes = await this.previewFragmentHtml;
			return htmlNodes.length > 0;
		}, { timeout: 30000, timeoutMsg: 'No rendered preview fragment HTML found' } );
	}

	/**
	 * @async
	 * @return {string}
	 */
	async getPreviewErrorText() {
		await this.previewFragmentError.waitForDisplayed( { timeout: 30000 } );
		return ElementActions.getText( this.previewFragmentError );
	}

	/**
	 * Changes the preview language via the language lookup dropdown.
	 *
	 * @async
	 * @param {string} languageLabel
	 * @return {void}
	 */
	async changePreviewLanguage( languageLabel ) {
		const selectorRoot = await this.previewLanguageSelector;
		const selectorInput = await this.previewLanguageLookupInput;

		// In some environments the preview fragment loader may already exist in the DOM; in that
		// case we only enforce the rerender via rendered HTML checks.
		const beforeLoadingCount = ( await this.previewFragmentLoading ).length;
		await InputDropdown.clearLookupInput( selectorInput );
		await InputDropdown.setLookupOption( selectorRoot, selectorInput, languageLabel );

		if ( beforeLoadingCount === 0 ) {
			await browser.waitUntil( async () => {
				const loading = await this.previewFragmentLoading;
				return loading.length > 0;
			}, { timeout: 20000, timeoutMsg: 'Preview loader did not appear after language change' } );
		}
	}

	/**
	 * Open Special:ViewAbstract for a given language + title.
	 *
	 * @param {Object} payload
	 * @param {string} payload.lang
	 * @param {string} payload.title - prefixed title, e.g. "Abstract Wikipedia:Q42"
	 * @param {Object} [payload.query] - optional query params
	 */
	async open( { lang, title, query = {} } ) {
		const subpage = `${ lang }/${ title }`;
		await super.openTitle( 'Special:ViewAbstract/' + subpage, query );
	}
}

export default new ViewAbstractPage();
