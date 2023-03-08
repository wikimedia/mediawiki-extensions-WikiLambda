/*!
 * Special:EvaluateFunctionCall page object for the WikiLambda browser test suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const Page = require( 'wdio-mediawiki/Page' );
class EvaluateFunctionCallPage extends Page {
	get title() { return $( '#firstHeading' ); }
	open() {
		return super.openTitle( 'Special:EvaluateFunctionCall' );
	}
}
module.exports = new EvaluateFunctionCallPage();
