/*!
 * Special:CreateObject page object for the WikiLambda browser test suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

import Page from 'wdio-mediawiki/Page.js';
class CreateObjectPage extends Page {
	get title() {
		return $( '#firstHeading' );
	}

	async open() {
		return super.openTitle( 'Special:CreateObject' );
	}

}
export default new CreateObjectPage();
