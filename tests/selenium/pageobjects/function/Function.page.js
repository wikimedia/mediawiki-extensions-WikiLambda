/*!
 * Function page object for the WikiLambda browser test suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const Page = require( 'wdio-mediawiki/Page' );
const ObjectSelector = require( '../../componentobjects/ObjectSelector' );
const ElementActions = require( '../../utils/ElementActions' );

class FunctionPage extends Page {
	get functionTitle() { return $( '.ext-wikilambda-viewpage-header-title--function-name' ); }
	get firstInputTypeSelection() { return $( 'input[placeholder="Select a Type"]' ); }
	get firstInputZString() { return $( 'input.ext-wikilambda-zstring' ); }
	get callButton() { return $( 'button=Call Function' ); }
	get responseEnvelopZObject() { return $( '.ext-wikilambda-zresponseenvelope .ext-wikilambda-zobject' ); }
	get detailsTab() { return $( '//a[@role="tab" and text()="Details"]' ); }
	get showMoreLanguageButton() { return $( 'button=Show more languages' ); }
	get hideListButton() { return $( 'button=Hide list' ); }
	get editSourceLink() { return $( '//a[contains(@title, "Edit")]/span[contains(text(),"Edit")]' ); }
	get showNameInOtherLanguages() { return $( 'button*=Show name in other languages' ); }
	get showMoreAliases() { return $( 'button*=Show more languages' ); }
	get sidebarTable() { return $( '.ext-wikilambda-function-viewer-details-sidebar' ); }
	get createANewTestLink() { return $( 'a=Create a new test' ); }
	get createAImplementation() { return $( 'a=Create a new implementation' ); }

	/**
	 * @async
	 *
	 * Call the function with only one parameter which is of type string.
	 *
	 * @param {string} param The parameters to call the function with
	 */
	async callFunctionWithString( param ) {
		const objectSelector = await ObjectSelector.fromInputField( this.firstInputTypeSelection );
		await objectSelector.select( 'String' );
		await this.firstInputZString.setValue( param );
		await this.callButton.click();
		await this.responseEnvelopZObject.waitForExist();
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
	 * Click on the "edit" link
	 *
	 * @async
	 * @return {void}
	 */
	async editFunction() {
		await ElementActions.scrollIntoView( this.editSourceLink );
		await ElementActions.doClick( this.editSourceLink );
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
	async goToCreateImplementation() {
		await ElementActions.doClick( this.createAImplementation );
	}
}

module.exports = new FunctionPage();
