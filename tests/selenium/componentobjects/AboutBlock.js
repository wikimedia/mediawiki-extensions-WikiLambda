/*!
 * AboutBlock Component Object for WikiLambda browser test suite
 *
 * Contains About Block related locators and actions.
 *
 * AboutBlock is a general component which
 * [1] Takes input of the label, description, alias in different languages
 * [2] Display the label, description, alias in different languages
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const ElementActions = require( '../utils/ElementActions' );
const InputDropdown = require( './InputDropdown' );

class AboutBlock {
	get aboutBlock() {
		return $( 'div.ext-wikilambda-about' );
	}

	get editButton() {
		return this.aboutBlock.$( './/button[@aria-label="Edit"]' );
	}

	get detailsInputDialogBox() {
		return $( '//*[@data-testid="edit-label-dialog" and @aria-modal="true"]' );
	}

	get languageInputSelector() {
		return this.detailsInputDialogBox.$( './/input[@placeholder="Select language"]' );
	}

	get labelInputSelector() {
		return this.detailsInputDialogBox.$( './/input[@placeholder="Enter name"]' );
	}

	get descriptionInputSelector() {
		return this.detailsInputDialogBox.$( './/input[@placeholder="Enter description"]' );
	}

	get aliasInputSelector() {
		return this.detailsInputDialogBox.$( './/input[@placeholder="Enter aliases" or @placeholder=""]' );
	}

	get doneButton() {
		return this.detailsInputDialogBox.$( 'button=Done' );
	}

	get cancelButton() {
		return this.detailsInputDialogBox.$( 'button=Cancel' );
	}

	get showLanguagesButton() {
		return this.aboutBlock.$( './/button[contains(text(),"languages")]' );
	}

	get languageListDialogBox() {
		return this.aboutBlock.$(
			'.//div[contains(@class,"ext-wikilambda-about-language-list") and role="dialog"]' );
	}

	// #region About Block content

	/**
	 * Get the label displayed in the about block
	 *
	 * @async
	 * @return {string}
	 */
	async getAboutBlockLabel() {
		const selector = this.aboutBlock.$( './/div[text()="labels"]//following-sibling::div' );
		const text = ElementActions.getText( selector );
		return text;
	}

	/**
	 * Get the description displayed in the about block
	 *
	 * @async
	 * @return {string}
	 */
	async getAboutBlockDescription() {
		const selector = this.aboutBlock.$( './/div[text()="short descriptions"]//following-sibling::div' );
		const text = ElementActions.getText( selector );
		return text;
	}

	/**
	 * Open the language list dialog box
	 *
	 * @async
	 * @return {void}
	 */
	async clickShowLanguagesButton() {
		await ElementActions.doClick( this.showLanguagesButton );
	}

	// #endregion

	// #region Details Input Dialog Box

	/**
	 * Details Input Dialog Box contains
	 * [1] Language Input
	 * [2] Label Input
	 * [3] Description Input
	 * [4] Alias Input
	 */

	/**
	 * Open the Details Input Dialog Box
	 *
	 * @async
	 * @return {void}
	 */
	async openDetailsInputDialogBox() {
		await ElementActions.doClick( this.editButton );
	}

	/**
	 * Declare the Object type AboutDetails
	 *
	 * @typedef {Object} AboutDetails
	 * @property {string} language
	 * @property {string} label
	 * @property {string} description
	 * @property {string} alias
	 */

	/**
	 * Add the details to the Details Input Dialog Box
	 *
	 * @async
	 * @param {AboutDetails} aboutDetails
	 * @return {void}
	 */
	async addAboutDetails( aboutDetails ) {
		const { language, label, description, alias } = aboutDetails;
		await ElementActions.clearInput( this.languageInputSelector );
		await InputDropdown.setInputDropdown(
			this.detailsInputDialogBox, this.languageInputSelector, language );
		await ElementActions.setInput( this.labelInputSelector, label );
		await ElementActions.setInput( this.descriptionInputSelector, description );
		await ElementActions.setInput( this.aliasInputSelector, alias );
		await browser.keys( [ 'Enter' ] );
	}

	/**
	 * Submit the about details
	 *
	 * @async
	 * @return {void}
	 */
	async submitAboutDetails() {
		await ElementActions.doEnabledClick( this.doneButton );
	}

	/**
	 * Close the Details Input Dialog Box
	 *
	 * @async
	 * @return {void}
	 */
	async closeDetailsInputDialogBox() {
		await ElementActions.doClick( this.cancelButton );
	}

	// #endregion

	// #region Language List Dialog Box

	/**
	 * Click on the list item of the language list dialog box
	 *
	 * @async
	 * @param {string} language
	 * @return {void}
	 */
	async openLanguageListItem( language ) {
		const itemSelector = this.languageListDialogBox.$( `.//div[text()="${ language }"]` );
		await ElementActions.doClick( itemSelector );
	}

	// #endregion
}

module.exports = new AboutBlock();
