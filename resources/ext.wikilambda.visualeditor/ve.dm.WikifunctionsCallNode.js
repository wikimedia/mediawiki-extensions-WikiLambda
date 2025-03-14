/*!
 * WikiLambda extension's VisualEditor DataModel class for embedded Wikifunction calls.
 *
 * @copyright Abstract Wikipedia Team and others
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * DataModel layer for the Wikifunctions call node.
 *
 * @class
 * @extends ve.dm.MWTransclusionInlineNode
 *
 * @constructor
 * @param {Object} [element]
 */
ve.dm.WikifunctionsCallNode = function VeDmWikifunctionsCallNode() {
	// Parent constructor
	ve.dm.WikifunctionsCallNode.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.dm.WikifunctionsCallNode, ve.dm.MWTransclusionInlineNode );

/* Static members */

ve.dm.WikifunctionsCallNode.static.name = 'WikifunctionsCall';

ve.dm.WikifunctionsCallNode.static.inlineType = 'WikifunctionsCall';

ve.dm.WikifunctionsCallNode.static.blockType = 'WikifunctionsCall';

ve.dm.WikifunctionsCallNode.static.isContent = true;

ve.dm.WikifunctionsCallNode.static.matchTagNames = null;

// ve.dm.WikifunctionsCallNode.static.matchRdfaTypes = [ 'mw:ParserFunction' ];
ve.dm.WikifunctionsCallNode.static.matchRdfaTypes = [ 'mw:Transclusion' ];

ve.dm.WikifunctionsCallNode.static.enableAboutGrouping = true;

// We use a matchFunction() to only match if it's our kind of function call
// See ve.dm.ModelRegistry.prototype.matchElement() for the upstream logic.
ve.dm.WikifunctionsCallNode.static.matchFunction = function ( domElement ) {
	const mwDataJSON = domElement.getAttribute( 'data-mw' );
	const mwData = mwDataJSON ? JSON.parse( mwDataJSON ) : {};
	const mwPart = ( mwData.parts || [] )[ 0 ];
	if ( !mwPart ) {
		return false;
	}
	return ve.getProp( mwPart, 'template', 'target', 'function' ) === 'function';
};

/* Registration */

ve.dm.modelRegistry.register( ve.dm.WikifunctionsCallNode );
