/*!
 * ContentBlock Component Object for WikiLambda browser test suite
 *
 * Contains the Content block related locators and actions.
 *
 * ContentBlock is a general component which
 * [1] Takes input about the definition/implementation related details of the ZObject
 * [2] Display the definition/implementation related details of the ZObject
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const { Element: WebdriverIOElementType } = require( 'webdriverio' );
const ElementActions = require( '../utils/ElementActions' );

class ContentBlock {
	get contentBlock() {
		return $( 'div.ext-wikilambda-content' );
	}

	// #region

	/**
	 * Here, the section strictly refers to that section of the content block which has
	 * the label as " label" i.e. space before the label text
	 */

	/**
	 * Get the section of the content block
	 *
	 * @param {string} label - label for the section
	 * @param {Promise<WebdriverIOElementType>} [parentSection] - Section of
	 * the content block which is parent for other section of the content block - Optional param
	 * @return {Promise<WebdriverIOElementType>}
	 */
	async getSectionOfContentBlock( label, parentSection ) {
		const resolvedParentSection = await parentSection;
		if ( !resolvedParentSection ) {
			// setting this because the getter returns a Promise
			const contentBlock = await this.contentBlock;
			return await contentBlock.$( `.//label[text()="${ label }"]/parent::div/parent::div` );
		}
		return await resolvedParentSection.$( `.//label[text()="${ label }"]/parent::div/parent::div` );
	}

	/**
	 * Get the mode selector the given label in the content block
	 *
	 * @param {string} label - label for the section
	 * @param {Promise<WebdriverIOElementType>} [parentSection] - Section of
	 * the content block which is parent for other section of the content block - Optional param
	 * @return {Promise<WebdriverIOElementType>}
	 */
	async getSectionModeSelector( label, parentSection ) {
		const resolvedParentSection = await parentSection;
		let contentBlock;
		if ( !resolvedParentSection ) {
			contentBlock = await this.getSectionOfContentBlock( label );
			return contentBlock.$( 'div.ext-wikilambda-key-block' ).$( 'div.ext-wikilambda-mode-selector' );
		}
		contentBlock = await this.getSectionOfContentBlock( label, parentSection );
		return contentBlock.$( 'div.ext-wikilambda-key-block' ).$( 'div.ext-wikilambda-mode-selector' );
	}

	/**
	 * Set the mode of the label from the parentSection selector to the given mode
	 *
	 * @param {string} label - label for the section
	 * @param {string} mode - new mode to set
	 * @param {Promise<WebdriverIOElementType>} [parentSection] - Section of
	 */
	async selectMode( label, mode, parentSection ) {
		const resolvedParentSection = await parentSection;
		const modeSelector = await this.getSectionModeSelector( label, resolvedParentSection );
		const modeButton = await modeSelector.$( 'button[data-testid="mode-selector-button"]' );
		await ElementActions.doClick( modeButton );
		const modeSelectorMenu = await modeSelector.$( '[data-testid="mode-selector-menu"]' );
		modeSelectorMenu.waitForDisplayed();
		const optionSelector = await modeSelectorMenu.$( `bdi=${ mode }` );
		await ElementActions.doClick( await optionSelector );
	}

	/**
	 * Get the toggle button for the section of the content block
	 *
	 * @param {string} label - label for the section
	 * @param {Promise<WebdriverIOElementType>} [parentSection] - Section of
	 * the content block which is parent for other section of the content block - Optional param
	 * @return {Promise<WebdriverIOElementType>}
	 */
	async getSectionToggleButton( label, parentSection ) {
		const resolvedParentSection = await parentSection;
		let contentBlock;
		if ( !resolvedParentSection ) {
			contentBlock = await this.getSectionOfContentBlock( label );
			return contentBlock.$( './preceding-sibling::div[contains(@class,"ext-wikilambda-key-value-pre")]' );
		}
		contentBlock = await this.getSectionOfContentBlock( label, parentSection );
		return contentBlock.$( './preceding-sibling::div[contains(@class,"ext-wikilambda-key-value-pre")]' );
	}

	/**
	 * Toggle the section of the content block
	 *
	 * @async
	 * @param {string} label - label for the section
	 * @param {Promise<WebdriverIOElementType>} [parentSection] - Section of
	 * the content block which is parent for other section of the content block - Optional param
	 * @return {void}
	 */
	async toggleSection( label, parentSection ) {
		const toggleButton = await this.getSectionToggleButton( label, parentSection );
		await ElementActions.doClick( toggleButton );
	}

	/**
	 * Toggle the only child of the section of the content block
	 *
	 * @async
	 * @param {Promise<WebdriverIOElementType>} section - Section of
	 * the content block
	 * @return {void}
	 */
	async toggleSectionOnlyChild( section ) {
		await ElementActions.doClick( section.$( './/button[@aria-label="Toggle"]' ) );
	}

	// #endregion
}

module.exports = new ContentBlock();
