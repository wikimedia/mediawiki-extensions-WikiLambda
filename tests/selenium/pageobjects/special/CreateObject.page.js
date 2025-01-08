/*!
 * Special:CreateObject page object for the WikiLambda browser test suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const Page = require( 'wdio-mediawiki/Page' );
class CreateObjectPage extends Page {
	get title() {
		return $( '#firstHeading' );
	}

	async open() {
		return super.openTitle( 'Special:CreateObject' );
	}

}
module.exports = new CreateObjectPage();
