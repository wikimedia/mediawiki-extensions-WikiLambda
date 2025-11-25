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

import ElementActions from '../utils/ElementActions.js';
import { Element as WebdriverIOElementType } from 'webdriverio';

class AboutBlock {
	get aboutBlock() {
		return $( '[data-testid="about-widget"]' );
	}

	get showLanguagesButton() {
		return this.aboutBlock.$( '[data-testid="languages-button"]' );
	}

	get languagesDialogBox() {
		return $( '//*[@data-testid="languages-dialog" and @aria-modal="true"]' );
	}

	get languagesDialogSearchbox() {
		return this.languagesDialogBox.$( '[data-testid="languages-dialog"] [data-testid="search-language"]' );
	}

	get aboutDescription() {
		return this.aboutBlock.$( '[data-testid="about-description"]' );
	}

	// #region About Block content

	/**
	 * Get the accordion element for a given language
	 *
	 * @async
	 * @param {string} language
	 * @return {Promise<WebdriverIOElementType>}
	 */
	async getLanguageAccordion( language ) {
		const accordionSelector = `.//span[text()="${ language }"]`;
		const accordionTitle = await this.aboutBlock.$( accordionSelector );
		await accordionTitle.waitForExist();
		await accordionTitle.waitForDisplayed();
		const accordionElement = await accordionTitle.custom$( 'ancestor', 'details' );
		return accordionElement;
	}

	/**
	 * Get the input field for the name of a given
	 * language block in the About widget.
	 *
	 * @async
	 * @param {WebdriverIOElementType} parentBlock
	 * @return {Promise<WebdriverIOElementType>}
	 */
	async getLabelInput( parentBlock ) {
		return parentBlock.$( '[data-testid="about-name-field"] [data-testid="text-input"]' );
	}

	/**
	 * Get the input field for the description of a given
	 * language block in the About widget.
	 *
	 * @async
	 * @param {WebdriverIOElementType} parentBlock
	 * @return {Promise<WebdriverIOElementType>}
	 */
	async getDescriptionInput( parentBlock ) {
		return parentBlock.$( '[data-testid="about-description-field"] [data-testid="text-area"]' );
	}

	/**
	 * Get the input field for the aliases of a given
	 * language block in the About widget.
	 *
	 * @async
	 * @param {WebdriverIOElementType} parentBlock
	 * @return {Promise<WebdriverIOElementType>}
	 */
	async getAliasInput( parentBlock ) {
		return parentBlock.$( '[data-testid="about-aliases-field"] input' );
	}

	/**
	 * Get the description displayed in a given
	 * accordion element in the about block.
	 * If parent block is empty, return the first description
	 *
	 * @async
	 * @return {string}
	 */
	async getAboutBlockDescription() {
		await this.aboutDescription.waitForDisplayed();
		return await ElementActions.getText( this.aboutDescription );
	}

	/**
	 * Get the aliases displayed in the about block
	 *
	 * @async
	 * @return {Array}
	 */
	async getAboutBlockAliases() {
		const aliasesBlock = await this.aboutBlock.$( '[data-testid="about-aliases"]' );
		const aliases = await aliasesBlock.$$( '[data-testid="about-alias"]' );
		return aliases.map( ( aliasElement ) => {
			const text = ElementActions.getText( aliasElement );
			return text;
		} );
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

		await this.aboutBlock.waitForExist();
		await this.aboutBlock.waitForDisplayed();

		// Select language block
		const accordion = await this.getLanguageAccordion( language );

		// Expand the accordion element
		const accordionContent = await accordion.$( '.cdx-accordion__content' );
		const openAttribute = await accordion.getAttribute( 'open' );
		if ( openAttribute === null ) {
			await ElementActions.doClick( accordion );
			await accordionContent.waitForDisplayed();
		}

		// Get input field elements after waiting for them to appear)
		const labelInput = await this.getLabelInput( accordion );
		await labelInput.waitForDisplayed();
		const descriptionInput = await this.getDescriptionInput( accordion );
		const aliasInput = await this.getAliasInput( accordion );

		// Input the new values
		await ElementActions.setInput( labelInput, label );
		await ElementActions.setInput( descriptionInput, description );
		await ElementActions.setInput( aliasInput, alias );
		await browser.keys( [ 'Enter' ] );
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

	// #region Language selection dialog

	/**
	 * Searches and selects a language in the languages dialog box
	 *
	 * @param {string} language
	 * @return {void}
	 */
	async addLanguage( language ) {
		await this.clickShowLanguagesButton();
		const dialog = await this.languagesDialogSearchbox;
		await ElementActions.setInput( dialog, language );
		const languageItem = await this.getLanguageItem( language );
		await ElementActions.doClick( languageItem );
	}

	/**
	 * Selects a displayed language from the list that
	 * matches the given language.
	 *
	 * @param {string} language
	 * @return {Promise<WebdriverIOElementType>}
	 */
	async getLanguageItem( language ) {
		const itemSelector = `.//div[text()="${ language }"]`;
		const itemElement = await this.languagesDialogBox.$( itemSelector );
		await itemElement.waitForDisplayed();
		return itemElement.parentElement();
	}

	// #endregion
}

export default new AboutBlock();
