'use strict';
const Page = require( 'wdio-mediawiki/Page' );

class FunctionPage extends Page {
	get firstInputTypeSelection() { return $( 'input[placeholder="Select a Type"]' ); }
	get firstInputZString() { return $( 'input.ext-wikilambda-zstring' ); }
	get callButton() { return $( 'button=Call Function' ); }
	get responseEnvelopZObject() { return $( '.ext-wikilambda-zresponseenvelope .ext-wikilambda-zobject' ); }
	get menu() { return $( '.cdx-menu' ); }

	getMenuOptionByTextContent( textContent ) {
		return this.menu.$( `bdi=${textContent}` );
	}

	async selectTypeWithNameInMenu( typeName ) {
		await this.menu.waitForDisplayed();
		return this.getMenuOptionByTextContent( typeName ).click();
	}

	/**
	 * @async
	 *
	 * Call the function with only one parameter which is of type string.
	 *
	 * @param {string} param The parameters to call the function with
	 */
	async callFunctionWithString( param ) {
		const { firstInputTypeSelection } = this;
		await firstInputTypeSelection.waitForExist();
		await firstInputTypeSelection.setValue( 'String' );
		await this.selectTypeWithNameInMenu( 'String' );
		const { firstInputZString } = this;
		await firstInputZString.waitForExist();
		await firstInputZString.setValue( param );
		await this.callButton.click();
		await this.responseEnvelopZObject.waitForExist();
	}
}

module.exports = new FunctionPage();
