/*!
 * Special:CreateZObject page object for the WikiLambda browser test suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const Page = require( 'wdio-mediawiki/Page' );
class CreateZObjectPage extends Page {
	get title() { return $( '#firstHeading' ); }
	open() {
		return super.openTitle( 'Special:CreateZObject' );
	}
}
module.exports = new CreateZObjectPage();
