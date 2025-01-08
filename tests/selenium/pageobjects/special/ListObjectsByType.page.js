/*!
 * Special:ListObjectsByType page object for the WikiLambda browser test suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const Page = require( 'wdio-mediawiki/Page' );

class ListFunctions extends Page {
	get functionIdByName() {
		return {
			echo: 'Z801'
		};
	}

	getFunctionLink( functionName ) {
		const functionZId = this.functionIdByName[ functionName ];
		if ( !functionZId ) {
			throw new Error( 'Function not handled by ListFunctions' );
		}
		return $( `a[href$="/${ functionZId }"` );
	}

	async openFunction( functionName ) {
		const functionLink = this.getFunctionLink( functionName );
		await functionLink.waitForExist();
		return functionLink.click();
	}
}

class ListObjectsByType extends Page {
	get title() {
		return $( '#firstHeading' );
	}

	get types() {
		return {
			function: 'Z8'
		};
	}

	async open() {
		return super.openTitle( 'Special:ListObjectsByType' );
	}

	getListType( ztype ) {
		return $( `a[href$="/${ ztype }` );
	}

	/**
	 * Open the functions list
	 *
	 * @return {ListFunctions} the function list Page Object Model
	 */
	async openFunctionsList() {
		const listFunctionLink = this.getListType( this.types.function );
		await listFunctionLink.click();
		return new ListFunctions();
	}
}

module.exports = new ListObjectsByType();
