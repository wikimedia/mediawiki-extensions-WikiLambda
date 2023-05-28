/*!
 * Function page object for the WikiLambda browser test suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const Page = require( 'wdio-mediawiki/Page' );
const ElementActions = require( '../../utils/ElementActions' );
const EvaluateFunctionBlock = require( '../../componentobjects/EvaluateFunctionBlock' );
const InputDropdown = require( '../../componentobjects/InputDropdown' );
const { Element: WebdriverIOElementType } = require( 'webdriverio' );

class FunctionPage extends Page {
	get functionTitle() { return $( '.ext-wikilambda-viewpage-header-title--function-name' ); }
	get functionZIdSelector() { return $( 'span.ext-wikilambda-viewpage-header-zid' ); }
	get detailsTab() { return $( '//a[@role="tab" and text()="Details"]' ); }
	get showMoreLanguageButton() { return $( 'button=Show more languages' ); }
	get hideListButton() { return $( 'button=Hide list' ); }
	get editSourceLink() { return $( '//nav[@aria-label="Views"]//a[contains(@title, "Edit")]/span[contains(text(),"Edit")]' ); }
	get showNameInOtherLanguages() { return $( 'button*=Show name in other languages' ); }
	get showMoreAliases() { return $( 'button*=Show more languages' ); }
	get sidebarTable() { return $( '.ext-wikilambda-function-viewer-details-sidebar' ); }
	get createANewTestLink() { return $( 'a=Create a new test' ); }
	get createAImplementation() { return $( 'a=Create a new implementation' ); }

	/**
	 * Call the function with only one parameter which is of type string.
	 *
	 * @async
	 * @param {string} ZObjectLabel - Function label which is being evaluated
	 * @param {string} param - parameters to call the function with
	 * @return {void}
	 */
	async callFunctionWithString( ZObjectLabel, param ) {
		await EvaluateFunctionBlock.toggleFunctionCallBlock();
		await EvaluateFunctionBlock.setFunction( ZObjectLabel );
		const functionCallBlock = EvaluateFunctionBlock.functionCallBlock;

		/**
		 * Input the type "String"
		 */
		const typeBlock = functionCallBlock.$( './/label[text()=" type" and @class!=""]//parent::div//following-sibling::div' );
		await InputDropdown.setInputDropdown( typeBlock, typeBlock.$( './/input[@placeholder="Select a Type"]' ), 'String' );

		/**
		 * Input the param
		 */
		const valueBlock = functionCallBlock.$( './/label[text()=" value"]/parent::div/following-sibling::div' );
		await ElementActions.setInput( valueBlock.$( './/input' ), param );

		/**
		 * call function
		 */
		await EvaluateFunctionBlock.callFunction();
	}

	/**
	 * Get the result selector of the Evaluate Function Block
	 *
	 * @async
	 * @param {string} result - expected result
	 * @return {WebdriverIOElementType}
	 */
	async getEvaluateFunctionResultSelector( result ) {
		return EvaluateFunctionBlock.resultBlock.$( `.//p[text()="${result}"]` );
	}

	getArgumentLabel( label ) {
		return $( `td=${label}` );
	}

	async getInputType( inputTypeLabel, inputType ) {
		const row = await this.sidebarTable.$( `td=${inputTypeLabel}` ).parentElement();
		const type = await row.$( `a=${inputType}` );
		return type;
	}

	async getOutputType( outputTypeLabel, outputType ) {
		const row = await this.sidebarTable.$( `td=${outputTypeLabel}` ).parentElement();
		const type = await row.$( `a=${outputType}` );
		return type;
	}

	getNameInOtherLanguage( name ) {
		return $( '.ext-wikilambda-function-viewer-names' ).$( `div*=${name}` );
	}

	getAliasLabel( label ) {
		return $( '.ext-wikilambda-function-about__aliases' ).$( `div*=${label}` );
	}

	/**
	 * Get the ZId of the function page
	 *
	 * @async
	 * @return {string}
	 */
	async getFunctionZId() {
		const text = await ElementActions.getText( this.functionZIdSelector );
		return text;
	}

	/**
	 * Click on the "edit" link
	 *
	 * @async
	 * @return {void}
	 */
	async clickOnEditSourceLink() {
		/**
		 * Temporary workaround to open the edit form.
		 * Clicking on "edit" link sometimes do not open the edit form.
		 */
		const ZId = await this.getFunctionZId();
		super.openTitle( ZId, { action: 'edit' } );
	}

	/**
	 * Open the Function page
	 *
	 * @async
	 * @param {string} ZId - ZObject of type Z4
	 */
	async open( ZId ) {
		await super.openTitle( ZId );
	}

	/**
	 * Click on the detials tab
	 *
	 * @async
	 * @return {void}
	 */
	async switchToDetailsTab() {
		await ElementActions.doClick( this.detailsTab );
	}

	/**
	 * Click on the "Create a new test" link
	 *
	 * @async
	 * @return {void}
	 */
	async goToCreateNewTestLink() {
		await ElementActions.doClick( this.createANewTestLink );
	}

	/**
	 * Click on the "Create a new implementation" link
	 *
	 * @async
	 * @return {void}
	 */
	async goToCreateImplementationLink() {
		await ElementActions.doClick( this.createAImplementation );
	}
}

module.exports = new FunctionPage();
