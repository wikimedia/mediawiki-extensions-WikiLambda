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
const ElementActions = require( '../utils/ElementActions' ),
	InputDropdown = require( './InputDropdown' ),
	i18n = require( '../utils/i18n.js' )();

class AboutBlock {
	get aboutBlock() {
		return $( '[data-testid="about"]' );
	}

	get editButton() {
		return this.aboutBlock.$( '[data-testid="open-dialog-button"]' );
	}

	get detailsInputDialogBox() {
		return $( '//*[@data-testid="edit-label-dialog" and @aria-modal="true"]' );
	}

	get languageInputSelector() {
		return this.detailsInputDialogBox.$( '[data-testid="edit-label-dialog"] [data-testid="z-object-selector-lookup"]' );
	}

	get labelInputSelector() {
		return this.detailsInputDialogBox.$( '[data-testid="text-input"]' );
	}

	get descriptionInputSelector() {
		return this.detailsInputDialogBox.$( '[data-testid="text-area"]' );
	}

	get aliasInputSelector() {
		return this.detailsInputDialogBox.$( '[data-testid="chip-input"]' );
	}

	get doneButton() {
		return this.detailsInputDialogBox.$( `button=${ i18n[ 'wikilambda-about-widget-done-button' ] }` );
	}

	get cancelButton() {
		return this.detailsInputDialogBox.$( `button=${ i18n[ 'wikilambda-cancel' ] }` );
	}

	get showLanguagesButton() {
		return this.aboutBlock.$( '[data-testid="languages-button"]' );
	}

	// #region About Block content

	/**
	 * Get the description displayed in the about block
	 *
	 * @async
	 * @return {string}
	 */
	async getAboutBlockDescription() {
		const selector = this.aboutBlock.$( '[data-testid="about-description"]' );
		const text = ElementActions.getText( selector );
		return text;
	}

	/**
	 * Get the aliases displayed in the about block
	 *
	 * @async
	 * @return {Array}
	 */
	async getAboutBlockAliases() {
		const aliasesBlock = await this.aboutBlock.$( '.ext-wikilambda-about-aliases' );
		const aliases = await aliasesBlock.$$( '.ext-wikilambda-about-alias' );
		return aliases.map( ( aliasElement ) => {
			const text = ElementActions.getText( aliasElement );
			return text;
		} );
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
		await InputDropdown.setLookupOption(
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
}

module.exports = new AboutBlock();
