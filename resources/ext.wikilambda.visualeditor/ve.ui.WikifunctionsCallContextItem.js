/*!
 * WikiLambda extension's VisualEditor UserInterface class for the context item for Wikifunctions calls.
 *
 * @copyright Abstract Wikipedia Team and others
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Context item for a WikifunctionsCall node.
 *
 * @class
 * @extends ve.ui.LinearContextItem
 *
 * @param {ve.ui.LinearContext} context Context the item is in
 * @param {ve.dm.Model} model Model the item is related to
 * @param {Object} config Configuration options
 */
ve.ui.WikifunctionsCallContextItem = function VeUiWikifunctionsCallContextItem() {
	// Parent constructor
	ve.ui.WikifunctionsCallContextItem.super.apply( this, arguments );

	this.$element.addClass( 've-ui-WikifunctionsCallContextItem' );
};

/* Inheritance */

OO.inheritClass( ve.ui.WikifunctionsCallContextItem, ve.ui.LinearContextItem );

/* Static Properties */

ve.ui.WikifunctionsCallContextItem.static.name = 'WikifunctionsCall';

ve.ui.WikifunctionsCallContextItem.static.icon = 'function';

ve.ui.WikifunctionsCallContextItem.static.label = OO.ui.deferMsg( 'wikilambda-visualeditor-wikifunctionscall-title' );

ve.ui.WikifunctionsCallContextItem.static.modelClasses = [ ve.dm.MWWikifunctionsCallNode ];

ve.ui.WikifunctionsCallContextItem.static.embeddable = false;

ve.ui.WikifunctionsCallContextItem.static.commandName = 'WikifunctionsCall';

ve.ui.WikifunctionsCallContextItem.static.suppresses = [ 'transclusion' ];

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.WikifunctionsCallContextItem.prototype.getDescription = function () {
	return ve.ce.nodeFactory.getDescription( this.model );
};

/* Registration */

ve.ui.contextItemFactory.register( ve.ui.WikifunctionsCallContextItem );
