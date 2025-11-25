/*!
 * Special:RunFunction page object for the WikiLambda browser test suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

import Page from 'wdio-mediawiki/Page.js';
class RunFunctionPage extends Page {
	get title() {
		return $( '#firstHeading' );
	}

	async open() {
		return super.openTitle( 'Special:RunFunction' );
	}
}
export default new RunFunctionPage();
