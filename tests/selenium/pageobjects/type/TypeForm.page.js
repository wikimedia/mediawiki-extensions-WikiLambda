/**
 * Type Form page object for the WikiLambda browser test suite
 *
 * Contains the locators and actions specific to the Type Form.
 *
 * The page contains the following sections
 * [1] About - Input the label, description, alias in different languages for the type
 * [2] Content Block - It is further divided into
 * [a] Keys Block - Input the definition for the type
 * [b] Validator Block - Input the validator for the type
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const Page = require( 'wdio-mediawiki/Page' );
const AboutBlock = require( '../../componentobjects/AboutBlock' );
const ZObjectPublish = require( '../../componentobjects/ZObjectPublish' );
const ContentBlock = require( '../../componentobjects/ContentBlock' );
const InputDropdown = require( '../../componentobjects/InputDropdown' );
const ElementActions = require( '../../utils/ElementActions' );

class TypeForm extends Page {
	get aboutBlockDialogBox() {
		return AboutBlock.detailsInputDialogBox;
	}

	get contentBlock() {
		return ContentBlock.contentBlock;
	}

	/**
	 * Open the type form
	 *
	 * @async
	 * @return {void}
	 */
	async open() {
		await super.openTitle( 'Special:CreateObject', { zid: 'Z4' } );
	}

	// #region About Block

	/**
	 * Open the About Block Dialog Box
	 *
	 * @async
	 * @return {void}
	 */
	async openAboutBlockDialogBox() {
		await AboutBlock.openDetailsInputDialogBox();
	}

	/**
	 * Declare the object type: AboutBlockEntries
	 *
	 * @typedef {Object} AboutBlockEntries
	 * @property {string} language
	 * @property {string} label
	 * @property {string} description
	 * @property {string} alias
	 */

	/**
	 * Add the entries to the About Block Dialog Box
	 *
	 * @async
	 * @param {AboutBlockEntries} aboutBlockEntries
	 * @return {void}
	 */
	async addAboutBlockEntries( aboutBlockEntries ) {
		await AboutBlock.addAboutDetails( aboutBlockEntries );
	}

	/**
	 * Submit the About Block entries
	 *
	 * @async
	 * @return {void}
	 */
	async submitAboutBlockEntries() {
		await AboutBlock.submitAboutDetails();
	}

	// #endregion

	// #region Content Block

	// #region Keys Block

	/**
	 * Keys Block is used to input the Type definition
	 *
	 * A key in key block contains
	 * [1] Value type
	 * [2] KeyId
	 * [3] texts - Each item in texts contains [a] Language [b] text
	 */

	get keysBlock() {
		return ContentBlock.getSectionOfContentBlock( 'keys' );
	}

	/**
	 * Click on the "Add item" button of the Keys Block
	 *
	 * @async
	 * @return {void}
	 */
	async addKey() {
		const keysBlock = await this.keysBlock;
		const button = await keysBlock.$$( 'button[data-testid="typed-list-add-item"]' );
		const length = button.length;
		await ElementActions.doClick( button[ length - 1 ] );
	}

	/**
	 * Declare the object type: KeysBlockEntry
	 *
	 * @typedef {Object} Text
	 * @property {string} language
	 * @property {string} languageShortName
	 * @property {string} text
	 *
	 * @typedef {Object} KeysBlockEntry
	 * @property {number} selectorIndex
	 * @property {string} valueType
	 * @property {string} keyId
	 * @property {Array<Text>} textArray
	 */

	/**
	 * Set a key in the keys block - Fill the entries in
	 * value type input, key id input, texts block
	 *
	 * @async
	 * @param {KeysBlockEntry} keysBlockEntry
	 * @return {void}
	 */
	async setKey( keysBlockEntry ) {
		const { selectorIndex, valueType, keyId, textArray } = keysBlockEntry;
		const keysBlock = await this.keysBlock;
		const keysBlockItem = await keysBlock.$$( './/label[contains(text(),"Item")]/parent::div/parent::div' )[ selectorIndex ];

		/**
		 * Set the Value type input
		 */
		const valueTypeBlock = await ContentBlock.getSectionOfContentBlock( 'value type', keysBlockItem );
		const selectTypeInput = await valueTypeBlock.$( './/input[@placeholder="Select a Type"]' );
		await InputDropdown.setLookupOption( valueTypeBlock, selectTypeInput, valueType );

		/**
		 * Set the KeyId input
		 */
		const keyIdBlock = await ContentBlock.getSectionOfContentBlock( 'key id', keysBlockItem );
		const keyIdInput = await keyIdBlock.$( './/input' );
		await ElementActions.setInput( keyIdInput, keyId );

		const labelBlock = await ContentBlock.getSectionOfContentBlock( 'label', keysBlockItem );
		const textsBlock = await ContentBlock.getSectionOfContentBlock( 'texts', labelBlock );

		for ( const i in textArray ) {
			/**
			 * Add text item
			 */
			const button = await textsBlock.$( 'button[data-testid="typed-list-add-item"]' );
			await ElementActions.doClick( button );

			const textItem = await ContentBlock.getSectionOfContentBlock( `Item ${ parseInt( i ) + 1 }`, textsBlock );

			/**
			 * Set the language input
			 */
			const languageBlock = await ContentBlock.getSectionOfContentBlock( 'language', textItem );
			const languageInput = await languageBlock.$( './/input[@placeholder="Select language"]' );
			await InputDropdown.setLookupOption( languageBlock, languageInput, textArray[ i ].language );

			/**
			 * Set the text input
			 */
			const textBlock = await ContentBlock.getSectionOfContentBlock( 'text', textItem );
			const textInput = await textBlock.$( './/input' );
			await ElementActions.setInput( textInput, textArray[ i ].text );
		}
	}

	// #endregion

	// #region Type Functions: Validator, Equality, Renderer and Parser

	/**
	 * Set the validator of the type
	 *
	 * @async
	 * @param {string} label
	 * @param {string} value
	 * @return {void}
	 */
	async setTypeFunction( label, value ) {
		const typeFunctionBlock = await ContentBlock.getSectionOfContentBlock( label );
		const typeFunctionInput = await typeFunctionBlock.$( './/input' );
		await InputDropdown.setLookupOption( typeFunctionBlock, typeFunctionInput, value );
	}

	// #endregion

	// #endregion

	/**
	 * Publish the type
	 *
	 * @async
	 * @return {void}
	 */
	async publishType() {
		await ZObjectPublish.publish();
	}
}

module.exports = new TypeForm();
