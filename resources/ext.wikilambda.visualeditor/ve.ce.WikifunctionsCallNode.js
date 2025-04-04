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

/**
 * Overrides ve.ce.GeneratedContentNode.prototype.doneGenerating to capture the
 * error state after the final DOM has been generated. The error state is stored
 * in the model attributes as isError.
 *
 * @inheritdoc
 */
ve.ce.WikifunctionsCallNode.prototype.doneGenerating = function ( generatedContents, config, staged ) {

	// Call parent first
	ve.ce.WikifunctionsCallNode.super.prototype.doneGenerating.call( this, generatedContents, config, staged );

	// Infer error state from generatedContents
	const hasError = generatedContents[ 0 ].classList.contains( 'cdx-message--error' );
	const hadError = this.model.getAttribute( 'isError' );

	// If isError attribute changed, update the model
	if ( hadError !== hasError ) {
		const surfaceModel = this.focusableSurface.getModel();
		if ( surfaceModel ) {
			surfaceModel.change(
				ve.dm.TransactionBuilder.static.newFromAttributeChanges(
					surfaceModel.getDocument(),
					this.model.getOuterRange().start,
					{ isError: hasError }
				)
			);
		}
	}
};

/* Registration */

ve.ce.nodeFactory.register( ve.ce.WikifunctionsCallNode );
