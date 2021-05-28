'use strict';
const Page = require( 'wdio-mediawiki/Page' );
class EvaluateFunctionCallPage extends Page {
	get title() { return $( '#firstHeading' ); }
	open() {
		super.openTitle( 'Special:EvaluateFunctionCall' );
	}
}
module.exports = new EvaluateFunctionCallPage();
