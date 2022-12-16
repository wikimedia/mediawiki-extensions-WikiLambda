/*!
 * Function page object for the WikiLambda browser test suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const Page = require( 'wdio-mediawiki/Page' );
const ObjectSelector = require( './utils/ObjectSelector' );

class FunctionPage extends Page {
	get functionTitle() { return $( '.ext-wikilambda-viewpage-header-title--function-name' ); }
	get firstInputTypeSelection() { return $( 'input[placeholder="Select a Type"]' ); }
	get firstInputZString() { return $( 'input.ext-wikilambda-zstring' ); }
	get callButton() { return $( 'button=Call Function' ); }
	get responseEnvelopZObject() { return $( '.ext-wikilambda-zresponseenvelope .ext-wikilambda-zobject' ); }
	get detailsTab() { return $( 'ul[role=tablist]' ).$( '=Details' ); }
	get showMoreLanguageButton() { return $( 'button=Show more languages' ); }
	get hideListButton() { return $( 'button=Hide list' ); }
	get editMenuItem() { return $( 'a[title*="Edit this page"]' ); }
	get showNameInOtherLanguages() { return $( 'button*=Show name in other languages' ); }
	get showMoreAliases() { return $( 'button*=Show more languages' ); }

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

	getNameInOtherLanguage( name ) {
		return $( '.ext-wikilambda-function-viewer-names' ).$( `div*=${name}` );
	}

	getAliasLabel( label ) {
		return $( '.ext-wikilambda-function-about__aliases' ).$( `div*=${label}` );
	}

	async editFunction() {
		await this.editMenuItem.click();
	}
}

module.exports = new FunctionPage();
