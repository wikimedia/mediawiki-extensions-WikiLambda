/*!
 * WikiLambda extension's VisualEditor UserInterface class for the tool to inject/edit Wikifunctions calls.
 *
 * @copyright Abstract Wikipedia Team and others
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * MediaWiki UserInterface dialog tool.
 *
 * @class
 * @extends ve.ui.FragmentDialogTool
 * @constructor
 * @param {OO.ui.ToolGroup} toolGroup
 * @param {Object} [config] Configuration options
 */

ve.ui.WikifunctionsCallDialogTool = function VeUiWikifunctionsCallDialogTool( toolGroup, config ) {
	ve.ui.WikifunctionsCallDialogTool.super.call( this, toolGroup, config );
};

OO.inheritClass( ve.ui.WikifunctionsCallDialogTool, ve.ui.FragmentWindowTool );

ve.ui.WikifunctionsCallDialogTool.static.name = 'WikifunctionsCall';

ve.ui.WikifunctionsCallDialogTool.static.group = 'object';

ve.ui.WikifunctionsCallDialogTool.static.icon = 'function';

ve.ui.WikifunctionsCallDialogTool.static.title = OO.ui.deferMsg(
	'wikilambda-visualeditor-wikifunctionscall-title'
);

ve.ui.WikifunctionsCallDialogTool.static.modelClasses = [ ve.dm.WikifunctionsCallNode ];

ve.ui.WikifunctionsCallDialogTool.static.commandName = 'WikifunctionsCall';

ve.ui.toolFactory.register( ve.ui.WikifunctionsCallDialogTool );

ve.ui.commandRegistry.register(
	new ve.ui.Command(
		'WikifunctionsCall', 'window', 'open',
		{ args: [ 'WikifunctionsCall' ], supportedSelections: [ 'linear' ] }
	)
);

ve.ui.sequenceRegistry.register(
	new ve.ui.Sequence( 'wikitextFunction', 'WikifunctionsCall', '{#function:', 11 )
);

ve.ui.commandHelpRegistry.register( 'insert', 'WikifunctionsCall', {
	sequences: [ 'wikitextFunction' ],
	label: OO.ui.deferMsg( 'wikilambda-visualeditor-wikifunctionscall-title' )
} );
