/**
 * @file contains the locators and actions specific to the type form.
 * The form contains the following section
 * [1] About - Input the label, description, alias in different languages for the type
 * [2] Content Block - It is further divided into
 * [a] Keys Block - Input the definition for the type
 * [b] Validator Block - Input the validator for the type
 */

'use strict';
const Page = require( 'wdio-mediawiki/Page' );
const AboutBlock = require( '../../componentobjects/AboutBlock' );
const ZObjectPublish = require( '../../componentobjects/ZObjectPublish' );
const ContentBlock = require( '../../componentobjects/ContentBlock' );
const InputDropdown = require( '../../componentobjects/InputDropdown' );
const ElementActions = require( '../../utils/ElementActions' );

class TypeForm extends Page {
	get aboutBlockDialogBox() { return AboutBlock.detailsInputDialogBox; }
	get contentBlock() { return ContentBlock.contentBlock; }

	/**
	 * Open the type form
	 *
	 * @async
	 * @return {void}
	 */
	async open() {
		await super.openTitle( 'Special:CreateZObject', { zid: 'Z4' } );
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
		const button = this.keysBlock.$( './div/div/button[text()="Add item"]' );
		await ElementActions.doClick( button );
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
	 * @property {number} index
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
		const { index, valueType, keyId, textArray } = keysBlockEntry;

		const keysBlockItem = await this.keysBlock.$$( './div/div/ul/li' )[ index ];

		/**
		 * Set the Value type input
		 */
		const valueTypeBlock = ContentBlock.getSectionOfContentBlock( 'value type', keysBlockItem );
		await InputDropdown.setInputDropdown( valueTypeBlock, valueTypeBlock.$( './/input[@placeholder="Select a Type"]' ),
			valueType );

		/**
		 * Set the KeyId input
		 */
		const keyIdBlock = ContentBlock.getSectionOfContentBlock( 'key id', keysBlockItem );
		await ElementActions.setInput( keyIdBlock.$( './/input' ), keyId );

		const labelBlock = ContentBlock.getSectionOfContentBlock( 'label', keysBlockItem );
		const textsBlock = ContentBlock.getSectionOfContentBlock( 'texts', labelBlock );

		for ( const i in textArray ) {
			/**
			 * Add text item
			 */
			const button = textsBlock.$( './div/div/button[text()="Add item"]' );
			await ElementActions.doClick( button );

			const textItem = await textsBlock.$$( './div/div/ul/li' )[ i ];

			/**
			 * Set the language input
			 */
			const languageBlock = ContentBlock.getSectionOfContentBlock( 'language', textItem );
			await InputDropdown.setInputDropdown( languageBlock, languageBlock.$( './/input[@placeholder="Select language"]' ), textArray[ i ].language );

			/**
			 * Set the text input
			 */
			const textBlock = ContentBlock.getSectionOfContentBlock( 'text', textItem );
			await ElementActions.setInput( textBlock.$( './/input' ), textArray[ i ].text );
		}
	}

	// #endregion

	// #region Validator Block

	/**
	 * Validator Block is used to input the Validator for the Type
	 */

	get validatorBlock() {
		return ContentBlock.getSectionOfContentBlock( 'validator' );
	}

	/**
	 * Set the validator of the type
	 *
	 * @async
	 * @param {string} validator
	 * @return {void}
	 */
	async setValidator( validator ) {
		const input = this.validatorBlock.$( './/input[@placeholder="ZObject"]' );
		await InputDropdown.setInputDropdown( this.validatorBlock, input, validator );
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
