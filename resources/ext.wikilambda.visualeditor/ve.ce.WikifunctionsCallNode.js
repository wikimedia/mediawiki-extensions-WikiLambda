/*!
 * WikiLambda extension's VisualEditor ContentEditable class for Wikifunctions calls.
 *
 * @copyright Abstract Wikipedia Team and others
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * ContentEditable layer for the Wikifunctions call node.
 *
 * @class
 * @extends ve.ce.LeafNode
 *
 * @constructor
 * @param {ve.dm.WikifunctionsCallNode} model Model to observe
 * @param {Object} [config] Configuration options
 */
ve.ce.WikifunctionsCallNode = function VeCeWikifunctionsCallNode() {
	// Parent constructor
	ve.ce.WikifunctionsCallNode.super.apply( this, arguments );
};

/* Inheritance */
OO.inheritClass( ve.ce.WikifunctionsCallNode, ve.ce.MWTransclusionInlineNode );

/* Static properties */
ve.ce.WikifunctionsCallNode.static.name = 'WikifunctionsCall';

ve.ce.WikifunctionsCallNode.static.primaryCommandName = 'wikifunctionsCall';

ve.ce.WikifunctionsCallNode.static.iconWhenInvisible = 'functionObject';

ve.ce.WikifunctionsCallNode.static.tagName = 'span';

/* Methods */

/**
 * @inheritdoc
 */
ve.ce.WikifunctionsCallNode.prototype.onSetup = function () {
	// Parent method
	ve.ce.WikifunctionsCallNode.super.prototype.onSetup.call( this );

	// DOM changes
	this.$element.addClass( 've-ce-wikifunctionsCallNode' );
};

/* Registration */

ve.ce.nodeFactory.register( ve.ce.WikifunctionsCallNode );
